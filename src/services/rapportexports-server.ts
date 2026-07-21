import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Rapportexport } from "@/types/rapportexport";

function valideerId(id: number, naam: string): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Ongeldige ${naam}.`);
  }
}

export async function getRapportexportsVoorRapportage(
  rapportageId: number
): Promise<Rapportexport[]> {
  valideerId(rapportageId, "maandrapportage");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rapportexports")
    .select("*")
    .eq("maandrapportage_id", rapportageId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Exportgeschiedenis ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Rapportexport[];
}
