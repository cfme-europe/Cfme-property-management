import {
  bouwEnergiePortfolioAnalyse,
  type Brondata,
} from "./portfolio-analyse";
import { leesSelectie, type Parameters } from "./selectie";

export function bouwEnergiePeriodeAnalyse(
  bron: Brondata,
  parameters: Parameters,
) {
  const { selectie } = leesSelectie(parameters, bron);
  return {
    selectie,
    analyse: bouwEnergiePortfolioAnalyse(bron, selectie),
  };
}

function csvValue(value: string | number | null | undefined) {
  const raw = value === null ? "" : String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function maakEnergiePeriodeCsv(
  analyse: ReturnType<typeof bouwEnergiePeriodeAnalyse>["analyse"],
) {
  const rows: Array<Array<string | number | null>> = [
    [
      "Type",
      "Pand",
      "Periode vanaf",
      "Periode tot exclusief",
      "Verbruik",
      "Eenheid",
      "Meetdekking procent",
      "Geschatte dagen",
      "Persoonsdagen",
      "Eenheid per persoon per week",
      "Rekenwijze",
      "Meter",
      "Bronperiode vanaf",
      "Bronperiode tot",
      "Bronopname IDs",
      "Register(s)",
      "Gebruikte standen",
      "Bewonersbron",
      "Bezetting bekend",
      "Melding",
    ],
  ];

  for (const row of analyse.rijen) {
    rows.push([
      "Totaal",
      row.adres,
      analyse.selectie.vanaf,
      analyse.selectie.totEnMet,
      row.totaal,
      analyse.eenheid,
      row.dekking_percentage,
      row.geschatte_dagen,
      row.persoonsdagen,
      row.per_persoon_per_week,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      row.meldingen.join("; "),
    ]);
    for (const interval of row.intervallen) {
      const readings = interval.gebruikteStanden
        .map(
          (reading) =>
            `${reading.register}: ${reading.begin ?? "?"} -> ${reading.eind ?? "?"}`,
        )
        .join("; ");
      rows.push([
        interval.betrouwbaar && interval.waarde !== null
          ? "Interval"
          : "Uitgesloten",
        row.adres,
        interval.vanDatum,
        interval.totDatum,
        interval.waarde,
        analyse.eenheid,
        null,
        interval.geschat ? interval.dagen : 0,
        interval.persoonsdagen,
        interval.bezettingBekend && interval.persoonsdagen > 0
          ? interval.waarde === null
            ? null
            : interval.waarde / (interval.persoonsdagen / 7)
          : null,
        interval.rekenwijze,
        interval.meteridentiteit ?? null,
        interval.bronVanaf,
        interval.bronTot,
        interval.bronIds.join(" -> "),
        (interval.bronVelden ?? []).join(", "),
        readings,
        interval.bewonersbron,
        interval.bezettingBekend ? "ja" : "nee",
        interval.meldingen.join("; "),
      ]);
    }
  }

  return `\uFEFF${rows.map((row) => row.map(csvValue).join(";")).join("\r\n")}\r\n`;
}
