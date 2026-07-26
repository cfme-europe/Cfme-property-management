import { createClient } from "@/lib/supabase/client";
import type {
  ControleAfwijkingBeheer,
  ControleAfwijkingBeheerInvoer,
} from "@/types/controleafwijking";

const supabase = createClient();

function schoon(waarde: string | null): string | null {
  const resultaat = waarde?.trim() ?? "";
  return resultaat || null;
}

export async function updateControleAfwijkingBeheer(
  afwijkingId: number,
  woningId: number,
  invoer: ControleAfwijkingBeheerInvoer,
): Promise<ControleAfwijkingBeheer> {
  if (!Number.isInteger(afwijkingId) || afwijkingId <= 0) {
    throw new Error("Ongeldige controleafwijking.");
  }

  if (invoer.hercontrole_nodig && !invoer.hercontrole_voor) {
    throw new Error(
      "Datum van de hercontrole is verplicht.",
    );
  }

  const oplossing = schoon(invoer.oplossing);

  if (invoer.status === "opgelost" && !oplossing) {
    throw new Error(
      "Beschrijving van de oplossing is verplicht.",
    );
  }

  const wijzigingen = {
    status: invoer.status,
    verantwoordelijke: schoon(invoer.verantwoordelijke),
    deadline: invoer.deadline || null,
    hercontrole_nodig: invoer.hercontrole_nodig,
    hercontrole_voor:
      invoer.hercontrole_nodig
        ? invoer.hercontrole_voor
        : null,
    herstelbewijs_verplicht:
      invoer.herstelbewijs_verplicht,
    herstelbewijs_omschrijving: schoon(
      invoer.herstelbewijs_omschrijving,
    ),
    oplossing:
      invoer.status === "opgelost" ? oplossing : null,
    opgelost_at:
      invoer.status === "opgelost"
        ? new Date().toISOString()
        : null,
    geschatte_kosten: invoer.geschatte_kosten,
    werkelijke_kosten: invoer.werkelijke_kosten,
    factuur_naar: invoer.factuur_naar,
    financieel_gevolg: schoon(invoer.financieel_gevolg),
    operationeel_gevolg: schoon(
      invoer.operationeel_gevolg,
    ),
  };

  const { data, error } = await supabase
    .from("controle_afwijkingen")
    .update(wijzigingen)
    .eq("id", afwijkingId)
    .eq("woning_id", woningId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Controleafwijking wijzigen mislukt: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error("Controleafwijking niet gevonden.");
  }

  return data as ControleAfwijkingBeheer;
}
