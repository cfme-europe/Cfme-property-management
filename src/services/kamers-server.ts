import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Kamer, KamerBeschikbaarheid } from "@/types/kamer";

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


export async function getKamerbeschikbaarheid(
  woningId: number,
  verhuurperiodeId: number,
): Promise<KamerBeschikbaarheid[]> {
  if (!Number.isInteger(woningId) || woningId <= 0) {
    throw new Error("Ongeldige woning.");
  }

  if (
    !Number.isInteger(verhuurperiodeId) ||
    verhuurperiodeId <= 0
  ) {
    throw new Error("Ongeldige verhuurperiode.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "geef_kamerbeschikbaarheid",
    {
      p_woning_id: woningId,
      p_verhuurperiode_id: verhuurperiodeId,
    },
  );

  if (error) {
    throw new Error(
      `Kamerbeschikbaarheid ophalen mislukt: ${error.message}`,
    );
  }

  return (data ?? []) as KamerBeschikbaarheid[];
}
