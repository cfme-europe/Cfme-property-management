import {
  alsObject,
  alsObjecten,
  bouwZakelijkeRapportageModel,
  tekst,
  type JsonObject,
} from "@/lib/rapportages/zakelijke-rapportage";
import type { JsonWaarde } from "@/types/maandrapportage";

export const KLANTWAARDE_WEERGAVE =
  "klantwaarde_2_paginas";

export type KlantwaardeOplossing = {
  titel: string;
  melddatum: string;
  oplosdatum: string;
  doorlooptijd_dagen: number;
  oplossing: string;
};

export type KlantwaardeRapportage = {
  ontvangen: number;
  opgelost: number;
  open_einde_periode: number;
  oplossingspercentage: number | null;
  gemiddelde_oplostijd_dagen: number | null;
  dezelfde_dag_opgelost: number;
  inspecties: number;
  oplossingen: KlantwaardeOplossing[];
  meerwaarde: string[];
  energie: Array<{
    sleutel: string;
    label: string;
    eenheid: string;
    huidig: number | null;
    vorig: number | null;
    verschil_percentage: number | null;
    signalering: string;
  }>;
};

function datumGetal(waarde: string): number | null {
  const tijd = Date.parse(`${waarde}T00:00:00Z`);
  return Number.isNaN(tijd) ? null : tijd;
}

function dagenTussen(vanaf: string, tot: string): number | null {
  const begin = datumGetal(vanaf);
  const einde = datumGetal(tot);

  if (begin === null || einde === null || einde < begin) {
    return null;
  }

  return Math.round((einde - begin) / 86_400_000);
}

export function isKlantwaardeRapportage(
  data: Record<string, JsonWaarde>,
): boolean {
  return (
    tekst(alsObject(data.template), "weergave") ===
    KLANTWAARDE_WEERGAVE
  );
}

export function bouwKlantwaardeRapportage(
  data: Record<string, JsonWaarde>,
): KlantwaardeRapportage {
  const periode = alsObject(data.rapportperiode);
  const vanaf = tekst(periode, "vanaf");
  const totEnMet = tekst(periode, "tot_en_met");
  const meldingen = alsObjecten(data.meldingen);
  const inspecties = alsObjecten(data.inspecties).length;
  const zakelijkeModel = bouwZakelijkeRapportageModel(data);

  const ontvangen = meldingen.filter((melding) => {
    const melddatum = tekst(melding, "melddatum");
    return melddatum >= vanaf && melddatum <= totEnMet;
  }).length;

  const opgelosteMeldingen = meldingen
    .map((melding): (JsonObject & { doorlooptijd: number }) | null => {
      const melddatum = tekst(melding, "melddatum");
      const oplosdatum = tekst(melding, "oplosdatum");
      const doorlooptijd = dagenTussen(melddatum, oplosdatum);

      if (
        doorlooptijd === null ||
        oplosdatum < vanaf ||
        oplosdatum > totEnMet
      ) {
        return null;
      }

      return { ...melding, doorlooptijd };
    })
    .filter(
      (
        melding,
      ): melding is JsonObject & { doorlooptijd: number } =>
        melding !== null,
    );

  const openEindePeriode = meldingen.filter((melding) => {
    const melddatum = tekst(melding, "melddatum");
    const oplosdatum = tekst(melding, "oplosdatum");
    return (
      melddatum <= totEnMet &&
      (!oplosdatum || oplosdatum > totEnMet)
    );
  }).length;

  const totaleDoorlooptijd = opgelosteMeldingen.reduce(
    (totaal, melding) => totaal + melding.doorlooptijd,
    0,
  );
  const gemiddeldeOplostijd = opgelosteMeldingen.length
    ? Math.round(
        (totaleDoorlooptijd / opgelosteMeldingen.length) * 10,
      ) / 10
    : null;
  const dezelfdeDag = opgelosteMeldingen.filter(
    (melding) => melding.doorlooptijd === 0,
  ).length;
  const afgewikkeld = opgelosteMeldingen.length + openEindePeriode;
  const oplossingspercentage = afgewikkeld
    ? Math.round((opgelosteMeldingen.length / afgewikkeld) * 100)
    : null;

  const oplossingen = opgelosteMeldingen
    .sort((a, b) =>
      tekst(b, "oplosdatum").localeCompare(
        tekst(a, "oplosdatum"),
      ),
    )
    .slice(0, 6)
    .map((melding) => ({
      titel: tekst(melding, "titel", "Probleem"),
      melddatum: tekst(melding, "melddatum"),
      oplosdatum: tekst(melding, "oplosdatum"),
      doorlooptijd_dagen: melding.doorlooptijd,
      oplossing: tekst(
        melding,
        "oplossing",
        "Oplossing geregistreerd",
      ),
    }));

  const meerwaarde: string[] = [];
  if (inspecties > 0) {
    meerwaarde.push(
      `${inspecties} inspectie${inspecties === 1 ? "" : "s"} uitgevoerd voor vroegtijdige signalering.`,
    );
  }
  if (opgelosteMeldingen.length > 0) {
    meerwaarde.push(
      `${opgelosteMeldingen.length} probleem${opgelosteMeldingen.length === 1 ? "" : "en"} aantoonbaar opgelost.`,
    );
  }
  if (dezelfdeDag > 0) {
    meerwaarde.push(
      `${dezelfdeDag} probleem${dezelfdeDag === 1 ? "" : "en"} op dezelfde dag opgelost.`,
    );
  }
  if (openEindePeriode === 0 && afgewikkeld > 0) {
    meerwaarde.push(
      "Geen openstaande problemen aan het einde van de rapportmaand.",
    );
  }
  if (meerwaarde.length === 0) {
    meerwaarde.push(
      "De maand is gemonitord; er waren geen aantoonbare interventies om te rapporteren.",
    );
  }

  return {
    ontvangen,
    opgelost: opgelosteMeldingen.length,
    open_einde_periode: openEindePeriode,
    oplossingspercentage,
    gemiddelde_oplostijd_dagen: gemiddeldeOplostijd,
    dezelfde_dag_opgelost: dezelfdeDag,
    inspecties,
    oplossingen,
    meerwaarde,
    energie: zakelijkeModel.energie
      .filter((item) =>
        ["elektriciteit", "gas", "water"].includes(
          item.sleutel,
        ),
      )
      .map((item) => ({
        sleutel: item.sleutel,
        label: item.label,
        eenheid: item.eenheid,
        huidig: item.per_persoon_per_week,
        vorig: item.vorige_per_persoon_per_week,
        verschil_percentage: item.afwijking_percentage,
        signalering: item.signalering,
      })),
  };
}
