import type { Meterstand } from "@/types/meterstand";

const TECHNISCHE_GEBRUIKERS_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OpnemerProfiel = {
  id: string;
  volledige_naam: string | null;
  email: string | null;
};

export type InspectieOpnemer = {
  id: number;
  uitgevoerd_door: string | null;
};

export type ControlesessieOpnemer = {
  id: number;
  inspectie_id: number | null;
};

function leesbareTekst(
  waarde: string | null | undefined,
): string | null {
  const resultaat = waarde?.trim() ?? "";

  if (
    !resultaat ||
    TECHNISCHE_GEBRUIKERS_ID.test(resultaat)
  ) {
    return null;
  }

  return resultaat;
}

export function isTechnischeGebruikersId(
  waarde: string | null | undefined,
): boolean {
  return TECHNISCHE_GEBRUIKERS_ID.test(
    waarde?.trim() ?? "",
  );
}

export function bepaalOpnemerNaam(
  profiel: Pick<
    OpnemerProfiel,
    "volledige_naam" | "email"
  > | null,
): string | null {
  return (
    leesbareTekst(profiel?.volledige_naam) ??
    leesbareTekst(profiel?.email)
  );
}

export function vervangTechnischeOpnemers(
  meterstanden: Meterstand[],
  controlesessies: ControlesessieOpnemer[],
  inspecties: InspectieOpnemer[],
  profielen: OpnemerProfiel[],
): Meterstand[] {
  const inspectienaamPerId = new Map(
    inspecties.flatMap((inspectie) => {
      const naam = leesbareTekst(
        inspectie.uitgevoerd_door,
      );

      return naam ? [[inspectie.id, naam] as const] : [];
    }),
  );
  const inspectieIdPerSessie = new Map(
    controlesessies.flatMap((sessie) =>
      sessie.inspectie_id !== null
        ? [[sessie.id, sessie.inspectie_id] as const]
        : [],
    ),
  );

  const profielnaamPerId = new Map(
    profielen.flatMap((profiel) => {
      const naam = bepaalOpnemerNaam(profiel);

      return naam
        ? [[profiel.id.toLowerCase(), naam] as const]
        : [];
    }),
  );

  return meterstanden.map((meterstand) => {
    if (
      !isTechnischeGebruikersId(
        meterstand.opgenomen_door,
      )
    ) {
      return meterstand;
    }

    const technischeId =
      meterstand.opgenomen_door?.trim().toLowerCase() ??
      "";
    const inspectienaam =
      meterstand.controlesessie_id !== null &&
      meterstand.controlesessie_id !== undefined
        ? inspectienaamPerId.get(
            inspectieIdPerSessie.get(
              meterstand.controlesessie_id,
            ) ?? 0,
          )
        : null;
    const profielnaam =
      profielnaamPerId.get(technischeId);

    return {
      ...meterstand,
      opgenomen_door:
        inspectienaam ??
        profielnaam ??
        "Onbekende controleur",
    };
  });
}
