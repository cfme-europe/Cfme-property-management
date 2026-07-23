import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Gebruikersprofiel } from "@/types/gebruiker";

type PlanningWoning = {
  id: number;
  adres: string;
  postcode: string;
  plaats: string;
};

type PlanningRayon = {
  naam: string;
  code: string;
  standaard_controleur_id: string | null;
  standaard_controlefrequentie_dagen: number;
  actief: boolean;
};

type PlanningRij = {
  woning_id: number;
  standaard_controleur_id: string | null;
  controlefrequentie_dagen: number | null;
  geldig_vanaf: string;
  woning: PlanningWoning | PlanningWoning[] | null;
  rayon: PlanningRayon | PlanningRayon[] | null;
};

export type ControleurWoning = {
  woning_id: number;
  adres: string;
  postcode: string;
  plaats: string;
  rayon_naam: string;
  rayon_code: string;
  controlefrequentie_dagen: number;
  geldig_vanaf: string;
  verhuurperiode_id: number | null;
  laatste_inspectiedatum: string | null;
  open_inspectie_id: number | null;
  controlesessie_status: "gepland" | "bezig" | null;
  gestart_at: string | null;
  locatie_status: "niet_geprobeerd" | "beschikbaar" | "niet_beschikbaar" | "toestemming_geweigerd" | "fout" | null;
  urgente_meldingen: number;
};

export type ControleurWerkplek = {
  profiel: Gebruikersprofiel;
  woningen: ControleurWoning[];
};

export async function getControleurWerkplek(): Promise<ControleurWerkplek> {
  const supabase = await createClient();
  const { data: { user }, error: gebruikerFout } = await supabase.auth.getUser();

  if (gebruikerFout || !user) throw new Error("Geen geldige gebruikerssessie.");

  const { data: profiel, error: profielFout } = await supabase
    .from("profiles")
    .select("id, created_at, updated_at, email, volledige_naam, rol, actief")
    .eq("id", user.id)
    .maybeSingle();

  if (profielFout || !profiel || !profiel.actief) throw new Error("Het gebruikersprofiel is niet actief.");
  if (!["admin", "medewerker", "controleur", "management"].includes(profiel.rol)) {
    throw new Error("Geen toegang tot de controleurwerkplek.");
  }

  const { data: toewijzingen, error: planningFout } = await supabase
    .from("woning_rayon_toewijzingen")
    .select(`
      woning_id,
      standaard_controleur_id,
      controlefrequentie_dagen,
      geldig_vanaf,
      woning:woningen(id, adres, postcode, plaats),
      rayon:rayons(naam, code, standaard_controleur_id, standaard_controlefrequentie_dagen, actief)
    `)
    .eq("actief", true)
    .is("geldig_tot", null);

  if (planningFout) throw new Error(`Controleplanning ophalen mislukt: ${planningFout.message}`);

  const planningRijen = (toewijzingen ?? []) as unknown as PlanningRij[];

  const toegewezen = planningRijen.filter((rij) => {
    const woning = Array.isArray(rij.woning) ? rij.woning[0] : rij.woning;
    const rayon = Array.isArray(rij.rayon) ? rij.rayon[0] : rij.rayon;
    const controleurId = rij.standaard_controleur_id ?? rayon?.standaard_controleur_id ?? null;
    return woning && rayon?.actief === true && controleurId === user.id;
  });

  const woningIds = toegewezen.map((rij) => rij.woning_id);
  if (woningIds.length === 0) return { profiel: profiel as Gebruikersprofiel, woningen: [] };

  const [inspectiesResultaat, sessiesResultaat, verhuurResultaat, meldingenResultaat] = await Promise.all([
    supabase.from("inspecties").select("id, woning_id, inspectiedatum, status").in("woning_id", woningIds).order("inspectiedatum", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("controlesessies").select("id, woning_id, inspectie_id, controleur_id, status, gestart_at, locatie_status").in("woning_id", woningIds).in("status", ["gepland", "bezig"]).order("created_at", { ascending: false }),
    supabase.from("verhuurperiodes").select("id, woning_id").in("woning_id", woningIds).eq("status", "actief"),
    supabase.from("meldingen").select("id, woning_id").in("woning_id", woningIds).in("status", ["open", "in_behandeling"]).in("prioriteit", ["hoog", "spoed"]),
  ]);

  if (inspectiesResultaat.error) throw new Error(`Inspecties ophalen mislukt: ${inspectiesResultaat.error.message}`);
  if (sessiesResultaat.error) throw new Error(`Controlesessies ophalen mislukt: ${sessiesResultaat.error.message}`);
  if (verhuurResultaat.error) throw new Error(`Verhuurperiodes ophalen mislukt: ${verhuurResultaat.error.message}`);
  if (meldingenResultaat.error) throw new Error(`Meldingen ophalen mislukt: ${meldingenResultaat.error.message}`);

  const inspecties = inspectiesResultaat.data ?? [];
  const sessies = (sessiesResultaat.data ?? []).filter((sessie) => sessie.controleur_id === null || sessie.controleur_id === user.id);
  const verhuurperiodes = verhuurResultaat.data ?? [];
  const meldingen = meldingenResultaat.data ?? [];

  const woningen: ControleurWoning[] = toegewezen.flatMap((rij) => {
    const woning = Array.isArray(rij.woning) ? rij.woning[0] : rij.woning;
    const rayon = Array.isArray(rij.rayon) ? rij.rayon[0] : rij.rayon;

    if (!woning || !rayon) {
      return [];
    }

    const woningInspecties = inspecties.filter((inspectie) => inspectie.woning_id === rij.woning_id);
    const openInspectie = woningInspecties.find((inspectie) => inspectie.status === "open") ?? null;
    const sessie = sessies.find((item) => item.woning_id === rij.woning_id) ?? null;

    return {
      woning_id: woning.id,
      adres: woning.adres,
      postcode: woning.postcode,
      plaats: woning.plaats,
      rayon_naam: rayon.naam,
      rayon_code: rayon.code,
      controlefrequentie_dagen: rij.controlefrequentie_dagen ?? rayon.standaard_controlefrequentie_dagen,
      geldig_vanaf: rij.geldig_vanaf,
      verhuurperiode_id: verhuurperiodes.find((periode) => periode.woning_id === woning.id)?.id ?? null,
      laatste_inspectiedatum: woningInspecties[0]?.inspectiedatum ?? null,
      open_inspectie_id: openInspectie?.id ?? null,
      controlesessie_status: sessie?.status === "gepland" || sessie?.status === "bezig" ? sessie.status : null,
      gestart_at: sessie?.gestart_at ?? null,
      locatie_status: sessie?.locatie_status ?? null,
      urgente_meldingen: meldingen.filter((melding) => melding.woning_id === woning.id).length,
    };
  });

  return { profiel: profiel as Gebruikersprofiel, woningen };
}
