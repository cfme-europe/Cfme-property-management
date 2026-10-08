import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ControlebewijsResultaat = {
  id: number;
  ruimte_naam_snapshot: string;
  object_naam_snapshot: string | null;
  controlepunt_naam_snapshot: string;
  resultaat: string;
  numerieke_waarde: number | null;
  tekstwaarde: string | null;
  datumwaarde: string | null;
  opmerkingen: string | null;
  beoordeeld_at: string;
  afwijking: {
    id: number;
    gebrek_type: string;
    toelichting: string;
    urgentie: string;
    status: string;
    ter_plaatse_hersteld: boolean;
    oplossing: string | null;
    gebruikte_materialen: string | null;
    arbeid_minuten: number | null;
    werkelijke_kosten: number | null;
    opgelost_at: string | null;
  } | null;
};

export async function getControlebewijsVoorInspectie(
  inspectieId: number,
): Promise<ControlebewijsResultaat[]> {
  if (!Number.isInteger(inspectieId) || inspectieId <= 0) {
    throw new Error("Ongeldige inspectie.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("controle_resultaten")
    .select(`
      id,
      ruimte_naam_snapshot,
      object_naam_snapshot,
      controlepunt_naam_snapshot,
      resultaat,
      numerieke_waarde,
      tekstwaarde,
      datumwaarde,
      opmerkingen,
      beoordeeld_at,
      afwijking:controle_afwijkingen(
        id,
        gebrek_type,
        toelichting,
        urgentie,
        status,
        ter_plaatse_hersteld,
        oplossing,
        gebruikte_materialen,
        arbeid_minuten,
        werkelijke_kosten,
        opgelost_at
      )
    `)
    .eq("inspectie_id", inspectieId)
    .order("ruimte_naam_snapshot", { ascending: true })
    .order("object_naam_snapshot", { ascending: true })
    .order("controlepunt_naam_snapshot", { ascending: true });

  if (error) {
    throw new Error(
      `Controlebewijs ophalen mislukt: ${error.message}`,
    );
  }

  return (data ?? []).map((rij) => ({
    ...rij,
    afwijking: Array.isArray(rij.afwijking)
      ? rij.afwijking[0] ?? null
      : rij.afwijking ?? null,
  })) as ControlebewijsResultaat[];
}
