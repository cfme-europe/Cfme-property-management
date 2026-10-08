import "server-only";

import {
  isTechnischeGebruikersId,
  vervangTechnischeOpnemers,
  type InspectieOpnemer,
  type OpnemerProfiel,
} from "@/lib/meterstanden/opgenomen-door";
import { createClient } from "@/lib/supabase/server";
import type { Meterstand } from "@/types/meterstand";

export async function verrijkMeterstandenMetOpnemers(
  meterstanden: Meterstand[],
): Promise<Meterstand[]> {
  const technischeMeterstanden = meterstanden.filter(
    (meterstand) =>
      isTechnischeGebruikersId(
        meterstand.opgenomen_door,
      ),
  );

  if (technischeMeterstanden.length === 0) {
    return meterstanden;
  }

  const controlesessieIds = [
    ...new Set(
      technischeMeterstanden.flatMap((meterstand) =>
        meterstand.controlesessie_id !== null &&
        meterstand.controlesessie_id !== undefined
          ? [meterstand.controlesessie_id]
          : [],
      ),
    ),
  ];
  const profielIds = [
    ...new Set(
      technischeMeterstanden.flatMap((meterstand) => {
        const id = meterstand.opgenomen_door?.trim();
        return id ? [id] : [];
      }),
    ),
  ];
  const supabase = await createClient();

  let inspecties: InspectieOpnemer[] = [];

  if (controlesessieIds.length > 0) {
    const { data, error } = await supabase
      .from("inspecties")
      .select("controlesessie_id, uitgevoerd_door")
      .in("controlesessie_id", controlesessieIds);

    if (error) {
      throw new Error(
        `Naam van controleur ophalen mislukt: ${error.message}`,
      );
    }

    inspecties = (data ?? []) as InspectieOpnemer[];
  }

  const { data: profielenData, error: profielenFout } =
    await supabase
      .from("profiles")
      .select("id, volledige_naam, email")
      .in("id", profielIds);

  if (profielenFout) {
    throw new Error(
      `Profielnaam van controleur ophalen mislukt: ${profielenFout.message}`,
    );
  }

  return vervangTechnischeOpnemers(
    meterstanden,
    inspecties,
    (profielenData ?? []) as OpnemerProfiel[],
  );
}

export async function verrijkMeterstandMetOpnemer(
  meterstand: Meterstand | null,
): Promise<Meterstand | null> {
  if (!meterstand) {
    return null;
  }

  const [verrijkteMeterstand] =
    await verrijkMeterstandenMetOpnemers([meterstand]);

  return verrijkteMeterstand ?? null;
}
