import { supabase } from "@/lib/supabase";
import type { Bedrijf } from "@/types/bedrijf";

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
