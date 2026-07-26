import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ControleAfwijkingBeheer } from "@/types/controleafwijking";

export async function getControleAfwijkingenVoorWoning(
  woningId: number,
): Promise<ControleAfwijkingBeheer[]> {
  if (!Number.isInteger(woningId) || woningId <= 0) {
    throw new Error("Ongeldige woning.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("controle_afwijkingen")
    .select(`
      *,
      resultaat:controle_resultaten(
        ruimte_naam_snapshot,
        object_naam_snapshot,
        controlepunt_naam_snapshot
      )
    `)
    .eq("woning_id", woningId)
    .order("status", { ascending: true })
    .order("urgentie", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Controleafwijkingen ophalen mislukt: ${error.message}`,
    );
  }

  return (data ?? []).map((rij) => ({
    ...rij,
    resultaat: Array.isArray(rij.resultaat)
      ? rij.resultaat[0] ?? null
      : rij.resultaat,
  })) as ControleAfwijkingBeheer[];
}
