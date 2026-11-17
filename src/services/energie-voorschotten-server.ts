import "server-only";
import { energieClient } from "./energieanalyse-server";
import { leesAlleRijen } from "@/lib/energie/paginering";
import type { Jaarprijs, VoorschotAfspraak } from "@/lib/energie/voorschotten";
export async function getEnergieVoorschotten() {
  const { supabase } = await energieClient();
  const { error } = await supabase
    .from("energie_jaarprijzen")
    .select("id")
    .limit(1);
  if (error && ["42P01", "PGRST205"].includes(error.code))
    return {
      beschikbaar: false,
      prijzen: [] as Jaarprijs[],
      afspraken: [] as VoorschotAfspraak[],
    };
  if (error) throw new Error(error.message);
  const [prijzen, afspraken] = await Promise.all([
    leesAlleRijen((a, b) =>
      supabase.from("energie_jaarprijzen").select("*").order("id").range(a, b),
    ),
    leesAlleRijen((a, b) =>
      supabase
        .from("energie_voorschotafspraken")
        .select("*")
        .order("id")
        .range(a, b),
    ),
  ]);
  return {
    beschikbaar: true,
    prijzen: prijzen as Jaarprijs[],
    afspraken: afspraken as VoorschotAfspraak[],
  };
}
