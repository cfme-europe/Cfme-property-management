import type {
  JsonWaarde,
} from "@/types/maandrapportage";

export type ExcelCel =
  | string
  | number
  | boolean;

export type ExcelObject =
  Record<string, JsonWaarde>;

export function excelCel(
  waarde: JsonWaarde | undefined
): ExcelCel {
  if (
    waarde === null ||
    waarde === undefined
  ) {
    return "";
  }

  if (
    typeof waarde === "string" ||
    typeof waarde === "number" ||
    typeof waarde === "boolean"
  ) {
    return waarde;
  }

  return JSON.stringify(waarde);
}

export function objectenNaarMatrix(
  rijen: ExcelObject[]
): ExcelCel[][] {
  if (rijen.length === 0) {
    return [
      ["Geen gegevens beschikbaar"],
    ];
  }

  const kolommen = Array.from(
    new Set(
      rijen.flatMap((rij) =>
        Object.keys(rij)
      )
    )
  );

  if (kolommen.length === 0) {
    return [
      ["Geen gegevens beschikbaar"],
    ];
  }

  return [
    kolommen,
    ...rijen.map((rij) =>
      kolommen.map((kolom) =>
        excelCel(rij[kolom])
      )
    ),
  ];
}

export function normaliseerWerkbladNaam(
  waarde: string,
  terugval = "Rapportblok"
): string {
  const naam = waarde
    .replace(/[\\/?*[\]:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31);

  return naam || terugval;
}

export function uniekeWerkbladNaam(
  waarde: string,
  gebruikteNamen: Set<string>
): string {
  const basis =
    normaliseerWerkbladNaam(waarde);

  let kandidaat = basis;
  let volgnummer = 2;

  while (
    gebruikteNamen.has(
      kandidaat.toLowerCase()
    )
  ) {
    const toevoeging = ` ${volgnummer}`;
    kandidaat =
      basis
        .slice(
          0,
          31 - toevoeging.length
        ) + toevoeging;
    volgnummer += 1;
  }

  gebruikteNamen.add(
    kandidaat.toLowerCase()
  );

  return kandidaat;
}
