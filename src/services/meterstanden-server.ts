import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Meterstand } from "@/types/meterstand";

function valideerId(
  waarde: number,
  naam: string
): void {
  if (
    !Number.isInteger(waarde) ||
    waarde <= 0
  ) {
    throw new Error(`Ongeldige ${naam}.`);
  }
}

export async function getMeterstandenVoorWoning(
  woningId: number
): Promise<Meterstand[]> {
  valideerId(woningId, "woning");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meterstanden")
    .select("*")
    .eq("woning_id", woningId)
    .order("opnamedatum", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Meterstanden ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Meterstand[];
}

export async function getMeterstandById(
  meterstandId: number
): Promise<Meterstand | null> {
  valideerId(meterstandId, "meterstand");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meterstanden")
    .select("*")
    .eq("id", meterstandId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Meterstand ophalen mislukt: ${error.message}`
    );
  }

  return data as Meterstand | null;
}

export async function getLaatsteMeterstandVoorWoning(
  woningId: number
): Promise<Meterstand | null> {
  valideerId(woningId, "woning");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meterstanden")
    .select("*")
    .eq("woning_id", woningId)
    .order("opnamedatum", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Laatste meterstand ophalen mislukt: ${error.message}`
    );
  }

  return data as Meterstand | null;
}
