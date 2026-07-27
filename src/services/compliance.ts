import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ComplianceObjectOptie,
  ComplianceWerkpunt,
  ObjectComplianceRegel,
  WoningComplianceSamenvatting,
} from "@/types/compliance";

function valideerWoningId(woningId: number): void {
  if (!Number.isInteger(woningId) || woningId <= 0) {
    throw new Error("Ongeldige woning.");
  }
}

export async function getComplianceObjectOpties(
  woningId: number
): Promise<ComplianceObjectOptie[]> {
  valideerWoningId(woningId);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("woning_objecten")
    .select(`
      id,
      woning_id,
      ruimte_id,
      object_type,
      naam,
      objectnummer,
      merk,
      model,
      serienummer,
      woning_ruimten!inner(naam)
    `)
    .eq("woning_id", woningId)
    .eq("actief", true)
    .order("loopvolgorde", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(
      `Objecten ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []).map((rij) => {
    const ruimte = Array.isArray(rij.woning_ruimten)
      ? rij.woning_ruimten[0]
      : rij.woning_ruimten;

    return {
      id: rij.id,
      woning_id: rij.woning_id,
      ruimte_id: rij.ruimte_id,
      ruimte_naam: ruimte?.naam ?? "Onbekende ruimte",
      object_type: rij.object_type,
      naam: rij.naam,
      objectnummer: rij.objectnummer,
      merk: rij.merk,
      model: rij.model,
      serienummer: rij.serienummer,
    };
  });
}

export async function getObjectComplianceVoorWoning(
  woningId: number
): Promise<ObjectComplianceRegel[]> {
  valideerWoningId(woningId);

  const supabase = await createClient();

  const { error: synchronisatieFout } =
    await supabase.rpc(
      "synchroniseer_compliance_voor_woning",
      { p_woning_id: woningId }
    );

  if (synchronisatieFout) {
    throw new Error(
      `Compliance synchroniseren mislukt: ${synchronisatieFout.message}`
    );
  }

  const { data, error } = await supabase
    .from("object_compliance_overzicht")
    .select("*")
    .eq("woning_id", woningId)
    .order("ruimte_naam", { ascending: true })
    .order("object_naam", { ascending: true })
    .order("verplichting_naam", { ascending: true });

  if (error) {
    throw new Error(
      `Complianceoverzicht ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as ObjectComplianceRegel[];
}

export async function getWoningComplianceSamenvatting(
  woningId: number
): Promise<WoningComplianceSamenvatting | null> {
  valideerWoningId(woningId);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("woning_compliance_samenvatting")
    .select("*")
    .eq("woning_id", woningId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Compliance-samenvatting ophalen mislukt: ${error.message}`
    );
  }

  return data as WoningComplianceSamenvatting | null;
}


export async function getComplianceWerkpuntenVoorWoning(
  woningId: number
): Promise<ComplianceWerkpunt[]> {
  valideerWoningId(woningId);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("compliance_werkpunten_overzicht")
    .select("*")
    .eq("woning_id", woningId)
    .eq("status", "open")
    .order("deadline", {
      ascending: true,
      nullsFirst: false,
    })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(
      `Compliancewerkpunten ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as ComplianceWerkpunt[];
}
