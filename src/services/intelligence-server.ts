import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  Controlebriefing,
  ControlebriefingMetWerkpunten,
  IntelligenceWerkpunt,
} from "@/types/intelligence";

function valideerWoningId(woningId: number): void {
  if (!Number.isInteger(woningId) || woningId <= 0) {
    throw new Error("Ongeldige woning.");
  }
}

export async function getActieveControlebriefingVoorWoning(
  woningId: number
): Promise<ControlebriefingMetWerkpunten | null> {
  valideerWoningId(woningId);

  const supabase = await createClient();

  const { data: briefingData, error: briefingFout } =
    await supabase
      .from("controlebriefings")
      .select("*")
      .eq("woning_id", woningId)
      .eq("status", "actief")
      .order("peildatum", {
        ascending: false,
      })
      .order("gegenereerd_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (briefingFout) {
    throw new Error(
      `Controlebriefing ophalen mislukt: ${briefingFout.message}`
    );
  }

  if (!briefingData) {
    return null;
  }

  const briefing = briefingData as Controlebriefing;

  const { data: werkpuntenData, error: werkpuntenFout } =
    await supabase
      .from("intelligence_werkpunten")
      .select("*")
      .eq("controlebriefing_id", briefing.id)
      .eq("status", "actief")
      .order("prioriteit", {
        ascending: false,
      })
      .order("created_at", {
        ascending: true,
      });

  if (werkpuntenFout) {
    throw new Error(
      `Interne werkpunten ophalen mislukt: ${werkpuntenFout.message}`
    );
  }

  const prioriteitVolgorde = {
    spoed: 0,
    hoog: 1,
    normaal: 2,
    laag: 3,
  } as const;

  const werkpunten =
    (werkpuntenData ?? []) as IntelligenceWerkpunt[];

  werkpunten.sort(
    (a, b) =>
      prioriteitVolgorde[a.prioriteit] -
      prioriteitVolgorde[b.prioriteit]
  );

  return {
    briefing,
    werkpunten,
  };
}
