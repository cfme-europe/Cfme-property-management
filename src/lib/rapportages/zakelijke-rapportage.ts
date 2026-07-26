import type { JsonWaarde } from "@/types/maandrapportage";

export type JsonObject = Record<string, JsonWaarde>;

export type ZakelijkeVergelijking = {
  sleutel: string;
  label: string;
  huidig: number;
  vorig: number;
  absoluut: number;
  procentueel: number | null;
};

export type ZakelijkEnergieKengetal = {
  sleutel: string;
  label: string;
  eenheid: string;
  totaal: number | null;
  persoonsweken: number;
  per_persoon_per_week: number | null;
  vorige_per_persoon_per_week: number | null;
  afwijking_percentage: number | null;
  signalering:
    | "onvoldoende_data"
    | "normaal"
    | "waarschuwing"
    | "kritiek";
};

export type ZakelijkeRapportageModel = {
  gegenereerd_op: string | null;
  huidige_periode: {
    vanaf: string;
    tot_en_met: string;
  };
  vorige_periode: {
    vanaf: string;
    tot_en_met: string;
  };
  vergelijking: ZakelijkeVergelijking[];
  energie: ZakelijkEnergieKengetal[];
  onvolledige_meetperioden: number;
  kosten: {
    werkelijk: number;
    geschat: number;
    totaal_indicatie: number;
    definitief: boolean;
    per_factuurontvanger: Record<string, number>;
  };
  risico: {
    score: number;
    classificatie: string;
    factoren: string[];
  };
  acties: string[];
  samenvatting: JsonObject;
  inspecties: JsonObject[];
  meldingen: JsonObject[];
  meterstanden: JsonObject[];
  energieverbruik: JsonObject[];
  opmerkingen: string | null;
};

export function zakelijkLabel(
  waarde: string,
): string {
  const labels: Record<string, string> = {
    onvoldoende_data: "Onvoldoende gegevens",
    normaal: "Normaal",
    waarschuwing: "Waarschuwing",
    kritiek: "Kritiek",
    laag: "Laag",
    middel: "Middel",
    hoog: "Hoog",
    spoed: "Spoed",
    open: "Open",
    in_behandeling: "In behandeling",
    opgelost: "Opgelost",
    niet_relevant: "Niet relevant",
    concept: "Concept",
    definitief: "Definitief",
    verzonden: "Verzonden",
    cfme: "CFME",
    hurend_bedrijf: "Hurend bedrijf",
    eigenaar: "Eigenaar",
    nog_te_bepalen: "Nog te bepalen",
    periodiek: "Periodieke inspectie",
    onderhoud: "Onderhoud",
    schade: "Schade",
    veiligheid: "Veiligheid",
    inspectie: "Inspectie",
    overig: "Overig",
  };

  return (
    labels[waarde] ??
    waarde
      .replaceAll("_", " ")
      .replace(/^./, (letter) =>
        letter.toUpperCase(),
      )
  );
}

export function zakelijkVeldlabel(
  waarde: string,
): string {
  const labels: Record<string, string> = {
    id: "Nummer",
    type: "Type",
    titel: "Titel",
    status: "Status",
    categorie: "Categorie",
    opmerkingen: "Opmerkingen",
    inspectiedatum: "Inspectiedatum",
    melddatum: "Melddatum",
    oplosdatum: "Opgelost op",
    oplossing: "Oplossing",
    schade_aanwezig: "Schade aanwezig",
    schade_omschrijving: "Schadeomschrijving",
    uitgevoerd_door: "Uitgevoerd door",
    algemene_toestand: "Algemene toestand",
    orde_netheid_score: "Orde en netheid",
    prioriteit: "Prioriteit",
    factuur_naar: "Factuurontvanger",
    omschrijving: "Omschrijving",
    verantwoordelijke: "Verantwoordelijke",
    extern_referentienummer:
      "Externe referentie",
    opnamedatum: "Opnamedatum",
    bewoners_aantal: "Aantal bewoners",
    dagstroom_kwh: "Dagstroom (kWh)",
    nachtstroom_kwh: "Nachtstroom (kWh)",
    elektriciteit_kwh:
      "Elektriciteit totaal (kWh)",
    gas_m3: "Gas (m³)",
    water_m3: "Water (m³)",
    opgenomen_door: "Opgenomen door",
  };

  return labels[waarde] ?? zakelijkLabel(waarde);
}

export function zakelijkeCelWaarde(
  waarde: JsonWaarde | undefined,
): string | number | boolean {
  if (waarde === null || waarde === undefined) {
    return "";
  }

  if (typeof waarde === "string") {
    return zakelijkLabel(waarde);
  }

  if (
    typeof waarde === "number" ||
    typeof waarde === "boolean"
  ) {
    return waarde;
  }

  return JSON.stringify(waarde);
}

export function alsObject(
  waarde: JsonWaarde | undefined,
): JsonObject | null {
  if (
    waarde === null ||
    waarde === undefined ||
    Array.isArray(waarde) ||
    typeof waarde !== "object"
  ) {
    return null;
  }

  return waarde;
}

export function alsObjecten(
  waarde: JsonWaarde | undefined,
): JsonObject[] {
  if (!Array.isArray(waarde)) {
    return [];
  }

  return waarde
    .map(alsObject)
    .filter(
      (item): item is JsonObject =>
        item !== null,
    );
}

export function tekst(
  object: JsonObject | null,
  sleutel: string,
  standaard = "",
): string {
  const waarde = object?.[sleutel];

  if (
    typeof waarde === "string" ||
    typeof waarde === "number"
  ) {
    return String(waarde);
  }

  if (typeof waarde === "boolean") {
    return waarde ? "Ja" : "Nee";
  }

  return standaard;
}

export function getal(
  object: JsonObject | null,
  sleutel: string,
  standaard = 0,
): number {
  const waarde = object?.[sleutel];

  return typeof waarde === "number"
    ? waarde
    : standaard;
}

export function optioneelGetal(
  object: JsonObject | null,
  sleutel: string,
): number | null {
  const waarde = object?.[sleutel];

  return typeof waarde === "number"
    ? waarde
    : null;
}

function vergelijkingen(
  motor: JsonObject | null,
): ZakelijkeVergelijking[] {
  const vergelijking = alsObject(
    motor?.vergelijking,
  );

  const definities = [
    ["inspecties", "Inspecties"],
    ["meldingen", "Nieuwe meldingen"],
    ["open_meldingen", "Open meldingen"],
    ["afwijkingen", "Controleafwijkingen"],
    ["open_afwijkingen", "Open afwijkingen"],
  ] as const;

  return definities.map(
    ([sleutel, label]) => {
      const item = alsObject(
        vergelijking?.[sleutel],
      );

      return {
        sleutel,
        label,
        huidig: getal(item, "huidig"),
        vorig: getal(item, "vorig"),
        absoluut: getal(item, "absoluut"),
        procentueel: optioneelGetal(
          item,
          "procentueel",
        ),
      };
    },
  );
}

function energieKengetallen(
  motor: JsonObject | null,
): ZakelijkEnergieKengetal[] {
  const energie = alsObject(motor?.energie);

  const definities = [
    ["dagstroom", "Dagstroom", "kWh"],
    ["nachtstroom", "Nachtstroom", "kWh"],
    ["elektriciteit", "Elektriciteit totaal", "kWh"],
    ["gas", "Gas", "m³"],
    ["water", "Water", "m³"],
  ] as const;

  return definities.map(
    ([sleutel, label, eenheid]) => {
      const item = alsObject(energie?.[sleutel]);
      const signalering = tekst(
        item,
        "signalering",
        "onvoldoende_data",
      );

      return {
        sleutel,
        label,
        eenheid,
        totaal: optioneelGetal(item, "totaal"),
        persoonsweken: getal(
          item,
          "persoonsweken",
        ),
        per_persoon_per_week:
          optioneelGetal(
            item,
            "per_persoon_per_week",
          ),
        vorige_per_persoon_per_week:
          optioneelGetal(
            item,
            "vorige_per_persoon_per_week",
          ),
        afwijking_percentage:
          optioneelGetal(
            item,
            "afwijking_percentage",
          ),
        signalering:
          signalering === "normaal" ||
          signalering === "waarschuwing" ||
          signalering === "kritiek"
            ? signalering
            : "onvoldoende_data",
      };
    },
  );
}

function stringLijst(
  waarde: JsonWaarde | undefined,
): string[] {
  if (!Array.isArray(waarde)) {
    return [];
  }

  return waarde.filter(
    (item): item is string =>
      typeof item === "string",
  );
}

function nummerObject(
  waarde: JsonWaarde | undefined,
): Record<string, number> {
  const object = alsObject(waarde);

  if (!object) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(object).filter(
      (
        item,
      ): item is [string, number] =>
        typeof item[1] === "number",
    ),
  );
}

export function bouwZakelijkeRapportageModel(
  data: JsonObject,
): ZakelijkeRapportageModel {
  const motor = alsObject(data.rapportagemotor);
  const huidigePeriode = alsObject(
    motor?.huidige_periode,
  );
  const vorigePeriode = alsObject(
    motor?.vorige_periode,
  );
  const kosten = alsObject(motor?.kosten);
  const risico = alsObject(motor?.risico);
  const energie = alsObject(motor?.energie);

  return {
    gegenereerd_op:
      typeof data.gegenereerd_op === "string"
        ? data.gegenereerd_op
        : null,
    huidige_periode: {
      vanaf: tekst(huidigePeriode, "vanaf"),
      tot_en_met: tekst(
        huidigePeriode,
        "tot_en_met",
      ),
    },
    vorige_periode: {
      vanaf: tekst(vorigePeriode, "vanaf"),
      tot_en_met: tekst(
        vorigePeriode,
        "tot_en_met",
      ),
    },
    vergelijking: vergelijkingen(motor),
    energie: energieKengetallen(motor),
    onvolledige_meetperioden: getal(
      energie,
      "ongeldige_of_onvolledige_meetperioden",
    ),
    kosten: {
      werkelijk: getal(kosten, "werkelijk"),
      geschat: getal(kosten, "geschat"),
      totaal_indicatie: getal(
        kosten,
        "totaal_indicatie",
      ),
      definitief:
        kosten?.definitief === true,
      per_factuurontvanger: nummerObject(
        kosten?.per_factuurontvanger,
      ),
    },
    risico: {
      score: getal(risico, "score"),
      classificatie: tekst(
        risico,
        "classificatie",
        "laag",
      ),
      factoren: stringLijst(
        risico?.factoren,
      ),
    },
    acties: stringLijst(motor?.acties),
    samenvatting:
      alsObject(data.samenvatting) ?? {},
    inspecties: alsObjecten(data.inspecties),
    meldingen: alsObjecten(data.meldingen),
    meterstanden: alsObjecten(data.meterstanden),
    energieverbruik:
      alsObjecten(data.energieverbruik),
    opmerkingen:
      typeof data.opmerkingen === "string"
        ? data.opmerkingen
        : null,
  };
}
