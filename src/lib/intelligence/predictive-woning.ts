import { bouwPredictiveEnergieSignaal } from "@/lib/intelligence/predictive-energy";
import {
  PREDICTIVE_NIVEAU_VOLGORDE,
  maakPredictiveBewijs,
  maakPredictiveSignaal,
  woningIdUitRij,
  type PredictiveFeitRij,
} from "@/lib/intelligence/predictive-utils";
import {
  bouwConditieSignaal,
  bouwControletijdSignaal,
  bouwLekkageSignaal,
  bouwOnderhoudSignaal,
  bouwSchadeSignaal,
  type WoningHistorie,
} from "@/lib/intelligence/predictive-woning-signalen";
import type { Meterstand } from "@/types/meterstand";
import type {
  PredictiveSignaal,
  PredictiveSignaalNiveau,
  PredictiveWoning,
} from "@/types/predictive-intelligence";
import type { WoningDnaSnapshot } from "@/types/intelligence";

export type PredictiveWoningBron = {
  id: number;
  adres: string;
  postcode: string;
  plaats: string;
};

export type PredictiveBrondata = {
  dna: WoningDnaSnapshot[];
  inspecties: PredictiveFeitRij[];
  afwijkingen: PredictiveFeitRij[];
  meldingen: PredictiveFeitRij[];
  sessies: PredictiveFeitRij[];
  meterstanden: Meterstand[];
};

function bouwHercontroleSignaal(
  signalen: PredictiveSignaal[],
): PredictiveSignaal {
  const relevanteSignalen =
    signalen.filter(
      (signaal) =>
        signaal.voldoende_historie &&
        PREDICTIVE_NIVEAU_VOLGORDE[
          signaal.niveau
        ] >=
          PREDICTIVE_NIVEAU_VOLGORDE.middel,
    );

  const score = Math.min(
    95,
    relevanteSignalen.reduce(
      (totaal, signaal) =>
        totaal +
        (
          signaal.niveau === "kritiek"
            ? 28
            : signaal.niveau === "hoog"
              ? 20
              : 12
        ),
      10,
    ),
  );

  return maakPredictiveSignaal({
    type: "prioriteit_hercontrole",
    titel: "Prioriteit voor hercontrole",
    score,
    waarnemingen:
      relevanteSignalen.length,
    minimum: 2,
    berekening:
      "Gewogen combinatie van minimaal twee onafhankelijke, voldoende onderbouwde predictieve signalen.",
    signaal:
      "Meerdere onafhankelijke signalen verhogen mogelijk de prioriteit voor een gerichte hercontrole.",
    advies:
      "Plan een gerichte controle en toon de gebruikte signalen vooraf in de controlebriefing.",
    bewijzen: [
      maakPredictiveBewijs(
        "Predictive Intelligence",
        "Voldoende onderbouwde middelhoge, hoge of kritieke signalen",
        relevanteSignalen.length,
        [],
      ),
    ],
  });
}

export function analyseerPredictiveWoning(
  woning: PredictiveWoningBron,
  brondata: PredictiveBrondata,
): PredictiveWoning {
  const historie: WoningHistorie = {
    dna: brondata.dna
      .filter(
        (rij) =>
          rij.woning_id === woning.id,
      )
      .sort((a, b) =>
        a.peildatum.localeCompare(
          b.peildatum,
        ),
      ),

    inspecties:
      brondata.inspecties.filter(
        (rij) =>
          woningIdUitRij(rij) ===
          woning.id,
      ),

    afwijkingen:
      brondata.afwijkingen.filter(
        (rij) =>
          woningIdUitRij(rij) ===
          woning.id,
      ),

    meldingen:
      brondata.meldingen.filter(
        (rij) =>
          woningIdUitRij(rij) ===
          woning.id,
      ),

    sessies:
      brondata.sessies.filter(
        (rij) =>
          woningIdUitRij(rij) ===
          woning.id,
      ),
  };

  const meterstanden =
    brondata.meterstanden.filter(
      (rij) =>
        rij.woning_id === woning.id,
    );

  const basissignalen: PredictiveSignaal[] =
    [
      bouwLekkageSignaal(historie),
      bouwSchadeSignaal(historie),
      bouwPredictiveEnergieSignaal(
        meterstanden,
      ),
      bouwControletijdSignaal(
        historie,
      ),
      bouwConditieSignaal(historie),
      bouwOnderhoudSignaal(historie),
    ];

  const signalen = [
    ...basissignalen,
    bouwHercontroleSignaal(
      basissignalen,
    ),
  ];

  const hoogsteNiveau =
    signalen.reduce<PredictiveSignaalNiveau>(
      (hoogste, signaal) =>
        PREDICTIVE_NIVEAU_VOLGORDE[
          signaal.niveau
        ] >
        PREDICTIVE_NIVEAU_VOLGORDE[
          hoogste
        ]
          ? signaal.niveau
          : hoogste,
      "laag",
    );

  const prioriteitScore = Math.min(
    100,
    signalen.reduce(
      (totaal, signaal) =>
        totaal +
        (
          !signaal.voldoende_historie
            ? 0
            : signaal.niveau ===
                "kritiek"
              ? 30
              : signaal.niveau ===
                  "hoog"
                ? 20
                : signaal.niveau ===
                    "middel"
                  ? 10
                  : 2
        ),
      0,
    ),
  );

  return {
    woning_id: woning.id,
    adres: woning.adres,
    postcode: woning.postcode,
    plaats: woning.plaats,
    prioriteit_score:
      prioriteitScore,
    hoogste_niveau:
      hoogsteNiveau,
    voldoende_historie:
      signalen.some(
        (signaal) =>
          signaal.voldoende_historie,
      ),
    signalen: signalen.sort(
      (a, b) =>
        PREDICTIVE_NIVEAU_VOLGORDE[
          b.niveau
        ] -
          PREDICTIVE_NIVEAU_VOLGORDE[
            a.niveau
          ] ||
        b.score - a.score,
    ),
  };
}
