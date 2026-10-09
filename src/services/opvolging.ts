import { createClient } from "@/lib/supabase/client";
import type { OpvolgBronType, OpvolgItemInvoer } from "@/types/opvolging";

export async function updateOpvolgitem(
  bronType: OpvolgBronType,
  bronId: number,
  woningId: number,
  invoer: OpvolgItemInvoer,
): Promise<void> {
  if (!Number.isInteger(bronId) || bronId <= 0 || !Number.isInteger(woningId) || woningId <= 0) {
    throw new Error("Ongeldig opvolgitem.");
  }

  const oplossing = invoer.oplossing?.trim() || null;
  if (["afgehandeld", "niet_relevant"].includes(invoer.status) && !oplossing) {
    throw new Error("Vul in wat er met dit punt is gedaan.");
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("beheer_opvolgitem", {
    p_bron_type: bronType,
    p_bron_id: bronId,
    p_woning_id: woningId,
    p_status: invoer.status,
    p_verantwoordelijke: invoer.verantwoordelijke?.trim() || null,
    p_deadline: invoer.deadline || null,
    p_oplossing: oplossing,
  });

  if (error) throw new Error(`Opvolging opslaan mislukt: ${error.message}`);
}
