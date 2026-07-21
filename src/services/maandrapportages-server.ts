import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Maandrapportage } from "@/types/maandrapportage";

function valideerId(id: number, naam: string): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Ongeldige ${naam}.`);
  }
}

export async function getMaandrapportagesVoorWoning(
  woningId: number
): Promise<Maandrapportage[]> {
  valideerId(woningId, "woning");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("maandrapportages")
    .select("*")
    .eq("woning_id", woningId)
    .order("rapportjaar", { ascending: false })
    .order("rapportmaand", { ascending: false });

  if (error) {
    throw new Error(
      `Maandrapportages ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Maandrapportage[];
}

export async function getMaandrapportageById(
  rapportageId: number
): Promise<Maandrapportage | null> {
  valideerId(rapportageId, "maandrapportage");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("maandrapportages")
    .select("*")
    .eq("id", rapportageId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Maandrapportage ophalen mislukt: ${error.message}`
    );
  }

  return data as Maandrapportage | null;
}
