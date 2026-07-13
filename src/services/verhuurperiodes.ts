import { supabase } from "@/lib/supabase";
import type { Verhuurperiode } from "@/types/verhuurperiode";

export async function getActieveVerhuurperiodeVoorWoning(
  woningId: number
): Promise<Verhuurperiode | null> {
  const { data, error } = await supabase
    .from("verhuurperiodes")
    .select(`
      *,
      bedrijf:bedrijven(*)
    `)
    .eq("woning_id", woningId)
    .eq("status", "actief")
    .maybeSingle();

  if (error) {
    throw new Error(`Actieve verhuurperiode ophalen mislukt: ${error.message}`);
  }

  return data;
}

export async function getVerhuurhistorieVoorWoning(
  woningId: number
): Promise<Verhuurperiode[]> {
  const { data, error } = await supabase
    .from("verhuurperiodes")
    .select(`
      *,
      bedrijf:bedrijven(*)
    `)
    .eq("woning_id", woningId)
    .order("startdatum", { ascending: false });

  if (error) {
    throw new Error(`Verhuurhistorie ophalen mislukt: ${error.message}`);
  }

  return data ?? [];
}
