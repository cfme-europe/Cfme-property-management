import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Bedrijf } from "@/types/bedrijf";

export async function getBedrijven(): Promise<Bedrijf[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bedrijven")
    .select("*")
    .order("naam", { ascending: true });

  if (error) {
    throw new Error(
      `Bedrijven ophalen mislukt: ${error.message}`
    );
  }

  return data ?? [];
}

export async function getBedrijfById(
  id: number
): Promise<Bedrijf | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bedrijven")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Bedrijf ophalen mislukt: ${error.message}`
    );
  }

  return data;
}
