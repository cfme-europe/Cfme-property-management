import { supabase } from "@/lib/supabase";
import type {
  WorkflowGebeurtenis,
  WorkflowGebeurtenisInvoer,
  WorkflowStatus,
} from "@/types/workflow";

function valideerOptioneelId(
  waarde: number | null,
  naam: string
): void {
  if (
    waarde !== null &&
    (!Number.isInteger(waarde) || waarde <= 0)
  ) {
    throw new Error(`Ongeldige ${naam}.`);
  }
}

function verplicht(
  waarde: string,
  naam: string
): string {
  const resultaat = waarde.trim();

  if (!resultaat) {
    throw new Error(`${naam} is verplicht.`);
  }

  return resultaat;
}

export async function registreerWorkflowGebeurtenis(
  invoer: WorkflowGebeurtenisInvoer
): Promise<WorkflowGebeurtenis> {
  valideerOptioneelId(invoer.woning_id, "woning");
  valideerOptioneelId(
    invoer.controlesessie_id,
    "controlesessie"
  );
  valideerOptioneelId(invoer.bron_id, "bron");

  const geldig = {
    woning_id: invoer.woning_id,
    controlesessie_id: invoer.controlesessie_id,
    gebeurtenis_type: verplicht(
      invoer.gebeurtenis_type,
      "Gebeurtenistype"
    ),
    bron_type: verplicht(
      invoer.bron_type,
      "Brontype"
    ),
    bron_id: invoer.bron_id,
    prioriteit: invoer.prioriteit,
    deduplicatie_sleutel: verplicht(
      invoer.deduplicatie_sleutel,
      "Deduplicatiesleutel"
    ),
    payload: invoer.payload ?? {},
  };

  const { data, error } = await supabase
    .from("workflow_gebeurtenissen")
    .upsert(geldig, {
      onConflict: "deduplicatie_sleutel",
      ignoreDuplicates: true,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Workflowgebeurtenis registreren mislukt: ${error.message}`
    );
  }

  if (data) {
    return data as WorkflowGebeurtenis;
  }

  const { data: bestaand, error: zoekFout } =
    await supabase
      .from("workflow_gebeurtenissen")
      .select("*")
      .eq(
        "deduplicatie_sleutel",
        geldig.deduplicatie_sleutel
      )
      .single();

  if (zoekFout) {
    throw new Error(
      `Bestaande workflowgebeurtenis ophalen mislukt: ${zoekFout.message}`
    );
  }

  return bestaand as WorkflowGebeurtenis;
}

export async function getOpenWorkflowGebeurtenissen(): Promise<
  WorkflowGebeurtenis[]
> {
  const { data, error } = await supabase
    .from("workflow_gebeurtenissen")
    .select("*")
    .in("status", ["nieuw", "verwerken", "mislukt"])
    .order("prioriteit", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      `Workflowgebeurtenissen ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as WorkflowGebeurtenis[];
}

export async function wijzigWorkflowStatus(
  gebeurtenisId: number,
  status: WorkflowStatus,
  foutmelding: string | null = null
): Promise<WorkflowGebeurtenis> {
  if (
    !Number.isInteger(gebeurtenisId) ||
    gebeurtenisId <= 0
  ) {
    throw new Error("Ongeldige workflowgebeurtenis.");
  }

  const { data, error } = await supabase
    .from("workflow_gebeurtenissen")
    .update({
      status,
      foutmelding:
        status === "mislukt"
          ? foutmelding?.trim() || "Onbekende workflowfout."
          : null,
    })
    .eq("id", gebeurtenisId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Workflowstatus wijzigen mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Workflowgebeurtenis niet gevonden.");
  }

  return data as WorkflowGebeurtenis;
}
