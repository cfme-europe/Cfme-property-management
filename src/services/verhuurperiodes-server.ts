import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Verhuurperiode } from "@/types/verhuurperiode";

export async function getActieveVerhuurperiodeVoorWoning(
  woningId: number
): Promise<Verhuurperiode | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("verhuurperiodes")
    .select(`
      *,
      bedrijf:bedrijven(*)
    `)
    .eq("woning_id", woningId)
    .eq("status", "actief")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Actieve verhuurperiode ophalen mislukt: ${error.message}`
    );
  }

  return data;
}

export async function getVerhuurhistorieVoorWoning(
  woningId: number
): Promise<Verhuurperiode[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("verhuurperiodes")
    .select(`
      *,
      bedrijf:bedrijven(*)
    `)
    .eq("woning_id", woningId)
    .order("startdatum", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Verhuurhistorie ophalen mislukt: ${error.message}`
    );
  }

  return data ?? [];
}

export type BedrijfWoningKoppeling = {
  id: number;
  woning_id: number;
  bedrijf_id: number;
  startdatum: string;
  geplande_einddatum: string | null;
  werkelijke_einddatum: string | null;
  maandhuur: number;
  status: string;
  woning: {
    id: number;
    adres: string;
    postcode: string;
    plaats: string;
  } | null;
};

export async function getVerhuurperiodesVoorBedrijf(
  bedrijfId: number
): Promise<BedrijfWoningKoppeling[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("verhuurperiodes")
    .select(`
      id,
      woning_id,
      bedrijf_id,
      startdatum,
      geplande_einddatum,
      werkelijke_einddatum,
      maandhuur,
      status,
      woning:woningen (
        id,
        adres,
        postcode,
        plaats
      )
    `)
    .eq("bedrijf_id", bedrijfId)
    .order("startdatum", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Woningen van bedrijf ophalen mislukt: ${error.message}`
    );
  }

  const rijen = (data ?? []) as unknown as Array<
    Omit<BedrijfWoningKoppeling, "woning"> & {
      woning:
        | BedrijfWoningKoppeling["woning"]
        | Array<
            NonNullable<
              BedrijfWoningKoppeling["woning"]
            >
          >;
    }
  >;

  return rijen.map((rij) => ({
    ...rij,
    woning: Array.isArray(rij.woning)
      ? rij.woning[0] ?? null
      : rij.woning ?? null,
  }));
}
