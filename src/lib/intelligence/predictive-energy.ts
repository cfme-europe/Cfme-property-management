import { berekenVerbruiksperiodes } from "@/services/energieverbruik";
import {
  gemiddelde,
  maakPredictiveBewijs,
  maakPredictiveSignaal,
} from "@/lib/intelligence/predictive-utils";
import type { Meterstand } from "@/types/meterstand";
import type { PredictiveSignaal } from "@/types/predictive-intelligence";

type EnergieDrager = {
  naam: string;
  sleutel:
    | "elektriciteit"
    | "gas"
    | "water";
};

const ENERGIEDRAGERS: EnergieDrager[] = [
  {
    naam: "Elektriciteit",
    sleutel: "elektriciteit",
  },
  {
    naam: "Gas",
    sleutel: "gas",
  },
  {
    naam: "Water",
    sleutel: "water",
  },
];

export function bouwPredictiveEnergieSignaal(
  meterstanden: Meterstand[],
): PredictiveSignaal {
  const gesorteerdeMeterstanden = [
    ...meterstanden,
  ].sort((a, b) =>
    a.opnamedatum.localeCompare(
      b.opnamedatum,
    ),
  );

  const periodes =
    berekenVerbruiksperiodes(
      gesorteerdeMeterstanden,
    );

  const analyses = ENERGIEDRAGERS.map(
    ({ naam, sleutel }) => {
      const bruikbareWaarden = periodes
        .map(
          (periode) =>
            periode[sleutel]
              .per_bewoner_per_week,
        )
        .filter(
          (waarde): waarde is number =>
            waarde !== null &&
            Number.isFinite(waarde) &&
            waarde >= 0,
        );

      const huidigeWaarde =
        bruikbareWaarden.at(-1) ?? null;

      const historischeWaarden =
        bruikbareWaarden.slice(
          Math.max(
            0,
            bruikbareWaarden.length - 7,
          ),
          -1,
        );

      const historischGemiddelde =
        gemiddelde(
          historischeWaarden,
        );

      const afwijkingPercentage =
        huidigeWaarde !== null &&
        historischGemiddelde !== null &&
        historischGemiddelde > 0
          ? (
              (
                huidigeWaarde -
                historischGemiddelde
              ) /
              historischGemiddelde
            ) * 100
          : null;

      return {
        naam,
        huidigeWaarde,
        historischGemiddelde,
        afwijkingPercentage,
        waarnemingen:
          bruikbareWaarden.length,
      };
    },
  );

  const hoogsteAnalyse = [
    ...analyses,
  ].sort(
    (a, b) =>
      (
        b.afwijkingPercentage ??
        Number.NEGATIVE_INFINITY
      ) -
      (
        a.afwijkingPercentage ??
        Number.NEGATIVE_INFINITY
      ),
  )[0];

  const waarnemingen =
    hoogsteAnalyse?.waarnemingen ?? 0;

  const afwijking =
    hoogsteAnalyse
      ?.afwijkingPercentage ?? 0;

  const score = Math.max(
    0,
    Math.min(95, afwijking + 30),
  );

  const heeftVerhoging =
    afwijking >= 20;

  return maakPredictiveSignaal({
    type: "verhoogd_energieverbruik",
    titel: "Verhoogd energieverbruik",
    score,
    waarnemingen,
    minimum: 4,
    berekening:
      "Het laatste verbruik per bewoner per week wordt vergeleken met maximaal zes voorafgaande bruikbare meetperioden van dezelfde woning.",
    signaal: heeftVerhoging
      ? `${
          hoogsteAnalyse?.naam ??
          "Het verbruik"
        } ligt ongeveer ${Math.round(
          afwijking,
        )}% boven het historische gemiddelde van deze woning.`
      : "Geen duidelijke stijgende energieafwijking vastgesteld.",
    advies:
      afwijking >= 35
        ? "Controleer meterstand, installatie, lekkage en bewonersgebruik bij de eerstvolgende controle."
        : "Blijf het verbruik volgen en leg verklaringen voor afwijkingen vast.",
    bewijzen: [
      maakPredictiveBewijs(
        "meterstanden",
        "Bruikbare opeenvolgende verbruiksperioden per bewoner per week",
        waarnemingen,
        gesorteerdeMeterstanden.map(
          (meterstand) =>
            meterstand.opnamedatum,
        ),
      ),
    ],
  });
}
