import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Bewoner } from "@/types/bewoner";

const BEWONER_SELECT = `
  *,
  huurder:huurders(*),
  kamer:kamers(*)
`;

export async function getBewonersVoorVerhuurperiode(
  verhuurperiodeId: number
): Promise<Bewoner[]> {
  const supabase = await createClient();

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

export async function getBewonerById(
  bewonerId: number
): Promise<Bewoner | null> {
  const supabase = await createClient();

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

export async function getBewonerKamerHistorie(
  bewonerId: number
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bewoner_kamerhistorie")
    .select("*")
    .eq("bewoner_id", bewonerId)
    .order("verhuisdatum", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Kamerhistorie ophalen mislukt: ${error.message}`
    );
  }

  return data ?? [];
}
