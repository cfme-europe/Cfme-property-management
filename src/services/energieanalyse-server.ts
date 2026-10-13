import "server-only";
import { createClient } from "@/lib/supabase/server";
import { leesAlleRijen } from "@/lib/energie/paginering";
import type {
  Brondata,
  EnergieBedrijf,
  EnergieBewoner,
  EnergieMeterstand,
  EnergieVerhuurperiode,
  EnergieWoning,
  Meterconfiguratie,
} from "@/lib/energie/portfolio-analyse";
import type { Tariefplan } from "@/lib/energie/tarieven";
export type EnergieAnalyseBrondata = Brondata;
export async function energieClient(schrijven = false) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Aanmelden vereist.");
  const { data: mag, error: rolFout } = await supabase.rpc(
    schrijven ? "mag_administratie_beheren" : "mag_managementinformatie_lezen",
  );
  if (rolFout || !mag)
    throw new Error("Onvoldoende rechten voor energie-intelligence.");
  return { supabase, user };
}
export async function getEnergieAnalyseBrondata(): Promise<Brondata> {
  const { supabase } = await energieClient();
  const read = (t: string, velden: string) =>
    leesAlleRijen(
      (a, b) =>
        supabase
          .from(t)
          .select(velden)
          .order("id")
          .range(a, b) as unknown as PromiseLike<{
          data: ({ id: number } & Record<string, unknown>)[] | null;
          error: { message: string } | null;
        }>,
    );
  const [meterstanden, woningen, bedrijven, verhuurperioden, bewoners] =
    await Promise.all([
      read(
        "meterstanden",
        "id, woning_id, opnamedatum, bewoners_aantal, dagstroom_kwh, nachtstroom_kwh, elektriciteit_kwh, elektriciteit_dag_kwh, elektriciteit_nacht_kwh, gas_m3, water_m3, analyse_status, analyse_resultaat, opvolging_nodig, meteruitzonderingen, updated_at",
      ),
      read("woningen", "id, adres, postcode, plaats, status"),
      read("bedrijven", "id, naam"),
      read(
        "verhuurperiodes",
        "id, woning_id, bedrijf_id, startdatum, werkelijke_einddatum",
      ),
      read("bewoners", "id, verhuurperiode_id, incheckdatum, uitcheckdatum"),
    ]);
  return {
    meterstanden: meterstanden as EnergieMeterstand[],
    woningen: woningen as EnergieWoning[],
    bedrijven: bedrijven as EnergieBedrijf[],
    verhuurperioden: verhuurperioden as EnergieVerhuurperiode[],
    bewoners: bewoners as EnergieBewoner[],
  };
}
export async function getEnergieUitbreiding() {
  const { supabase } = await energieClient();
  const { error } = await supabase
    .from("energie_tariefplannen")
    .select("id")
    .limit(1);
  if (error && (error.code === "42P01" || error.code === "PGRST205"))
    return {
      beschikbaar: false,
      tarieven: [] as Tariefplan[],
      configuraties: [] as Meterconfiguratie[],
      maatregelen: [] as EnergieMaatregel[],
    };
  if (error) throw new Error(error.message);
  const read = (table: string) =>
    leesAlleRijen((a, b) =>
      supabase.from(table).select("*").order("id").range(a, b),
    );
  const [tarieven, configuraties, maatregelen] = await Promise.all([
    read("energie_tariefplannen"),
    read("energie_meterconfiguraties"),
    read("energie_maatregelen"),
  ]);
  const vervangen = new Set(configuraties.map((c) => c.voorganger_id));
  return {
    beschikbaar: true,
    tarieven: tarieven as unknown as Tariefplan[],
    configuraties: configuraties.filter(
      (c) => !vervangen.has(c.id),
    ) as unknown as Meterconfiguratie[],
    maatregelen: maatregelen as unknown as EnergieMaatregel[],
  };
}
export type EnergieMaatregel = {
  id: string;
  woning_id: number;
  product: string;
  titel: string;
  status: "onderzoek" | "gepland" | "uitgevoerd" | "gecontroleerd";
  uitvoerdatum: string | null;
  taak_id: number | null;
  referentie_vanaf: string;
  referentie_tot: string;
  controle_vanaf: string | null;
  controle_tot: string | null;
  klant_toelichting: string;
  klant_goedgekeurd: boolean;
  created_at: string;
  voorganger_id: string | null;
  onderbouwing: string;
};
