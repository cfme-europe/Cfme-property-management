import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Huurder } from "@/types/huurder";
import type { Kamer } from "@/types/kamer";
import type { Bewoner } from "@/types/bewoner";
import type { Inspectie } from "@/types/inspectie";
import type { Melding } from "@/types/melding";
import type { Meterstand } from "@/types/meterstand";
import type { WoningDnaSnapshot } from "@/types/intelligence";

const BEWONER_SELECT = `
  *,
  huurder:huurders(*),
  kamer:kamers(*)
`;

export async function getHuurdersVoorVerhuurperiode(
  verhuurperiodeId: number
): Promise<Huurder[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("huurders")
    .select("*")
    .eq("verhuurperiode_id", verhuurperiodeId)
    .order("achternaam", { ascending: true })
    .order("voornaam", { ascending: true });

  if (error) {
    throw new Error(
      `Huurders ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Huurder[];
}

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

export async function getBewonersVoorVerhuurperiode(
  verhuurperiodeId: number
): Promise<Bewoner[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bewoners")
    .select(BEWONER_SELECT)
    .eq("verhuurperiode_id", verhuurperiodeId)
    .order("status", { ascending: true })
    .order("achternaam", { ascending: true })
    .order("voornaam", { ascending: true });

  if (error) {
    throw new Error(
      `Bewoners ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Bewoner[];
}

export async function getInspectiesVoorWoning(
  woningId: number
): Promise<Inspectie[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inspecties")
    .select("*")
    .eq("woning_id", woningId)
    .order("inspectiedatum", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Inspecties ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Inspectie[];
}

export async function getMeldingenVoorWoning(
  woningId: number
): Promise<Melding[]> {
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

export async function getMeterstandenVoorWoning(
  woningId: number
): Promise<Meterstand[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meterstanden")
    .select("*")
    .eq("woning_id", woningId)
    .order("opnamedatum", { ascending: false });

  if (error) {
    throw new Error(
      `Meterstanden ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Meterstand[];
}

export async function getLaatsteWoningDnaVoorWoning(
  woningId: number
): Promise<WoningDnaSnapshot | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("woning_dna_snapshots")
    .select("*")
    .eq("woning_id", woningId)
    .order("peildatum", { ascending: false })
    .order("berekend_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Woning-DNA ophalen mislukt: ${error.message}`
    );
  }

  return data as WoningDnaSnapshot | null;
}
