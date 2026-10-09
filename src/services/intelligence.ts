import { supabase } from "@/lib/supabase";
import type {
  IntelligenceWerkpunt,
  IntelligenceWerkpuntAfhandelstatus,
  WoningDnaSnapshot,
} from "@/types/intelligence";

function valideerWoningId(woningId: number): void {
  if (!Number.isInteger(woningId) || woningId <= 0) {
    throw new Error("Ongeldige woning.");
  }
}

export async function getLaatsteWoningDnaVoorWoning(
  woningId: number,
): Promise<WoningDnaSnapshot | null> {
  valideerWoningId(woningId);

  const { data, error } = await supabase
    .from("woning_dna_snapshots")
    .select("*")
    .eq("woning_id", woningId)
    .order("peildatum", {
      ascending: false,
    })
    .order("berekend_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Woning-DNA ophalen mislukt: ${error.message}`,
    );
  }

  return data as WoningDnaSnapshot | null;
}

export async function handelIntelligenceWerkpuntAf(
  werkpuntId: number,
  status: IntelligenceWerkpuntAfhandelstatus,
  notitie: string,
): Promise<IntelligenceWerkpunt> {
  if (!Number.isInteger(werkpuntId) || werkpuntId <= 0) {
    throw new Error("Ongeldig werkpunt.");
  }

  const schoneNotitie = notitie.trim();

  if (!schoneNotitie) {
    throw new Error("Vul eerst in wat ermee is gedaan.");
  }

  if (schoneNotitie.length > 2000) {
    throw new Error("De afhandelnotitie mag maximaal 2000 tekens bevatten.");
  }

  const { data, error } = await supabase.rpc(
    "handel_intelligence_werkpunt_af",
    {
      p_werkpunt_id: werkpuntId,
      p_status: status,
      p_notitie: schoneNotitie,
    },
  );

  if (error) {
    throw new Error(`Werkpunt afhandelen mislukt: ${error.message}`);
  }

  return data as IntelligenceWerkpunt;
}
