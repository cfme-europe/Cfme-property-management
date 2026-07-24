import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ControlepuntDefinitie,
  WoningConfiguratie,
  WoningControlepunt,
  WoningObject,
  WoningRuimte,
  WoningVerdieping,
} from "@/types/woningconfiguratie";

function geldigWoningId(woningId: number): void {
  if (!Number.isInteger(woningId) || woningId <= 0) {
    throw new Error("Ongeldige woning.");
  }
}

export async function getWoningConfiguratie(
  woningId: number): Promise<WoningConfiguratie> {
  geldigWoningId(woningId);

  const supabase = await createClient();

  const [
    verdiepingenResultaat,
    ruimtenResultaat,
    objectenResultaat,
    controlepuntenResultaat,
    definitiesResultaat,
  ] = await Promise.all([
    supabase
      .from("woning_verdiepingen")
      .select("*")
      .eq("woning_id", woningId)
      .order("actief", { ascending: false })
      .order("loopvolgorde", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("woning_ruimten")
      .select("*")
      .eq("woning_id", woningId)
      .order("actief", { ascending: false })
      .order("loopvolgorde", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("woning_objecten")
      .select("*")
      .eq("woning_id", woningId)
      .order("actief", { ascending: false })
      .order("ruimte_id", { ascending: true })
      .order("loopvolgorde", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("woning_controlepunten")
      .select("*, definitie:controlepunt_definities(*)")
      .eq("woning_id", woningId)
      .order("actief", { ascending: false })
      .order("ruimte_id", { ascending: true })
      .order("loopvolgorde", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("controlepunt_definities")
      .select("*")
      .eq("actief", true)
      .order("categorie", { ascending: true })
      .order("naam", { ascending: true }),
  ]);

  const fout =
    verdiepingenResultaat.error ??
    ruimtenResultaat.error ??
    objectenResultaat.error ??
    controlepuntenResultaat.error ??
    definitiesResultaat.error;

  if (fout) {
    throw new Error(
      `Woningconfiguratie ophalen mislukt: ${fout.message}`,
    );
  }

  return {
    verdiepingen:
      (verdiepingenResultaat.data ?? []) as WoningVerdieping[],
    ruimten:
      (ruimtenResultaat.data ?? []) as WoningRuimte[],
    objecten:
      (objectenResultaat.data ?? []) as WoningObject[],
    controlepunten:
      (controlepuntenResultaat.data ?? []) as WoningControlepunt[],
    definities:
      (definitiesResultaat.data ?? []) as ControlepuntDefinitie[],
  };
}
