import { supabase } from "@/lib/supabase";
import type { WoningDnaSnapshot } from "@/types/intelligence";

function valideerWoningId(woningId: number): void {
  if (
    !Number.isInteger(woningId) ||
    woningId <= 0
  ) {
    throw new Error("Ongeldige woning.");
  }
}

export async function getLaatsteWoningDnaVoorWoning(
  woningId: number
): Promise<WoningDnaSnapshot | null> {
  valideerWoningId(woningId);

  const { data, error } = await supabase
    .from("woning_dna_snapshots")
    .select("*")
    .eq("woning_id", woningId)
    .order("peildatum", {
      ascending: false,
    })
    .order("berekend_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Woning-DNA ophalen mislukt: ${error.message}`
    );
  }

  return data as WoningDnaSnapshot | null;
}
