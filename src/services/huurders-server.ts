import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Huurder } from "@/types/huurder";

export async function getHuurdersVoorVerhuurperiode(
  verhuurperiodeId: number
): Promise<Huurder[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("huurders")
    .select("*")
    .eq("verhuurperiode_id", verhuurperiodeId)
    .order("achternaam", { ascending: true })
    .order("voornaam", { ascending: true });

  if (error) {
    throw new Error(
      `Huurders ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Huurder[];
}

export async function getHuurderById(
  huurderId: number
): Promise<Huurder | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("huurders")
    .select("*")
    .eq("id", huurderId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Huurder ophalen mislukt: ${error.message}`
    );
  }

  return data as Huurder | null;
}
