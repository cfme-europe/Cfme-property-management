import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ControleurPlanningSamenvatting,
  PlanningIntelligenceSamenvatting,
  RayonPlanningSamenvatting,
  WoningPlanningIntelligence,
} from "@/types/planning-intelligence";

export async function getPlanningIntelligenceSamenvatting(): Promise<PlanningIntelligenceSamenvatting> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("planning_intelligence_samenvatting")
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Planningsamenvatting ophalen mislukt: ${error.message}`
    );
  }

  return data as PlanningIntelligenceSamenvatting;
}

export async function getWoningPlanningIntelligence(): Promise<
  WoningPlanningIntelligence[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("woning_planning_intelligence")
    .select("*")
    .order("planning_prioriteit", {
      ascending: true,
    })
    .order("volgende_controle_op", {
      ascending: true,
      nullsFirst: false,
    })
    .order("plaats", {
      ascending: true,
    })
    .order("adres", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Woningplanning ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as WoningPlanningIntelligence[];
}

export async function getRayonPlanningSamenvatting(): Promise<
  RayonPlanningSamenvatting[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rayon_planning_samenvatting")
    .select("*")
    .order("achterstallig", {
      ascending: false,
    })
    .order("werkvoorraad_7_dagen", {
      ascending: false,
    })
    .order("rayon_naam", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Rayonbelasting ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as RayonPlanningSamenvatting[];
}

export async function getControleurPlanningSamenvatting(): Promise<
  ControleurPlanningSamenvatting[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("controleur_planning_samenvatting")
    .select("*")
    .order("achterstallig", {
      ascending: false,
    })
    .order("werkvoorraad_7_dagen", {
      ascending: false,
    })
    .order("controleur_naam", {
      ascending: true,
      nullsFirst: false,
    });

  if (error) {
    throw new Error(
      `Controleurbelasting ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as ControleurPlanningSamenvatting[];
}
