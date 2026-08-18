import { supabase } from "@/lib/supabase";
import type { Woning } from "@/types/woning";

export async function getWoningen(): Promise<Woning[]> {
  const { data, error } = await supabase
    .from("woningen")
    .select("id, created_at, dossiernummer, adres, postcode, plaats")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Woningen ophalen mislukt: ${error.message}`);
  }

  return data ?? [];
}

export async function getWoningById(id: number): Promise<Woning | null> {
  const { data, error } = await supabase
    .from("woningen")
    .select("id, created_at, dossiernummer, adres, postcode, plaats")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Woning ophalen mislukt: ${error.message}`);
  }

  return data;
}


export type WoningGegevensWijziging = {
  id: number;
  adres: string;
  postcode: string;
  plaats: string;
};

export async function updateWoningGegevens(
  invoer: WoningGegevensWijziging
): Promise<Woning> {
  if (!Number.isInteger(invoer.id) || invoer.id <= 0) {
    throw new Error("Ongeldige woning.");
  }

  const adres = invoer.adres.trim();
  const postcode = invoer.postcode.trim().toUpperCase();
  const plaats = invoer.plaats.trim();

  if (!adres || !postcode || !plaats) {
    throw new Error(
      "Adres, postcode en plaats zijn verplicht."
    );
  }

  const { data, error } = await supabase
    .from("woningen")
    .update({
      adres,
      postcode,
      plaats,
    })
    .eq("id", invoer.id)
    .select(
      "id, created_at, dossiernummer, adres, postcode, plaats"
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Woninggegevens wijzigen mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Woning niet gevonden.");
  }

  return data as Woning;
}
