import { supabase } from "@/lib/supabase";
import type { Bedrijf } from "@/types/bedrijf";

export type NieuwBedrijf = {
  naam: string;
  klantnummer?: string | null;
  kvk_nummer?: string | null;
  btw_nummer?: string | null;
  contactpersoon?: string | null;
  telefoon?: string | null;
  email?: string | null;
  factuur_email?: string | null;
  factuuradres?: string | null;
  postcode?: string | null;
  plaats?: string | null;
  opmerkingen?: string | null;
};

export async function getBedrijven(): Promise<Bedrijf[]> {
  const { data, error } = await supabase
    .from("bedrijven")
    .select("*")
    .order("naam", { ascending: true });

  if (error) {
    throw new Error(`Bedrijven ophalen mislukt: ${error.message}`);
  }

  return data ?? [];
}

export async function getBedrijfById(id: number): Promise<Bedrijf | null> {
  const { data, error } = await supabase
    .from("bedrijven")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Bedrijf ophalen mislukt: ${error.message}`);
  }

  return data;
}

export async function createBedrijf(
  invoer: NieuwBedrijf
): Promise<Bedrijf> {
  const naam = invoer.naam.trim();

  if (naam.length < 2) {
    throw new Error("Bedrijfsnaam moet minimaal 2 tekens bevatten.");
  }

  const { data, error } = await supabase
    .from("bedrijven")
    .insert({
      ...invoer,
      naam,
      actief: true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Bedrijf opslaan mislukt: ${error.message}`);
  }

  return data;
}
