import { supabase } from "@/lib/supabase";
import type { Huurder, HuurderInvoer } from "@/types/huurder";

function schoon(waarde: string | null | undefined): string | null {
  const resultaat = waarde?.trim() ?? "";
  return resultaat || null;
}

function valideer(invoer: HuurderInvoer): HuurderInvoer {
  if (
    !Number.isInteger(invoer.verhuurperiode_id) ||
    invoer.verhuurperiode_id <= 0
  ) {
    throw new Error("Ongeldige verhuurperiode.");
  }

  const voornaam = invoer.voornaam.trim();
  const achternaam = invoer.achternaam.trim();
  const email = schoon(invoer.email);

  if (!voornaam) {
    throw new Error("Voornaam is verplicht.");
  }

  if (!achternaam) {
    throw new Error("Achternaam is verplicht.");
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Vul een geldig e-mailadres in.");
  }

  if (invoer.geboortedatum) {
    const vandaag = new Date().toISOString().slice(0, 10);

    if (invoer.geboortedatum > vandaag) {
      throw new Error("Geboortedatum mag niet in de toekomst liggen.");
    }
  }

  return {
    verhuurperiode_id: invoer.verhuurperiode_id,
    voornaam,
    tussenvoegsel: schoon(invoer.tussenvoegsel),
    achternaam,
    geboortedatum: schoon(invoer.geboortedatum),
    nationaliteit: schoon(invoer.nationaliteit),
    telefoon: schoon(invoer.telefoon),
    email,
    document_type: invoer.document_type,
    documentnummer: schoon(invoer.documentnummer),
    opmerkingen: schoon(invoer.opmerkingen),
  };
}

export async function getHuurdersVoorVerhuurperiode(
  verhuurperiodeId: number
): Promise<Huurder[]> {
  const { data, error } = await supabase
    .from("huurders")
    .select("*")
    .eq("verhuurperiode_id", verhuurperiodeId)
    .order("achternaam", { ascending: true })
    .order("voornaam", { ascending: true });

  if (error) {
    throw new Error(`Huurders ophalen mislukt: ${error.message}`);
  }

  return (data ?? []) as Huurder[];
}

export async function getHuurderById(
  huurderId: number
): Promise<Huurder | null> {
  const { data, error } = await supabase
    .from("huurders")
    .select("*")
    .eq("id", huurderId)
    .maybeSingle();

  if (error) {
    throw new Error(`Huurder ophalen mislukt: ${error.message}`);
  }

  return data as Huurder | null;
}

export async function createHuurder(
  invoer: HuurderInvoer
): Promise<Huurder> {
  const geldig = valideer(invoer);

  const { data: verhuurperiode, error: controleFout } = await supabase
    .from("verhuurperiodes")
    .select("id, status")
    .eq("id", geldig.verhuurperiode_id)
    .maybeSingle();

  if (controleFout) {
    throw new Error(
      `Verhuurperiode controleren mislukt: ${controleFout.message}`
    );
  }

  if (!verhuurperiode || verhuurperiode.status !== "actief") {
    throw new Error(
      "Een huurder kan alleen aan een actieve verhuurperiode worden gekoppeld."
    );
  }

  const { data, error } = await supabase
    .from("huurders")
    .insert(geldig)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Huurder opslaan mislukt: ${error.message}`);
  }

  return data as Huurder;
}

export async function updateHuurder(
  huurderId: number,
  invoer: HuurderInvoer
): Promise<Huurder> {
  if (!Number.isInteger(huurderId) || huurderId <= 0) {
    throw new Error("Ongeldige huurder.");
  }

  const geldig = valideer(invoer);

  const { data, error } = await supabase
    .from("huurders")
    .update(geldig)
    .eq("id", huurderId)
    .eq("verhuurperiode_id", geldig.verhuurperiode_id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Huurder wijzigen mislukt: ${error.message}`);
  }

  if (!data) {
    throw new Error("Huurder niet gevonden.");
  }

  return data as Huurder;
}

export async function deleteHuurder(
  huurderId: number,
  verhuurperiodeId: number
): Promise<void> {
  if (!Number.isInteger(huurderId) || huurderId <= 0) {
    throw new Error("Ongeldige huurder.");
  }

  const { error } = await supabase
    .from("huurders")
    .delete()
    .eq("id", huurderId)
    .eq("verhuurperiode_id", verhuurperiodeId);

  if (error) {
    throw new Error(`Huurder verwijderen mislukt: ${error.message}`);
  }
}
