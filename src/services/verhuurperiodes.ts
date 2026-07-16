import { supabase } from "@/lib/supabase";
import { registreerWorkflowGebeurtenis } from "@/services/workflow";
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

  const verhuurperiode = data as Verhuurperiode;

  await registreerWorkflowGebeurtenis({
    woning_id: verhuurperiode.woning_id,
    controlesessie_id: null,
    gebeurtenis_type: "verhuurperiode.gestart",
    bron_type: "verhuurperiode",
    bron_id: verhuurperiode.id,
    prioriteit: "hoog",
    deduplicatie_sleutel:
      `verhuurperiode:${verhuurperiode.id}:gestart`,
    payload: {
      bedrijf_id: verhuurperiode.bedrijf_id,
      startdatum: verhuurperiode.startdatum,
      geplande_einddatum:
        verhuurperiode.geplande_einddatum,
      begininspectie_verplicht:
        verhuurperiode.begininspectie_verplicht,
    },
  });

  return verhuurperiode;
}

export type VerhuurperiodeBeeindigen = {
  verhuurperiode_id: number;
  woning_id: number;
  opzegdatum: string;
  werkelijke_einddatum: string;
  opleverdatum: string;
};

export async function beeindigVerhuurperiode(
  invoer: VerhuurperiodeBeeindigen
): Promise<Verhuurperiode> {
  if (
    !Number.isInteger(invoer.verhuurperiode_id) ||
    invoer.verhuurperiode_id <= 0
  ) {
    throw new Error("Ongeldige verhuurperiode.");
  }

  if (!Number.isInteger(invoer.woning_id) || invoer.woning_id <= 0) {
    throw new Error("Ongeldige woning.");
  }

  if (!invoer.opzegdatum) {
    throw new Error("Opzegdatum is verplicht.");
  }

  if (!invoer.werkelijke_einddatum) {
    throw new Error("Werkelijke einddatum is verplicht.");
  }

  if (!invoer.opleverdatum) {
    throw new Error("Opleverdatum is verplicht.");
  }

  const { data: huidigePeriode, error: controleFout } = await supabase
    .from("verhuurperiodes")
    .select("id, woning_id, startdatum, status")
    .eq("id", invoer.verhuurperiode_id)
    .eq("woning_id", invoer.woning_id)
    .maybeSingle();

  if (controleFout) {
    throw new Error(
      `Verhuurperiode controleren mislukt: ${controleFout.message}`
    );
  }

  if (!huidigePeriode) {
    throw new Error("Verhuurperiode niet gevonden.");
  }

  if (huidigePeriode.status !== "actief") {
    throw new Error("Deze verhuurperiode is niet meer actief.");
  }

  if (invoer.opzegdatum < huidigePeriode.startdatum) {
    throw new Error("Opzegdatum mag niet vóór de startdatum liggen.");
  }

  if (invoer.werkelijke_einddatum < huidigePeriode.startdatum) {
    throw new Error(
      "Werkelijke einddatum mag niet vóór de startdatum liggen."
    );
  }

  if (invoer.werkelijke_einddatum < invoer.opzegdatum) {
    throw new Error(
      "Werkelijke einddatum mag niet vóór de opzegdatum liggen."
    );
  }

  if (invoer.opleverdatum < invoer.werkelijke_einddatum) {
    throw new Error(
      "Opleverdatum mag niet vóór de werkelijke einddatum liggen."
    );
  }

  const { data, error } = await supabase
    .from("verhuurperiodes")
    .update({
      opzegdatum: invoer.opzegdatum,
      werkelijke_einddatum: invoer.werkelijke_einddatum,
      opleverdatum: invoer.opleverdatum,
      status: "beëindigd",
    })
    .eq("id", invoer.verhuurperiode_id)
    .eq("woning_id", invoer.woning_id)
    .eq("status", "actief")
    .select(`
      *,
      bedrijf:bedrijven(*)
    `)
    .maybeSingle();

  if (error) {
    throw new Error(`Verhuurperiode beëindigen mislukt: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      "De verhuurperiode kon niet worden beëindigd. Vernieuw de pagina."
    );
  }

  const verhuurperiode = data as Verhuurperiode;

  await registreerWorkflowGebeurtenis({
    woning_id: verhuurperiode.woning_id,
    controlesessie_id: null,
    gebeurtenis_type: "verhuurperiode.beeindigd",
    bron_type: "verhuurperiode",
    bron_id: verhuurperiode.id,
    prioriteit: "hoog",
    deduplicatie_sleutel:
      `verhuurperiode:${verhuurperiode.id}:beeindigd`,
    payload: {
      bedrijf_id: verhuurperiode.bedrijf_id,
      opzegdatum: verhuurperiode.opzegdatum,
      werkelijke_einddatum:
        verhuurperiode.werkelijke_einddatum,
      opleverdatum: verhuurperiode.opleverdatum,
      eindinspectie_verplicht:
        verhuurperiode.eindinspectie_verplicht,
    },
  });

  return verhuurperiode;
}
