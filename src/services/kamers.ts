import { supabase } from "@/lib/supabase";
import type { Kamer, KamerInvoer } from "@/types/kamer";

function schoon(waarde: string | null | undefined): string | null {
  const resultaat = waarde?.trim() ?? "";
  return resultaat || null;
}

function valideer(invoer: KamerInvoer): KamerInvoer {
  if (!Number.isInteger(invoer.woning_id) || invoer.woning_id <= 0) {
    throw new Error("Ongeldige woning.");
  }

  const naam = invoer.naam.trim();

  if (!naam) {
    throw new Error("Kamernaam is verplicht.");
  }

  if (!Number.isInteger(invoer.capaciteit) || invoer.capaciteit <= 0) {
    throw new Error("Capaciteit moet minimaal 1 zijn.");
  }

  return {
    woning_id: invoer.woning_id,
    naam,
    verdieping: schoon(invoer.verdieping),
    capaciteit: invoer.capaciteit,
    actief: invoer.actief,
    opmerkingen: schoon(invoer.opmerkingen),
  };
}

export async function getKamersVoorWoning(
  woningId: number
): Promise<Kamer[]> {
  const { data, error } = await supabase
    .from("kamers")
    .select("*")
    .eq("woning_id", woningId)
    .order("naam", { ascending: true });

  if (error) {
    throw new Error(`Kamers ophalen mislukt: ${error.message}`);
  }

  return (data ?? []) as Kamer[];
}

export async function getKamerById(
  kamerId: number
): Promise<Kamer | null> {
  const { data, error } = await supabase
    .from("kamers")
    .select("*")
    .eq("id", kamerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Kamer ophalen mislukt: ${error.message}`);
  }

  return data as Kamer | null;
}

export async function createKamer(
  invoer: KamerInvoer
): Promise<Kamer> {
  const geldig = valideer(invoer);

  const { data, error } = await supabase
    .from("kamers")
    .insert(geldig)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Kamer opslaan mislukt: ${error.message}`);
  }

  return data as Kamer;
}

export async function updateKamer(
  kamerId: number,
  invoer: KamerInvoer
): Promise<Kamer> {
  if (!Number.isInteger(kamerId) || kamerId <= 0) {
    throw new Error("Ongeldige kamer.");
  }

  const geldig = valideer(invoer);

  const { data, error } = await supabase
    .from("kamers")
    .update(geldig)
    .eq("id", kamerId)
    .eq("woning_id", geldig.woning_id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Kamer wijzigen mislukt: ${error.message}`);
  }

  if (!data) {
    throw new Error("Kamer niet gevonden.");
  }

  return data as Kamer;
}

export async function deleteKamer(
  kamerId: number,
  woningId: number
): Promise<void> {
  const { error } = await supabase
    .from("kamers")
    .delete()
    .eq("id", kamerId)
    .eq("woning_id", woningId);

  if (error) {
    throw new Error(`Kamer verwijderen mislukt: ${error.message}`);
  }
}
