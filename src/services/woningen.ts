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
