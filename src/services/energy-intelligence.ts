import type { Meterconfiguratie } from "@/lib/energie/portfolio-analyse";
import {
  berekenBronIntervallen,
  type Bezettingsbron,
  type BronInterval,
  type Verbruikswaarde,
} from "@/services/energieverbruik";
import type { Meterstand } from "@/types/meterstand";

export const ENERGIE_ANALYSE_STATUSSEN = [
  "onvoldoende_data",
  "normaal",
  "verhoogd",
  "kritiek",
  "onwaarschijnlijk",
] as const;

export type EnergieAnalyseStatus =
  (typeof ENERGIE_ANALYSE_STATUSSEN)[number];

export const ENERGIE_VERKLARING_CODES = [
  "meer_bewoners_of_bezoekers",
  "koude_periode",
  "extra_verwarming",
  "lekkage_vermoed",
  "installatie_defect",
  "meterstand_verkeerd",
  "ander_gebruik",
  "geen_verklaring",
  "overig",
] as const;

export type EnergieVerklaringCode =
  (typeof ENERGIE_VERKLARING_CODES)[number];

export type EnergieDrager =
  | "elektriciteit"
  | "gas"
  | "water";

export type EnergieDragerAnalyse = {
  drager: EnergieDrager;
  eenheid: "kWh" | "m³";
  status: EnergieAnalyseStatus;
  verbruik_totaal: number | null;
  per_bewoner_per_week: number | null;
  historisch_gemiddelde: number | null;
  afwijking_percentage: number | null;
  referentie_periodes: number;
  toelichting: string;
  // Bronperiode van de gemeten waarde en de persoonsdagen waarmee is genormaliseerd.
  van_datum?: string;
  tot_datum?: string;
  aantal_dagen?: number;
  persoonsdagen?: number | null;
};

export type EnergieAnalyseResultaat = {
  status: EnergieAnalyseStatus;
  van_datum: string | null;
  tot_datum: string | null;
  aantal_dagen: number | null;
  bewoners_gemiddeld: number | null;
  opvolging_nodig: boolean;
  dragers: EnergieDragerAnalyse[];
  samenvatting: string;
};

const STATUS_VOLGORDE: Record<
  EnergieAnalyseStatus,
  number
> = {
  onvoldoende_data: 0,
  normaal: 1,
  verhoogd: 2,
  kritiek: 3,
  onwaarschijnlijk: 4,
};

function rond(
  waarde: number | null,
  decimalen = 2,
): number | null {
  if (waarde === null || !Number.isFinite(waarde)) {
    return null;
  }

  const factor = 10 ** decimalen;
  return Math.round(waarde * factor) / factor;
}

function gemiddelde(waarden: number[]): number | null {
  if (waarden.length === 0) {
    return null;
  }

  return (
    waarden.reduce(
      (totaal, waarde) => totaal + waarde,
      0,
    ) / waarden.length
  );
}

function afwijkingPercentage(
  huidig: number,
  gemiddeld: number,
): number | null {
  if (gemiddeld <= 0) {
    return null;
  }

  return ((huidig - gemiddeld) / gemiddeld) * 100;
}

function bepaalStatus(
  huidig: number | null,
  historischGemiddelde: number | null,
  totaal: number | null,
): EnergieAnalyseStatus {
  if (totaal !== null && totaal < 0) {
    return "onwaarschijnlijk";
  }

  if (
    huidig === null ||
    historischGemiddelde === null
  ) {
    return "onvoldoende_data";
  }

  const afwijking = afwijkingPercentage(
    huidig,
    historischGemiddelde,
  );

  if (afwijking === null) {
    return "onvoldoende_data";
  }

  if (afwijking >= 100) {
    return "onwaarschijnlijk";
  }

  if (afwijking >= 35) {
    return "kritiek";
  }

  if (afwijking >= 20) {
    return "verhoogd";
  }

  return "normaal";
}

function maakToelichting(
  status: EnergieAnalyseStatus,
  drager: EnergieDrager,
  afwijking: number | null,
): string {
  const naam =
    drager === "elektriciteit"
      ? "Elektriciteitsverbruik"
      : drager === "gas"
        ? "Gasverbruik"
        : "Waterverbruik";

  if (status === "onvoldoende_data") {
    return `${naam}: nog onvoldoende historische gegevens voor een betrouwbare vergelijking.`;
  }

  if (status === "onwaarschijnlijk") {
    return `${naam}: de ingevoerde stand of het berekende verbruik lijkt onwaarschijnlijk en moet worden gecontroleerd.`;
  }

  if (afwijking === null) {
    return `${naam}: geen afwijkingspercentage beschikbaar.`;
  }

  const percentage = Math.abs(Math.round(afwijking));

  if (status === "kritiek") {
    return `${naam}: ${percentage}% boven het historische gemiddelde van deze woning.`;
  }

  if (status === "verhoogd") {
    return `${naam}: ${percentage}% boven het historische gemiddelde van deze woning.`;
  }

  if (afwijking < -20) {
    return `${naam}: ${percentage}% lager dan het historische gemiddelde van deze woning.`;
  }

  return `${naam}: binnen de normale bandbreedte van deze woning.`;
}

function analyseerDrager(
  drager: EnergieDrager,
  eenheid: "kWh" | "m³",
  huidigeWaarde: Verbruikswaarde,
  historischeWaarden: Verbruikswaarde[],
): EnergieDragerAnalyse {
  const bruikbareHistorie = historischeWaarden
    .map((waarde) => waarde.per_bewoner_per_week)
    .filter(
      (waarde): waarde is number =>
        waarde !== null &&
        Number.isFinite(waarde) &&
        waarde >= 0,
    )
    .slice(0, 6);

  const historischGemiddelde =
    gemiddelde(bruikbareHistorie);

  const huidig =
    huidigeWaarde.per_bewoner_per_week;

  const status = bepaalStatus(
    huidig,
    historischGemiddelde,
    huidigeWaarde.totaal,
  );

  const afwijking =
    huidig !== null &&
    historischGemiddelde !== null
      ? afwijkingPercentage(
          huidig,
          historischGemiddelde,
        )
      : null;

  return {
    drager,
    eenheid,
    status,
    verbruik_totaal: rond(
      huidigeWaarde.totaal,
      3,
    ),
    per_bewoner_per_week: rond(huidig, 3),
    historisch_gemiddelde: rond(
      historischGemiddelde,
      3,
    ),
    afwijking_percentage: rond(afwijking, 1),
    referentie_periodes: bruikbareHistorie.length,
    toelichting: maakToelichting(
      status,
      drager,
      afwijking,
    ),
  };
}

function hoogsteStatus(
  analyses: EnergieDragerAnalyse[],
): EnergieAnalyseStatus {
  return analyses.reduce<EnergieAnalyseStatus>(
    (hoogste, analyse) =>
      STATUS_VOLGORDE[analyse.status] >
      STATUS_VOLGORDE[hoogste]
        ? analyse.status
        : hoogste,
    "onvoldoende_data",
  );
}

function datumNaarTijd(datum: string): number {
  const [jaar, maand, dag] = datum
    .split("-")
    .map(Number);

  return Date.UTC(jaar, maand - 1, dag);
}

function detecteerTeruglopendeMeterstanden(
  meterstanden: Meterstand[],
): EnergieDragerAnalyse[] {
  const aflopend = [...meterstanden].sort(
    (a, b) =>
      datumNaarTijd(b.opnamedatum) -
      datumNaarTijd(a.opnamedatum),
  );

  const huidig = aflopend[0];

  if (!huidig || aflopend.length < 2) {
    return [];
  }

  // Per register vergelijken met de eerstvolgende eerdere opname die dat register heeft.
  const vorigVoor = (
    register:
      | "dagstroom_kwh"
      | "nachtstroom_kwh"
      | "gas_m3"
      | "water_m3",
  ) =>
    huidig[register] === null
      ? null
      : (aflopend
          .slice(1)
          .find((rij) => rij[register] !== null)?.[register] ?? null);

  const analyses: EnergieDragerAnalyse[] = [];

  const voegOnwaarschijnlijkToe = (
    drager: EnergieDrager,
    eenheid: "kWh" | "m³",
    toelichting: string,
  ) => {
    analyses.push({
      drager,
      eenheid,
      status: "onwaarschijnlijk",
      verbruik_totaal: null,
      per_bewoner_per_week: null,
      historisch_gemiddelde: null,
      afwijking_percentage: null,
      referentie_periodes: 0,
      toelichting,
    });
  };

  const lager = (
    register:
      | "dagstroom_kwh"
      | "nachtstroom_kwh"
      | "gas_m3"
      | "water_m3",
  ) => {
    const vorig = vorigVoor(register);
    return (
      vorig !== null &&
      (huidig[register] as number) < vorig
    );
  };

  if (lager("dagstroom_kwh") || lager("nachtstroom_kwh")) {
    voegOnwaarschijnlijkToe(
      "elektriciteit",
      "kWh",
      "Elektriciteitsmeterstand is lager dan de vorige opname. Controleer de stand of registreer een meterwissel.",
    );
  }

  if (lager("gas_m3")) {
    voegOnwaarschijnlijkToe(
      "gas",
      "m³",
      "Gasmeterstand is lager dan de vorige opname. Controleer de stand of registreer een meterwissel.",
    );
  }

  if (lager("water_m3")) {
    voegOnwaarschijnlijkToe(
      "water",
      "m³",
      "Watermeterstand is lager dan de vorige opname. Controleer de stand of registreer een meterwissel.",
    );
  }

  return analyses;
}

export function analyseerMeterstanden(
  meterstanden: Meterstand[],
  bezetting?: Bezettingsbron,
  meterconfiguraties: Meterconfiguratie[] = [],
): EnergieAnalyseResultaat {
  const gesorteerd = [...meterstanden].sort(
    (a, b) =>
      datumNaarTijd(b.opnamedatum) -
      datumNaarTijd(a.opnamedatum),
  );

  const teruglopendeMeterstanden =
    detecteerTeruglopendeMeterstanden(gesorteerd);

  const laatsteDatum = gesorteerd[0]?.opnamedatum;
  const intervallen = gesorteerd.length
    ? berekenBronIntervallen(
        gesorteerd,
        laatsteDatum,
        bezetting,
        meterconfiguraties,
      )
    : [];

  // Persoonsdagen komen uit de daggeldige bewonersregistraties en verhuurperioden; onbekende
  // bezetting blijft onbekend (geen normalisatie), het gemeten verbruik blijft beschikbaar.
  const naarVerbruik = (interval: BronInterval): Verbruikswaarde => {
    const perWeek =
      interval.waarde !== null && interval.dagen > 0
        ? interval.waarde / (interval.dagen / 7)
        : null;
    return {
      totaal: interval.waarde,
      per_week: perWeek,
      per_bewoner_per_week:
        interval.waarde !== null &&
        interval.bezetting_bekend &&
        interval.persoonsdagen > 0
          ? interval.waarde / (interval.persoonsdagen / 7)
          : null,
    };
  };

  const DRAGERS: { drager: EnergieDrager; eenheid: "kWh" | "m³" }[] = [
    { drager: "elektriciteit", eenheid: "kWh" },
    { drager: "gas", eenheid: "m³" },
    { drager: "water", eenheid: "m³" },
  ];
  // Per drager het bronframe dat op de laatste opname eindigt; een interval van een andere drager
  // (bijvoorbeeld gas-only) mag dit niet vervangen.
  const actueel = DRAGERS.flatMap(({ drager, eenheid }) => {
    const eigen = intervallen
      .filter((interval) => interval.drager === drager)
      .sort((a, b) => b.tot_datum.localeCompare(a.tot_datum));
    const huidig = eigen.find(
      (interval) =>
        interval.tot_datum === laatsteDatum && interval.waarde !== null,
    );
    return huidig ? [{ drager, eenheid, interval: huidig, eigen }] : [];
  });

  const heeftTerugloop = teruglopendeMeterstanden.length > 0;
  const terugloopResultaat = (
    onafhankelijk: EnergieDragerAnalyse[],
  ): EnergieAnalyseResultaat => {
    const dragers = [...teruglopendeMeterstanden, ...onafhankelijk];
    return {
      status: "onwaarschijnlijk",
      van_datum: gesorteerd[1]?.opnamedatum ?? null,
      tot_datum: laatsteDatum ?? null,
      aantal_dagen: null,
      bewoners_gemiddeld: null,
      opvolging_nodig: true,
      dragers,
      samenvatting: dragers
        .filter((analyse) => analyse.status !== "normaal")
        .map((analyse) => analyse.toelichting)
        .join(" "),
    };
  };

  if (actueel.length === 0) {
    if (heeftTerugloop) {
      return terugloopResultaat([]);
    }
    return {
      status: "onvoldoende_data",
      van_datum: null,
      tot_datum: null,
      aantal_dagen: null,
      bewoners_gemiddeld: null,
      opvolging_nodig: false,
      dragers: [],
      samenvatting:
        "Geen bruikbaar interval bij de laatste opname. Controleer ontbrekende standen; een oudere analyse wordt niet als actueel getoond.",
    };
  }

  const dragers: EnergieDragerAnalyse[] = actueel
    .map(({ drager, eenheid, interval, eigen }) => ({
      ...analyseerDrager(
        drager,
        eenheid,
        naarVerbruik(interval),
        eigen
          .filter((kandidaat) => kandidaat.tot_datum <= interval.van_datum)
          .map(naarVerbruik),
      ),
      van_datum: interval.van_datum,
      tot_datum: interval.tot_datum,
      aantal_dagen: interval.dagen,
      persoonsdagen: interval.bezetting_bekend ? interval.persoonsdagen : null,
    }))
    .filter(
      (analyse) =>
        analyse.verbruik_totaal !== null ||
        analyse.historisch_gemiddelde !== null,
    );

  if (heeftTerugloop) {
    const geblokkeerd = new Set(
      teruglopendeMeterstanden.map((analyse) => analyse.drager),
    );
    return terugloopResultaat(
      dragers.filter((analyse) => !geblokkeerd.has(analyse.drager)),
    );
  }

  const status = hoogsteStatus(dragers);

  const opvolgingNodig = [
    "verhoogd",
    "kritiek",
    "onwaarschijnlijk",
  ].includes(status);

  const belangrijkste =
    dragers
      .filter(
        (analyse) =>
          analyse.status === status,
      )
      .map((analyse) => analyse.toelichting)
      .join(" ");

  // Datums van het interval van de drager die de totaalstatus bepaalt (bij gelijke status: eerste drager).
  const bepalend =
    dragers.find((analyse) => analyse.status === status)?.drager;
  const gekozen = (
    actueel.find((item) => item.drager === bepalend) ?? actueel[0]
  ).interval;

  return {
    status,
    van_datum: gekozen.van_datum,
    tot_datum: gekozen.tot_datum,
    aantal_dagen: gekozen.dagen,
    bewoners_gemiddeld:
      gekozen.bezetting_bekend && gekozen.dagen > 0
        ? rond(gekozen.persoonsdagen / gekozen.dagen, 1)
        : null,
    opvolging_nodig: opvolgingNodig,
    dragers,
    samenvatting:
      belangrijkste ||
      "Het verbruik kon worden berekend, maar nog niet betrouwbaar met de woninghistorie worden vergeleken.",
  };
}
