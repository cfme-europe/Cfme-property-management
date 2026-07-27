import type {
  PredictiveBetrouwbaarheid,
  PredictiveBewijs,
  PredictiveSignaal,
  PredictiveSignaalNiveau,
  PredictiveSignaalType,
} from "@/types/predictive-intelligence";

export type PredictiveFeitRij =
  Record<string, unknown>;

export const DAG_MILLISECONDEN =
  86_400_000;

export const PREDICTIVE_NIVEAU_VOLGORDE: Record<
  PredictiveSignaalNiveau,
  number
> = {
  laag: 1,
  middel: 2,
  hoog: 3,
  kritiek: 4,
};

export function getal(
  waarde: unknown,
): number | null {
  if (
    typeof waarde === "number" &&
    Number.isFinite(waarde)
  ) {
    return waarde;
  }

  if (typeof waarde === "string") {
    const resultaat = Number(
      waarde.replace(",", "."),
    );

    return Number.isFinite(resultaat)
      ? resultaat
      : null;
  }

  return null;
}

export function tekst(
  waarde: unknown,
): string {
  return typeof waarde === "string"
    ? waarde
    : "";
}

export function datumdeel(
  waarde: unknown,
): string | null {
  const resultaat = tekst(waarde).slice(
    0,
    10,
  );

  return /^\d{4}-\d{2}-\d{2}$/.test(
    resultaat,
  )
    ? resultaat
    : null;
}

export function dagenGeleden(
  aantal: number,
): string {
  return new Date(
    Date.now() -
      aantal * DAG_MILLISECONDEN,
  )
    .toISOString()
    .slice(0, 10);
}

export function gemiddelde(
  waarden: number[],
): number | null {
  if (waarden.length === 0) {
    return null;
  }

  return (
    waarden.reduce(
      (totaal, waarde) =>
        totaal + waarde,
      0,
    ) / waarden.length
  );
}

export function percentage(
  teller: number,
  noemer: number,
): number {
  if (noemer <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((teller / noemer) * 100),
  );
}

export function betrouwbaarheid(
  waarnemingen: number,
  minimum: number,
): PredictiveBetrouwbaarheid {
  if (waarnemingen < minimum) {
    return "onvoldoende";
  }

  if (waarnemingen === minimum) {
    return "beperkt";
  }

  if (waarnemingen < minimum * 2) {
    return "redelijk";
  }

  return "hoog";
}

export function niveau(
  score: number,
): PredictiveSignaalNiveau {
  if (score >= 80) {
    return "kritiek";
  }

  if (score >= 60) {
    return "hoog";
  }

  if (score >= 35) {
    return "middel";
  }

  return "laag";
}

export function maakPredictiveBewijs(
  bron: string,
  omschrijving: string,
  aantal: number,
  datums: Array<string | null>,
): PredictiveBewijs {
  const bruikbareDatums = datums
    .filter(
      (datum): datum is string =>
        datum !== null,
    )
    .sort();

  return {
    bron,
    omschrijving,
    aantal_waarnemingen: aantal,
    periode_vanaf:
      bruikbareDatums[0] ?? null,
    periode_tot_en_met:
      bruikbareDatums.at(-1) ?? null,
  };
}

export function maakPredictiveSignaal({
  type,
  titel,
  score,
  waarnemingen,
  minimum,
  berekening,
  signaal,
  advies,
  bewijzen,
}: {
  type: PredictiveSignaalType;
  titel: string;
  score: number;
  waarnemingen: number;
  minimum: number;
  berekening: string;
  signaal: string;
  advies: string;
  bewijzen: PredictiveBewijs[];
}): PredictiveSignaal {
  const voldoendeHistorie =
    waarnemingen >= minimum;

  const afgerondeScore = Math.max(
    0,
    Math.min(100, Math.round(score)),
  );

  return {
    type,
    titel,
    niveau: voldoendeHistorie
      ? niveau(afgerondeScore)
      : "laag",
    score: afgerondeScore,
    waarschijnlijkheid_percentage:
      voldoendeHistorie
        ? Math.max(
            5,
            Math.min(95, afgerondeScore),
          )
        : null,
    betrouwbaarheid: betrouwbaarheid(
      waarnemingen,
      minimum,
    ),
    datadekking_percentage: percentage(
      waarnemingen,
      minimum * 2,
    ),
    voldoende_historie:
      voldoendeHistorie,
    onzekerheid: voldoendeHistorie
      ? "Dit signaal is gebaseerd op historische patronen. De oorzaak en een toekomstige gebeurtenis zijn niet bewezen."
      : `Minimaal ${minimum} bruikbare historische waarnemingen vereist; beschikbaar: ${waarnemingen}.`,
    berekening,
    signaal: voldoendeHistorie
      ? signaal
      : "Nog onvoldoende historie voor een betrouwbaar voorspellend signaal.",
    advies: voldoendeHistorie
      ? advies
      : "Blijf feiten registreren en beoordeel het signaal opnieuw zodra voldoende historie beschikbaar is.",
    bewijzen,
    geen_feitelijke_conclusie: true,
  };
}

export function woningIdUitRij(
  rij: PredictiveFeitRij,
): number | null {
  return getal(rij.woning_id);
}

export function datumUitRij(
  rij: PredictiveFeitRij,
  velden: string[],
): string | null {
  for (const veld of velden) {
    const datum = datumdeel(rij[veld]);

    if (datum) {
      return datum;
    }
  }

  return null;
}

export function rijBinnenPeriode(
  rij: PredictiveFeitRij,
  velden: string[],
  vanaf: string,
): boolean {
  const datum = datumUitRij(
    rij,
    velden,
  );

  return datum !== null &&
    datum >= vanaf;
}

export function rijBevatTerm(
  rij: PredictiveFeitRij,
  termen: string[],
): boolean {
  const inhoud = Object.values(rij)
    .filter(
      (waarde): waarde is string =>
        typeof waarde === "string",
    )
    .join(" ")
    .toLowerCase();

  return termen.some((term) =>
    inhoud.includes(term),
  );
}

export function controletijdUitRij(
  rij: PredictiveFeitRij,
): number | null {
  for (const veld of [
    "gemiddelde_controletijd_minuten",
    "controletijd_minuten",
    "duur_minuten",
  ]) {
    const waarde = getal(rij[veld]);

    if (waarde !== null && waarde > 0) {
      return waarde;
    }
  }

  if (
    typeof rij.gestart_op === "string" &&
    typeof rij.afgerond_op === "string"
  ) {
    const duur =
      (
        new Date(
          rij.afgerond_op,
        ).getTime() -
        new Date(
          rij.gestart_op,
        ).getTime()
      ) / 60_000;

    if (
      Number.isFinite(duur) &&
      duur > 0
    ) {
      return duur;
    }
  }

  return null;
}
