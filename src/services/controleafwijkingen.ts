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

function geldigeKosten(
  waarde: number | null,
  naam: string,
): void {
  if (
    waarde !== null &&
    (!Number.isFinite(waarde) || waarde < 0)
  ) {
    throw new Error(`${naam} zijn ongeldig.`);
  }
}

export async function updateControleAfwijkingBeheer(
  afwijkingId: number,
  woningId: number,
  invoer: ControleAfwijkingBeheerInvoer,
): Promise<ControleAfwijkingBeheer> {
  if (!Number.isInteger(afwijkingId) || afwijkingId <= 0) {
    throw new Error("Ongeldige controleafwijking.");
  }

  if (!Number.isInteger(woningId) || woningId <= 0) {
    throw new Error("Ongeldige woning.");
  }

  if (invoer.hercontrole_nodig && !invoer.hercontrole_voor) {
    throw new Error(
      "Datum van de hercontrole is verplicht.",
    );
  }

  geldigeKosten(
    invoer.geschatte_kosten,
    "Geschatte kosten",
  );
  geldigeKosten(
    invoer.werkelijke_kosten,
    "Werkelijke kosten",
  );

  const oplossing = schoon(invoer.oplossing);

  if (invoer.status === "opgelost" && !oplossing) {
    throw new Error(
      "Beschrijving van het herstel is verplicht.",
    );
  }

  if (
    invoer.herstelbewijs_verplicht &&
    invoer.status === "opgelost" &&
    invoer.herstelbewijs_status !== "goedgekeurd"
  ) {
    throw new Error(
      "Verplicht herstelbewijs moet eerst zijn goedgekeurd.",
    );
  }

  const { data, error } = await supabase.rpc(
    "beheer_controle_afwijking",
    {
      p_afwijking_id: afwijkingId,
      p_woning_id: woningId,
      p_status: invoer.status,
      p_verantwoordelijke: schoon(
        invoer.verantwoordelijke,
      ),
      p_deadline: invoer.deadline || null,
      p_hercontrole_nodig:
        invoer.hercontrole_nodig,
      p_hercontrole_voor:
        invoer.hercontrole_nodig
          ? invoer.hercontrole_voor
          : null,
      p_herstelbewijs_verplicht:
        invoer.herstelbewijs_verplicht,
      p_herstelbewijs_omschrijving: schoon(
        invoer.herstelbewijs_omschrijving,
      ),
      p_herstelbewijs_status:
        invoer.herstelbewijs_verplicht
          ? invoer.herstelbewijs_status
          : "niet_vereist",
      p_oplossing: oplossing,
      p_geschatte_kosten:
        invoer.geschatte_kosten,
      p_werkelijke_kosten:
        invoer.werkelijke_kosten,
      p_factuur_naar: invoer.factuur_naar,
      p_financieel_gevolg: schoon(
        invoer.financieel_gevolg,
      ),
      p_operationeel_gevolg: schoon(
        invoer.operationeel_gevolg,
      ),
    },
  );

  if (error) {
    throw new Error(
      `Onderhoudsopvolging opslaan mislukt: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error("Controleafwijking niet gevonden.");
  }

  return data as ControleAfwijkingBeheer;
}
