import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  Controlebriefing,
  ControlebriefingMetWerkpunten,
  IntelligenceWerkpunt,
  IntelligenceWerkpuntTerugmelding,
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
      .in("status", ["actief", "opgevolgd", "genegeerd"])
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

  const alleWerkpunten =
    (werkpuntenData ?? []) as IntelligenceWerkpunt[];

  const werkpuntIds = alleWerkpunten.map(
    (werkpunt) => werkpunt.id,
  );

  let terugmeldingen: IntelligenceWerkpuntTerugmelding[] = [];

  if (werkpuntIds.length > 0) {
    const { data, error } = await supabase
      .from("intelligence_werkpunt_terugmeldingen")
      .select("*")
      .in("werkpunt_id", werkpuntIds)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(
        `Controleurterugmeldingen ophalen mislukt: ${error.message}`,
      );
    }

    terugmeldingen =
      (data ?? []) as IntelligenceWerkpuntTerugmelding[];
  }

  const werkpunten = alleWerkpunten.filter(
    (werkpunt) => werkpunt.status === "actief",
  );

  const afgehandeldeWerkpunten = alleWerkpunten
    .filter((werkpunt) =>
      ["opgevolgd", "genegeerd"].includes(werkpunt.status),
    )
    .sort((a, b) =>
      (b.afgehandeld_at ?? "").localeCompare(
        a.afgehandeld_at ?? "",
      ),
    );

  werkpunten.sort(
    (a, b) =>
      prioriteitVolgorde[a.prioriteit] -
      prioriteitVolgorde[b.prioriteit]
  );

  return {
    briefing,
    werkpunten,
    afgehandelde_werkpunten: afgehandeldeWerkpunten,
    terugmeldingen,
  };
}
