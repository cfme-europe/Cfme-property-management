import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Kamer } from "@/types/kamer";

export async function getKamersVoorWoning(
  woningId: number
): Promise<Kamer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("kamers")
    .select("*")
    .eq("woning_id", woningId)
    .order("naam", { ascending: true });

  if (error) {
    throw new Error(
      `Kamers ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Kamer[];
}
