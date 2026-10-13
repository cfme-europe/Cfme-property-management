import { createClient } from "@/lib/supabase/server";
import "server-only";
import { energieClient } from "./energieanalyse-server";
import { leesAlleRijen } from "@/lib/energie/paginering";
import {
  klantSnapshot,
  type EnergieKlantSnapshot,
} from "@/lib/energie/snapshot";
export async function getEnergieRapportVersies(rapportId: number) {
  const supabase = await createClient();
  const { data: mag } = await supabase.rpc("mag_managementinformatie_lezen");
  if (!mag)
    return {
      beschikbaar: false,
      versies: [] as { id: string; created_at: string }[],
    };
  const { error } = await supabase
    .from("energie_snapshots")
    .select("id")
    .limit(1);
  if (error && (error.code === "42P01" || error.code === "PGRST205"))
    return {
      beschikbaar: false,
      versies: [] as { id: string; created_at: string }[],
    };
  if (error) throw new Error(error.message);
  const versies = await leesAlleRijen((a, b) =>
    supabase
      .from("energie_snapshots")
      .select("id,created_at")
      .eq("maandrapportage_id", rapportId)
      .order("id")
      .range(a, b),
  );
  return {
    beschikbaar: true,
    versies: versies.sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}
export async function getEnergieRapportSnapshot(
  id: string,
  rapportId: number,
  woningId: number,
) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id))
    throw new Error("Selecteer een geldige energiesnapshot.");
  const { supabase } = await energieClient();
  const { data, error } = await supabase
    .from("energie_snapshots")
    .select("klant")
    .eq("id", id)
    .eq("maandrapportage_id", rapportId)
    .eq("woning_id", woningId)
    .single();
  if (error || !data)
    throw new Error("Energiesnapshot niet beschikbaar voor deze rapportage.");
  return klantSnapshot(data.klant as EnergieKlantSnapshot);
}
