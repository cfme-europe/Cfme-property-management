import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
import type {
  Bewoner,
  BewonerInvoer,
} from "@/types/bewoner";

const BEWONER_SELECT = `
  *,
  huurder:huurders(*),
  kamer:kamers(*)
`;

function schoon(
  waarde: string | null | undefined
): string | null {
  const resultaat = waarde?.trim() ?? "";
  return resultaat || null;
}

function valideer(invoer: BewonerInvoer): BewonerInvoer {
  if (
    !Number.isInteger(invoer.verhuurperiode_id) ||
    invoer.verhuurperiode_id <= 0
  ) {
    throw new Error("Ongeldige verhuurperiode.");
  }

  if (
    invoer.huurder_id !== null &&
    (!Number.isInteger(invoer.huurder_id) ||
      invoer.huurder_id <= 0)
  ) {
    throw new Error("Ongeldige huurder.");
  }

  if (
    invoer.kamer_id !== null &&
    (!Number.isInteger(invoer.kamer_id) ||
      invoer.kamer_id <= 0)
  ) {
    throw new Error("Ongeldige kamer.");
  }

  const voornaam = invoer.voornaam.trim();
  const achternaam = invoer.achternaam.trim();

  if (!voornaam) {
    throw new Error("Voornaam is verplicht.");
  }

  if (!achternaam) {
    throw new Error("Achternaam is verplicht.");
  }

  if (!invoer.incheckdatum) {
    throw new Error("Incheckdatum is verplicht.");
  }

  if (
    invoer.status === "uitgecheckt" &&
    !invoer.uitcheckdatum
  ) {
    throw new Error(
      "Uitcheckdatum is verplicht bij status uitgecheckt."
    );
  }

  if (
    invoer.uitcheckdatum &&
    invoer.uitcheckdatum < invoer.incheckdatum
  ) {
    throw new Error(
      "Uitcheckdatum mag niet vóór de incheckdatum liggen."
    );
  }

  return {
    verhuurperiode_id: invoer.verhuurperiode_id,
    huurder_id: invoer.huurder_id,
    kamer_id: invoer.kamer_id,
    voornaam,
    tussenvoegsel: schoon(invoer.tussenvoegsel),
    achternaam,
    incheckdatum: invoer.incheckdatum,
    uitcheckdatum:
      invoer.status === "actief"
        ? null
        : schoon(invoer.uitcheckdatum),
    status: invoer.status,
    opmerkingen: schoon(invoer.opmerkingen),
  };
}

export async function getBewonersVoorVerhuurperiode(
  verhuurperiodeId: number
): Promise<Bewoner[]> {
  const { data, error } = await supabase
    .from("bewoners")
    .select(BEWONER_SELECT)
    .eq("verhuurperiode_id", verhuurperiodeId)
    .order("status", { ascending: true })
    .order("achternaam", { ascending: true })
    .order("voornaam", { ascending: true });

  if (error) {
    throw new Error(
      `Bewoners ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Bewoner[];
}

export async function getBewonersVoorHuurder(
  huurderId: number
): Promise<Bewoner[]> {
  const { data, error } = await supabase
    .from("bewoners")
    .select(BEWONER_SELECT)
    .eq("huurder_id", huurderId)
    .order("incheckdatum", { ascending: false });

  if (error) {
    throw new Error(
      `Bewoners voor huurder ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Bewoner[];
}

export async function getBewonerById(
  bewonerId: number
): Promise<Bewoner | null> {
  const { data, error } = await supabase
    .from("bewoners")
    .select(BEWONER_SELECT)
    .eq("id", bewonerId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Bewoner ophalen mislukt: ${error.message}`
    );
  }

  return data as Bewoner | null;
}

export async function createBewoner(
  invoer: BewonerInvoer
): Promise<Bewoner> {
  const geldig = valideer(invoer);

  const { data, error } = await supabase
    .from("bewoners")
    .insert(geldig)
    .select(BEWONER_SELECT)
    .single();

  if (error) {
    throw new Error(
      `Bewoner opslaan mislukt: ${error.message}`
    );
  }

  return data as Bewoner;
}

export async function updateBewoner(
  bewonerId: number,
  invoer: BewonerInvoer
): Promise<Bewoner> {
  if (
    !Number.isInteger(bewonerId) ||
    bewonerId <= 0
  ) {
    throw new Error("Ongeldige bewoner.");
  }

  const geldig = valideer(invoer);

  const { data, error } = await supabase
    .from("bewoners")
    .update(geldig)
    .eq("id", bewonerId)
    .eq(
      "verhuurperiode_id",
      geldig.verhuurperiode_id
    )
    .select(BEWONER_SELECT)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Bewoner wijzigen mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Bewoner niet gevonden.");
  }

  return data as Bewoner;
}

export async function deleteBewoner(
  bewonerId: number,
  verhuurperiodeId: number
): Promise<void> {
  if (
    !Number.isInteger(bewonerId) ||
    bewonerId <= 0
  ) {
    throw new Error("Ongeldige bewoner.");
  }

  const { error } = await supabase
    .from("bewoners")
    .delete()
    .eq("id", bewonerId)
    .eq("verhuurperiode_id", verhuurperiodeId);

  if (error) {
    throw new Error(
      `Bewoner verwijderen mislukt: ${error.message}`
    );
  }
}

export async function uitcheckBewoner(
  bewonerId: number,
  verhuurperiodeId: number,
  uitcheckdatum: string
): Promise<Bewoner> {
  if (!Number.isInteger(bewonerId) || bewonerId <= 0) {
    throw new Error("Ongeldige bewoner.")
  }

  const bestaand = await getBewonerById(bewonerId)
  if (!bestaand) {
  throw new Error("Bewoner niet gevonden.")
}

  if (bestaand.uitcheckdatum) {
    throw new Error("Bewoner is al uitgecheckt.")
  }

  if (uitcheckdatum < bestaand.incheckdatum) {
    throw new Error("Uitcheckdatum ligt vóór de incheckdatum.")
  }

  const invoer: BewonerInvoer = {
    verhuurperiode_id: bestaand.verhuurperiode_id,
    huurder_id: bestaand.huurder_id,
    kamer_id: null,
    voornaam: bestaand.voornaam,
    tussenvoegsel: bestaand.tussenvoegsel,
    achternaam: bestaand.achternaam,
    incheckdatum: bestaand.incheckdatum,
    uitcheckdatum,
    status: "uitgecheckt",
    opmerkingen: bestaand.opmerkingen,
  }

  return updateBewoner(bewonerId, invoer)
}
export async function verhuisBewoner(
  bewonerId: number,
  verhuurperiodeId: number,
  nieuweKamerId: number
): Promise<Bewoner> {
  if (!Number.isInteger(bewonerId) || bewonerId <= 0) {
    throw new Error("Ongeldige bewoner.")
  }

  if (!Number.isInteger(verhuurperiodeId) || verhuurperiodeId <= 0) {
    throw new Error("Ongeldige verhuurperiode.")
  }

  if (!Number.isInteger(nieuweKamerId) || nieuweKamerId <= 0) {
    throw new Error("Ongeldige nieuwe kamer.")
  }

  const bestaand = await getBewonerById(bewonerId)

  if (!bestaand) {
    throw new Error("Bewoner niet gevonden.")
  }

  if (bestaand.verhuurperiode_id !== verhuurperiodeId) {
    throw new Error("Bewoner behoort niet tot deze verhuurperiode.")
  }

  if (bestaand.uitcheckdatum || bestaand.status !== "actief") {
    throw new Error("Alleen een actieve bewoner kan worden verhuisd.")
  }

  if (!bestaand.kamer_id || !bestaand.kamer) {
    throw new Error("De huidige kamer van de bewoner is niet vastgesteld.")
  }

  if (bestaand.kamer_id === nieuweKamerId) {
    throw new Error("De bewoner verblijft al in deze kamer.")
  }

  const { data: nieuweKamer, error: kamerError } = await supabase
    .from("kamers")
    .select("*")
    .eq("id", nieuweKamerId)
    .maybeSingle()

  if (kamerError) {
    throw new Error(`Nieuwe kamer ophalen mislukt: ${kamerError.message}`)
  }

  if (!nieuweKamer) {
    throw new Error("Nieuwe kamer niet gevonden.")
  }

  if (!nieuweKamer.actief) {
    throw new Error("De geselecteerde kamer is niet actief.")
  }

  if (nieuweKamer.woning_id !== bestaand.kamer.woning_id) {
    throw new Error("Verhuizen naar een kamer in een andere woning is niet toegestaan.")
  }

  const { count, error: bezettingError } = await supabase
    .from("bewoners")
    .select("id", { count: "exact", head: true })
    .eq("verhuurperiode_id", verhuurperiodeId)
    .eq("kamer_id", nieuweKamerId)
    .eq("status", "actief")
    .is("uitcheckdatum", null)
    .neq("id", bewonerId)

  if (bezettingError) {
    throw new Error(`Kamerbezetting controleren mislukt: ${bezettingError.message}`)
  }

  if ((count ?? 0) >= nieuweKamer.capaciteit) {
    throw new Error("De geselecteerde kamer heeft geen vrije plaats.")
  }

  const invoer: BewonerInvoer = {
    verhuurperiode_id: bestaand.verhuurperiode_id,
    huurder_id: bestaand.huurder_id,
    kamer_id: nieuweKamerId,
    voornaam: bestaand.voornaam,
    tussenvoegsel: bestaand.tussenvoegsel,
    achternaam: bestaand.achternaam,
    incheckdatum: bestaand.incheckdatum,
    uitcheckdatum: null,
    status: "actief",
    opmerkingen: bestaand.opmerkingen,
  }

  return updateBewoner(bewonerId, invoer)
}
export async function getBewonerKamerHistorie(bewonerId: number) {
  if (!Number.isInteger(bewonerId) || bewonerId <= 0) {
    throw new Error("Ongeldige bewoner.")
  }

  const { data, error } = await supabase
    .from("bewoner_kamerhistorie")
    .select("*")
    .eq("bewoner_id", bewonerId)
    .order("verhuisdatum", { ascending: false })

  if (error) {
    throw new Error(
      `Kamerhistorie ophalen mislukt: ${error.message}`
    )
  }

  return data ?? []
}