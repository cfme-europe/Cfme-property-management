import { supabase } from "@/lib/supabase";
import type {
  Inspectie,
  InspectieInvoer,
} from "@/types/inspectie";

function schoon(
  waarde: string | null | undefined
): string | null {
  const resultaat = waarde?.trim() ?? "";
  return resultaat || null;
}

function valideer(
  invoer: InspectieInvoer
): InspectieInvoer {
  if (
    !Number.isInteger(invoer.woning_id) ||
    invoer.woning_id <= 0
  ) {
    throw new Error("Ongeldige woning.");
  }

  if (
    invoer.verhuurperiode_id !== null &&
    (
      !Number.isInteger(invoer.verhuurperiode_id) ||
      invoer.verhuurperiode_id <= 0
    )
  ) {
    throw new Error("Ongeldige verhuurperiode.");
  }

  if (!invoer.inspectiedatum) {
    throw new Error("Inspectiedatum is verplicht.");
  }

  if (
    !Number.isInteger(invoer.orde_netheid_score) ||
    invoer.orde_netheid_score < 1 ||
    invoer.orde_netheid_score > 5
  ) {
    throw new Error(
      "De score voor orde en netheid moet tussen 1 en 5 liggen."
    );
  }

  const schadeOmschrijving = schoon(
    invoer.schade_omschrijving
  );

  if (
    invoer.schade_aanwezig &&
    !schadeOmschrijving
  ) {
    throw new Error(
      "Beschrijf de schade wanneer schade aanwezig is."
    );
  }

  return {
    woning_id: invoer.woning_id,
    verhuurperiode_id:
      invoer.verhuurperiode_id,
    type: invoer.type,
    inspectiedatum: invoer.inspectiedatum,
    status: invoer.status,
    algemene_toestand:
      invoer.algemene_toestand,
    orde_netheid_score:
      invoer.orde_netheid_score,
    schade_aanwezig:
      invoer.schade_aanwezig,
    schade_omschrijving:
      invoer.schade_aanwezig
        ? schadeOmschrijving
        : null,
    uitgevoerd_door: schoon(
      invoer.uitgevoerd_door
    ),
    opmerkingen: schoon(
      invoer.opmerkingen
    ),
  };
}

export async function getInspectiesVoorWoning(
  woningId: number
): Promise<Inspectie[]> {
  const { data, error } = await supabase
    .from("inspecties")
    .select("*")
    .eq("woning_id", woningId)
    .order("inspectiedatum", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Inspecties ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Inspectie[];
}

export async function getOpenInspectiesVoorWoning(
  woningId: number
): Promise<Inspectie[]> {
  const { data, error } = await supabase
    .from("inspecties")
    .select("*")
    .eq("woning_id", woningId)
    .eq("status", "open")
    .order("inspectiedatum", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Open inspecties ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Inspectie[];
}

export async function getInspectieById(
  inspectieId: number
): Promise<Inspectie | null> {
  if (
    !Number.isInteger(inspectieId) ||
    inspectieId <= 0
  ) {
    throw new Error("Ongeldige inspectie.");
  }

  const { data, error } = await supabase
    .from("inspecties")
    .select("*")
    .eq("id", inspectieId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Inspectie ophalen mislukt: ${error.message}`
    );
  }

  return data as Inspectie | null;
}

export async function createInspectie(
  invoer: InspectieInvoer
): Promise<Inspectie> {
  const geldig = valideer(invoer);

  const { data, error } = await supabase
    .from("inspecties")
    .insert(geldig)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Inspectie opslaan mislukt: ${error.message}`
    );
  }

  return data as Inspectie;
}

export async function updateInspectie(
  inspectieId: number,
  invoer: InspectieInvoer
): Promise<Inspectie> {
  if (
    !Number.isInteger(inspectieId) ||
    inspectieId <= 0
  ) {
    throw new Error("Ongeldige inspectie.");
  }

  const geldig = valideer(invoer);

  const { data, error } = await supabase
    .from("inspecties")
    .update(geldig)
    .eq("id", inspectieId)
    .eq("woning_id", geldig.woning_id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Inspectie wijzigen mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Inspectie niet gevonden.");
  }

  return data as Inspectie;
}

export async function deleteInspectie(
  inspectieId: number,
  woningId: number
): Promise<void> {
  if (
    !Number.isInteger(inspectieId) ||
    inspectieId <= 0
  ) {
    throw new Error("Ongeldige inspectie.");
  }

  const { error } = await supabase
    .from("inspecties")
    .delete()
    .eq("id", inspectieId)
    .eq("woning_id", woningId);

  if (error) {
    throw new Error(
      `Inspectie verwijderen mislukt: ${error.message}`
    );
  }
}
