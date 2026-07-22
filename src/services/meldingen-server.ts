import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Melding } from "@/types/melding";

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

export async function getMeldingen(): Promise<Melding[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meldingen")
    .select("*")
    .order("melddatum", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Meldingen ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Melding[];
}

export async function getMeldingenVoorWoning(
  woningId: number
): Promise<Melding[]> {
  valideerId(woningId, "woning");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meldingen")
    .select("*")
    .eq("woning_id", woningId)
    .order("status", { ascending: true })
    .order("prioriteit", { ascending: false })
    .order("melddatum", { ascending: false });

  if (error) {
    throw new Error(
      `Meldingen voor woning ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Melding[];
}

export async function getOpenMeldingenVoorWoning(
  woningId: number
): Promise<Melding[]> {
  valideerId(woningId, "woning");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meldingen")
    .select("*")
    .eq("woning_id", woningId)
    .neq("status", "opgelost")
    .order("prioriteit", { ascending: false })
    .order("melddatum", { ascending: false });

  if (error) {
    throw new Error(
      `Open meldingen ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Melding[];
}

export async function getMeldingenVoorInspectie(
  inspectieId: number
): Promise<Melding[]> {
  valideerId(inspectieId, "inspectie");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meldingen")
    .select("*")
    .eq("inspectie_id", inspectieId)
    .order("melddatum", { ascending: false });

  if (error) {
    throw new Error(
      `Inspectiemeldingen ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Melding[];
}

export async function getMeldingById(
  meldingId: number
): Promise<Melding | null> {
  valideerId(meldingId, "melding");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meldingen")
    .select("*")
    .eq("id", meldingId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Melding ophalen mislukt: ${error.message}`
    );
  }

  return data as Melding | null;
}
