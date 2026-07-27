import {
  berekenVerbruiksperiodes,
  type Verbruiksperiode,
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

function dragerWaarde(
  periode: Verbruiksperiode,
  drager: EnergieDrager,
): Verbruikswaarde {
  return periode[drager];
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
  const vorig = aflopend[1];

  if (!huidig || !vorig) {
    return [];
  }

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

  if (
    (
      huidig.dagstroom_kwh !== null &&
      vorig.dagstroom_kwh !== null &&
      huidig.dagstroom_kwh < vorig.dagstroom_kwh
    ) ||
    (
      huidig.nachtstroom_kwh !== null &&
      vorig.nachtstroom_kwh !== null &&
      huidig.nachtstroom_kwh < vorig.nachtstroom_kwh
    )
  ) {
    voegOnwaarschijnlijkToe(
      "elektriciteit",
      "kWh",
      "Elektriciteitsmeterstand is lager dan de vorige opname. Controleer de stand of registreer een meterwissel.",
    );
  }

  if (
    huidig.gas_m3 !== null &&
    vorig.gas_m3 !== null &&
    huidig.gas_m3 < vorig.gas_m3
  ) {
    voegOnwaarschijnlijkToe(
      "gas",
      "m³",
      "Gasmeterstand is lager dan de vorige opname. Controleer de stand of registreer een meterwissel.",
    );
  }

  if (
    huidig.water_m3 !== null &&
    vorig.water_m3 !== null &&
    huidig.water_m3 < vorig.water_m3
  ) {
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
): EnergieAnalyseResultaat {
  const gesorteerd = [...meterstanden].sort(
    (a, b) =>
      datumNaarTijd(b.opnamedatum) -
      datumNaarTijd(a.opnamedatum),
  );

  const teruglopendeMeterstanden =
    detecteerTeruglopendeMeterstanden(gesorteerd);

  if (teruglopendeMeterstanden.length > 0) {
    return {
      status: "onwaarschijnlijk",
      van_datum: gesorteerd[1]?.opnamedatum ?? null,
      tot_datum: gesorteerd[0]?.opnamedatum ?? null,
      aantal_dagen: null,
      bewoners_gemiddeld: null,
      opvolging_nodig: true,
      dragers: teruglopendeMeterstanden,
      samenvatting: teruglopendeMeterstanden
        .map((analyse) => analyse.toelichting)
        .join(" "),
    };
  }

  const periodes =
    berekenVerbruiksperiodes(gesorteerd);

  const huidig = periodes[0];

  if (!huidig) {
    return {
      status: "onvoldoende_data",
      van_datum: null,
      tot_datum: null,
      aantal_dagen: null,
      bewoners_gemiddeld: null,
      opvolging_nodig: false,
      dragers: [],
      samenvatting:
        "Er zijn minimaal twee opeenvolgende meteropnames nodig voor een verbruiksanalyse.",
    };
  }

  const historie = periodes.slice(1);

  const dragers: EnergieDragerAnalyse[] = [
    analyseerDrager(
      "elektriciteit",
      "kWh",
      huidig.elektriciteit,
      historie.map((periode) =>
        dragerWaarde(
          periode,
          "elektriciteit",
        ),
      ),
    ),
    analyseerDrager(
      "gas",
      "m³",
      huidig.gas,
      historie.map((periode) =>
        dragerWaarde(periode, "gas"),
      ),
    ),
    analyseerDrager(
      "water",
      "m³",
      huidig.water,
      historie.map((periode) =>
        dragerWaarde(periode, "water"),
      ),
    ),
  ].filter(
    (analyse) =>
      analyse.verbruik_totaal !== null ||
      analyse.historisch_gemiddelde !== null,
  );

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

  return {
    status,
    van_datum: huidig.van_datum,
    tot_datum: huidig.tot_datum,
    aantal_dagen: huidig.aantal_dagen,
    bewoners_gemiddeld: rond(
      huidig.gemiddeld_bewoners_aantal,
      1,
    ),
    opvolging_nodig: opvolgingNodig,
    dragers,
    samenvatting:
      belangrijkste ||
      "Het verbruik kon worden berekend, maar nog niet betrouwbaar met de woninghistorie worden vergeleken.",
  };
}
