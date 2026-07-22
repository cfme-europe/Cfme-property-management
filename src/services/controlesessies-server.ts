import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Controlesessie } from "@/types/controlesessie";

export async function getLaatsteControlesessieVoorInspectie(
  inspectieId: number
): Promise<Controlesessie | null> {
  if (
    !Number.isInteger(inspectieId) ||
    inspectieId <= 0
  ) {
    throw new Error("Ongeldige inspectie.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("controlesessies")
    .select("*")
    .eq("inspectie_id", inspectieId)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Controlesessie ophalen mislukt: ${error.message}`
    );
  }

  return data as Controlesessie | null;
}
