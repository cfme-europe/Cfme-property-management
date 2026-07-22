import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Inspectie } from "@/types/inspectie";

export async function getInspectiesVoorWoning(
  woningId: number
): Promise<Inspectie[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inspecties")
    .select("*")
    .eq("woning_id", woningId)
    .order("inspectiedatum", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Inspecties ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Inspectie[];
}

export async function getOpenInspectiesVoorWoning(
  woningId: number
): Promise<Inspectie[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inspecties")
    .select("*")
    .eq("woning_id", woningId)
    .eq("status", "open")
    .order("inspectiedatum", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Open inspecties ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Inspectie[];
}

export async function getInspectieById(
  inspectieId: number
): Promise<Inspectie | null> {
  if (
    !Number.isInteger(inspectieId) ||
    inspectieId <= 0
  ) {
    throw new Error("Ongeldige inspectie.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inspecties")
    .select("*")
    .eq("id", inspectieId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Inspectie ophalen mislukt: ${error.message}`
    );
  }

  return data as Inspectie | null;
}
