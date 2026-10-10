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

  return {
    meterstanden: (meterstandenResultaat.data ?? []) as EnergieMeterstand[],
    woningen: (woningenResultaat.data ?? []) as EnergieWoning[],
    bedrijven: (bedrijvenResultaat.data ?? []) as EnergieBedrijf[],
    verhuurperioden: (verhuurResultaat.data ?? []) as EnergieVerhuurperiode[],
    bewoners: (bewonersResultaat.data ?? []) as EnergieBewoner[],
  };
}
