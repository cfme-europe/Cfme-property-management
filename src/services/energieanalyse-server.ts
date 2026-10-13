import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  EnergieBedrijf,
  EnergieBewoner,
  EnergieMeterstand,
  EnergieVerhuurperiode,
  EnergieWoning,
} from "@/lib/energie/portfolio-analyse";

export type EnergieAnalyseBrondata = {
  meterstanden: EnergieMeterstand[];
  woningen: EnergieWoning[];
  bedrijven: EnergieBedrijf[];
  verhuurperioden: EnergieVerhuurperiode[];
  bewoners: EnergieBewoner[];
};

export async function getEnergieAnalyseBrondata(): Promise<EnergieAnalyseBrondata> {
  const supabase = await createClient();

  const [
    meterstandenResultaat,
    woningenResultaat,
    bedrijvenResultaat,
    verhuurResultaat,
    bewonersResultaat,
  ] = await Promise.all([
    supabase
      .from("meterstanden")
      .select(
        "woning_id, opnamedatum, bewoners_aantal, dagstroom_kwh, nachtstroom_kwh, elektriciteit_kwh, gas_m3, water_m3",
      )
      .order("woning_id")
      .order("opnamedatum"),
    supabase
      .from("woningen")
      .select("id, adres, postcode, plaats")
      .eq("status", "actief")
      .order("adres"),
    supabase.from("bedrijven").select("id, naam").order("naam"),
    supabase
      .from("verhuurperiodes")
      .select("id, woning_id, bedrijf_id"),
    supabase
      .from("bewoners")
      .select("id, verhuurperiode_id, incheckdatum, uitcheckdatum"),
  ]);

  const fout = [
    meterstandenResultaat.error,
    woningenResultaat.error,
    bedrijvenResultaat.error,
    verhuurResultaat.error,
    bewonersResultaat.error,
  ].find(Boolean);

  if (fout) {
    throw new Error(`Energieanalyse ophalen mislukt: ${fout.message}`);
  }

  const woningen = (woningenResultaat.data ?? []) as EnergieWoning[];
  const woningIds = new Set(woningen.map((woning) => woning.id));
  const verhuurperioden = ((verhuurResultaat.data ?? []) as EnergieVerhuurperiode[])
    .filter((periode) => woningIds.has(periode.woning_id));
  const verhuurperiodeIds = new Set(verhuurperioden.map((periode) => periode.id));

  return {
    meterstanden: ((meterstandenResultaat.data ?? []) as EnergieMeterstand[])
      .filter((meterstand) => woningIds.has(meterstand.woning_id)),
    woningen,
    bedrijven: (bedrijvenResultaat.data ?? []) as EnergieBedrijf[],
    verhuurperioden,
    bewoners: ((bewonersResultaat.data ?? []) as EnergieBewoner[])
      .filter((bewoner) => verhuurperiodeIds.has(bewoner.verhuurperiode_id)),
  };
}
