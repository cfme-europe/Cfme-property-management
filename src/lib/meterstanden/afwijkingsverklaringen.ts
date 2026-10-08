import type {
  EnergieAnalyseResultaat,
} from "@/services/energy-intelligence";
import type {
  EnergieAfwijkingsverklaringen,
  MeterstandEnergieDrager,
} from "@/types/meterstand";

export function onverklaardeEnergieDragers(
  analyse: EnergieAnalyseResultaat | null,
  verklaringen: EnergieAfwijkingsverklaringen,
): MeterstandEnergieDrager[] {
  if (!analyse) {
    return [];
  }

  return analyse.dragers
    .filter((drager) =>
      ["verhoogd", "kritiek", "onwaarschijnlijk"].includes(
        drager.status,
      ),
    )
    .map((drager) => drager.drager)
    .filter((drager) => !verklaringen[drager]);
}

export function energieVerbruiksnaam(
  drager: MeterstandEnergieDrager,
): string {
  if (drager === "elektriciteit") {
    return "elektriciteitsverbruik";
  }

  return `${drager}verbruik`;
}
