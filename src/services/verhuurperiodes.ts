import { supabase } from "@/lib/supabase";
import type { Verhuurperiode } from "@/types/verhuurperiode";

export async function getActieveVerhuurperiodeVoorWoning(
  woningId: number
): Promise<Verhuurperiode | null> {
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
    throw new Error(`Actieve verhuurperiode ophalen mislukt: ${error.message}`);
  }

  return data;
}

export async function getVerhuurhistorieVoorWoning(
  woningId: number
): Promise<Verhuurperiode[]> {
  const { data, error } = await supabase
    .from("verhuurperiodes")
    .select(`
      *,
      bedrijf:bedrijven(*)
    `)
    .eq("woning_id", woningId)
    .order("startdatum", { ascending: false });

  if (error) {
    throw new Error(`Verhuurhistorie ophalen mislukt: ${error.message}`);
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
    .order("startdatum", { ascending: false });

  if (error) {
    throw new Error(
      `Woningen van bedrijf ophalen mislukt: ${error.message}`
    );
  }

  const rijen = (data ?? []) as unknown as Array<
    Omit<BedrijfWoningKoppeling, "woning"> & {
      woning:
        | {
            id: number;
            adres: string;
            postcode: string;
            plaats: string;
          }
        | Array<{
            id: number;
            adres: string;
            postcode: string;
            plaats: string;
          }>
        | null;
    }
  >;

  return rijen.map((rij) => ({
    ...rij,
    woning: Array.isArray(rij.woning)
      ? rij.woning[0] ?? null
      : rij.woning ?? null,
  }));
}

export type NieuweVerhuurperiode = {
  woning_id: number;
  bedrijf_id: number;
  startdatum: string;
  geplande_einddatum: string | null;
  maandhuur: number;
  borg: number | null;
  facturatie_dag: number;
  referentie: string | null;
  opmerkingen: string | null;
};

export async function createVerhuurperiode(
  invoer: NieuweVerhuurperiode
): Promise<Verhuurperiode> {
  if (!Number.isInteger(invoer.woning_id) || invoer.woning_id <= 0) {
    throw new Error("Ongeldige woning.");
  }

  if (!Number.isInteger(invoer.bedrijf_id) || invoer.bedrijf_id <= 0) {
    throw new Error("Selecteer een bedrijf.");
  }

  if (!invoer.startdatum) {
    throw new Error("Startdatum is verplicht.");
  }

  if (!Number.isFinite(invoer.maandhuur) || invoer.maandhuur < 0) {
    throw new Error("Maandhuur is ongeldig.");
  }

  if (
    invoer.geplande_einddatum &&
    invoer.geplande_einddatum < invoer.startdatum
  ) {
    throw new Error("Einddatum mag niet vóór de startdatum liggen.");
  }

  const { data: actievePeriode, error: controleFout } = await supabase
    .from("verhuurperiodes")
    .select("id")
    .eq("woning_id", invoer.woning_id)
    .eq("status", "actief")
    .maybeSingle();

  if (controleFout) {
    throw new Error(
      `Controle actieve verhuurperiode mislukt: ${controleFout.message}`
    );
  }

  if (actievePeriode) {
    throw new Error(
      "Deze woning heeft al een actieve verhuurperiode. Beëindig die eerst."
    );
  }

  const { data, error } = await supabase
    .from("verhuurperiodes")
    .insert({
      woning_id: invoer.woning_id,
      bedrijf_id: invoer.bedrijf_id,
      startdatum: invoer.startdatum,
      geplande_einddatum: invoer.geplande_einddatum,
      maandhuur: invoer.maandhuur,
      borg: invoer.borg,
      facturatie_dag: invoer.facturatie_dag,
      referentie: invoer.referentie,
      opmerkingen: invoer.opmerkingen,
      status: "actief",
      begininspectie_verplicht: true,
      eindinspectie_verplicht: true,
    })
    .select(`
      *,
      bedrijf:bedrijven(*)
    `)
    .single();

  if (error) {
    throw new Error(`Verhuurperiode opslaan mislukt: ${error.message}`);
  }

  return data as Verhuurperiode;
}
