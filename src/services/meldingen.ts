import { supabase } from "@/lib/supabase";
import { registreerWorkflowGebeurtenis } from "@/services/workflow";
import type {
  Melding,
  MeldingInvoer,
} from "@/types/melding";

function schoon(
  waarde: string | null | undefined
): string | null {
  const resultaat = waarde?.trim() ?? "";
  return resultaat || null;
}

function valideer(invoer: MeldingInvoer): MeldingInvoer {
  if (
    !Number.isInteger(invoer.woning_id) ||
    invoer.woning_id <= 0
  ) {
    throw new Error("Ongeldige woning.");
  }

  if (
    invoer.inspectie_id !== null &&
    (
      !Number.isInteger(invoer.inspectie_id) ||
      invoer.inspectie_id <= 0
    )
  ) {
    throw new Error("Ongeldige inspectie.");
  }

  const titel = invoer.titel.trim();
  const omschrijving = invoer.omschrijving.trim();

  if (!titel) {
    throw new Error("Titel is verplicht.");
  }

  if (!omschrijving) {
    throw new Error("Omschrijving is verplicht.");
  }

  if (!invoer.melddatum) {
    throw new Error("Melddatum is verplicht.");
  }

  const oplosdatum = schoon(invoer.oplosdatum);
  const oplossing = schoon(invoer.oplossing);

  if (invoer.status === "opgelost" && !oplosdatum) {
    throw new Error(
      "Oplosdatum is verplicht wanneer de melding is opgelost."
    );
  }

  if (
    oplosdatum &&
    oplosdatum < invoer.melddatum
  ) {
    throw new Error(
      "Oplosdatum mag niet vóór de melddatum liggen."
    );
  }

  return {
    woning_id: invoer.woning_id,
    inspectie_id: invoer.inspectie_id,
    titel,
    omschrijving,
    categorie: invoer.categorie,
    prioriteit: invoer.prioriteit,
    status: invoer.status,
    melddatum: invoer.melddatum,
    oplosdatum:
      invoer.status === "opgelost"
        ? oplosdatum
        : null,
    verantwoordelijke: schoon(
      invoer.verantwoordelijke
    ),
    oplossing:
      invoer.status === "opgelost"
        ? oplossing
        : null,
    factuur_naar: invoer.factuur_naar,
    extern_referentienummer: schoon(
      invoer.extern_referentienummer
    ),
    opmerkingen: schoon(invoer.opmerkingen),
  };
}

export async function getMeldingen(): Promise<Melding[]> {
  const { data, error } = await supabase
    .from("meldingen")
    .select("*")
    .order("melddatum", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Meldingen ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Melding[];
}

export async function getMeldingenVoorWoning(
  woningId: number
): Promise<Melding[]> {
  if (
    !Number.isInteger(woningId) ||
    woningId <= 0
  ) {
    throw new Error("Ongeldige woning.");
  }

  const { data, error } = await supabase
    .from("meldingen")
    .select("*")
    .eq("woning_id", woningId)
    .order("status", { ascending: true })
    .order("prioriteit", { ascending: false })
    .order("melddatum", { ascending: false });

  if (error) {
    throw new Error(
      `Meldingen voor woning ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Melding[];
}

export async function getOpenMeldingenVoorWoning(
  woningId: number
): Promise<Melding[]> {
  const { data, error } = await supabase
    .from("meldingen")
    .select("*")
    .eq("woning_id", woningId)
    .neq("status", "opgelost")
    .order("prioriteit", { ascending: false })
    .order("melddatum", { ascending: false });

  if (error) {
    throw new Error(
      `Open meldingen ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Melding[];
}

export async function getMeldingenVoorInspectie(
  inspectieId: number
): Promise<Melding[]> {
  const { data, error } = await supabase
    .from("meldingen")
    .select("*")
    .eq("inspectie_id", inspectieId)
    .order("melddatum", { ascending: false });

  if (error) {
    throw new Error(
      `Inspectiemeldingen ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Melding[];
}

export async function getMeldingById(
  meldingId: number
): Promise<Melding | null> {
  if (
    !Number.isInteger(meldingId) ||
    meldingId <= 0
  ) {
    throw new Error("Ongeldige melding.");
  }

  const { data, error } = await supabase
    .from("meldingen")
    .select("*")
    .eq("id", meldingId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Melding ophalen mislukt: ${error.message}`
    );
  }

  return data as Melding | null;
}

export async function createMelding(
  invoer: MeldingInvoer
): Promise<Melding> {
  const geldig = valideer(invoer);

  const { data, error } = await supabase
    .from("meldingen")
    .insert(geldig)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Melding opslaan mislukt: ${error.message}`
    );
  }

  const melding = data as Melding;

  await registreerWorkflowGebeurtenis({
    woning_id: melding.woning_id,
    controlesessie_id: null,
    gebeurtenis_type: "melding.aangemaakt",
    bron_type: "melding",
    bron_id: melding.id,
    prioriteit: melding.prioriteit,
    deduplicatie_sleutel: `melding:${melding.id}:aangemaakt`,
    payload: {
      titel: melding.titel,
      omschrijving: melding.omschrijving,
      categorie: melding.categorie,
      prioriteit: melding.prioriteit,
      status: melding.status,
      inspectie_id: melding.inspectie_id,
      melddatum: melding.melddatum,
      factuur_naar: melding.factuur_naar,
    },
  });

  return melding;
}

export async function updateMelding(
  meldingId: number,
  invoer: MeldingInvoer
): Promise<Melding> {
  if (
    !Number.isInteger(meldingId) ||
    meldingId <= 0
  ) {
    throw new Error("Ongeldige melding.");
  }

  const geldig = valideer(invoer);

  const { data, error } = await supabase
    .from("meldingen")
    .update(geldig)
    .eq("id", meldingId)
    .eq("woning_id", geldig.woning_id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Melding wijzigen mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Melding niet gevonden.");
  }

  return data as Melding;
}

export async function deleteMelding(
  meldingId: number,
  woningId: number
): Promise<void> {
  if (
    !Number.isInteger(meldingId) ||
    meldingId <= 0
  ) {
    throw new Error("Ongeldige melding.");
  }

  const { error } = await supabase
    .from("meldingen")
    .delete()
    .eq("id", meldingId)
    .eq("woning_id", woningId);

  if (error) {
    throw new Error(
      `Melding verwijderen mislukt: ${error.message}`
    );
  }
}
