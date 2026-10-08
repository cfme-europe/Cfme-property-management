import "server-only";

import {
  isTechnischeGebruikersId,
  vervangTechnischeOpnemers,
  type ControlesessieOpnemer,
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

  let controlesessies: ControlesessieOpnemer[] = [];
  let inspecties: InspectieOpnemer[] = [];

  if (controlesessieIds.length > 0) {
    const { data, error } = await supabase
      .from("controlesessies")
      .select("id, inspectie_id")
      .in("id", controlesessieIds);

    if (error) {
      throw new Error(
        `Controlesessie voor controleurnaam ophalen mislukt: ${error.message}`,
      );
    }

    controlesessies =
      (data ?? []) as ControlesessieOpnemer[];

    const inspectieIds = [
      ...new Set(
        controlesessies.flatMap((sessie) =>
          sessie.inspectie_id !== null
            ? [sessie.inspectie_id]
            : [],
        ),
      ),
    ];

    if (inspectieIds.length > 0) {
      const { data: inspectiesData, error: inspectiesFout } =
        await supabase
          .from("inspecties")
          .select("id, uitgevoerd_door")
          .in("id", inspectieIds);

      if (inspectiesFout) {
        throw new Error(
          `Naam van controleur ophalen mislukt: ${inspectiesFout.message}`,
        );
      }

      inspecties =
        (inspectiesData ?? []) as InspectieOpnemer[];
    }
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
    controlesessies,
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
