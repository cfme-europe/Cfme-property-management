import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Woning, WoningStatus } from "@/types/woning";

const woningVelden =
  "id, created_at, dossiernummer, adres, postcode, plaats, status, gearchiveerd_op, archiefreden, gearchiveerd_door, gearchiveerd_door_naam";

export async function getWoningen(
  status: WoningStatus = "actief",
): Promise<Woning[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("woningen")
    .select(woningVelden)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Woningen ophalen mislukt: ${error.message}`);
  }

  return data ?? [];
}

export async function getWoningById(id: number): Promise<Woning | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("woningen")
    .select(woningVelden)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Woning ophalen mislukt: ${error.message}`);
  }

  return data;
}
