import {
  bepaalEnergieDatumbereik,
  bouwEnergiePortfolioAnalyse,
  type Brondata,
  type EnergieMeterstand,
  type EnergieBewoner,
  type Energiedrager,
  type EnergieVerhuurperiode,
  type Meterconfiguratie,
} from "@/lib/energie/portfolio-analyse";
import { volgendeDag } from "@/lib/energie/rekenregels";
import type { Meterstand } from "@/types/meterstand";

export type Verbruikswaarde = {
  totaal: number | null;
  per_week: number | null;
  per_bewoner_per_week: number | null;
};

export type Verbruiksperiode = {
  woning_id: number;
  van_datum: string;
  tot_datum: string;
  aantal_dagen: number;
  aantal_weken: number;
  gemiddeld_bewoners_aantal: number | null;
  dagstroom: Verbruikswaarde;
  nachtstroom: Verbruikswaarde;
  elektriciteit: Verbruikswaarde;
  gas: Verbruikswaarde;
  water: Verbruikswaarde;
};

const dragers: Energiedrager[] = [
  "dagstroom",
  "nachtstroom",
  "elektriciteit",
  "gas",
  "water",
];

function leegVerbruik(): Verbruikswaarde {
  return { totaal: null, per_week: null, per_bewoner_per_week: null };
}

export function berekenVerbruiksperiodes(
  meterstanden: Meterstand[],
  vanaf?: string,
  totExclusief?: string,
  meterconfiguraties: Meterconfiguratie[] = [],
): Verbruiksperiode[] {
  const bereik = bepaalEnergieDatumbereik(meterstanden);
  if (!bereik) return [];

  const begin = vanaf ?? bereik.vanaf;
  const einde = totExclusief ?? volgendeDag(bereik.totEnMet);
  const woningIds = [...new Set(meterstanden.map((meter) => meter.woning_id))];
  const bron: Brondata = {
    meterstanden: meterstanden.map(
      (meter): EnergieMeterstand => ({
        id: meter.id,
        woning_id: meter.woning_id,
        opnamedatum: meter.opnamedatum,
        bewoners_aantal: meter.bewoners_aantal,
        dagstroom_kwh: meter.dagstroom_kwh,
        nachtstroom_kwh: meter.nachtstroom_kwh,
        elektriciteit_kwh: meter.elektriciteit_kwh,
        gas_m3: meter.gas_m3,
        water_m3: meter.water_m3,
        analyse_status: meter.analyse_status,
        analyse_resultaat: meter.analyse_resultaat,
        opvolging_nodig: meter.opvolging_nodig,
        updated_at: meter.updated_at,
        meteruitzonderingen: meter.meteruitzonderingen,
      }),
    ),
    woningen: woningIds.map((id) => ({
      id,
      adres: "",
      postcode: "",
      plaats: "",
    })),
    bedrijven: [],
    verhuurperioden: [],
    bewoners: [],
    meterconfiguraties,
  };
  const periodes = new Map<string, Verbruiksperiode>();

  for (const drager of dragers) {
    const analyse = bouwEnergiePortfolioAnalyse(bron, {
      niveau: "totaal",
      drager,
      vanaf: begin,
      totEnMet: einde,
      archief: true,
      modus: "schatting",
    });
    for (const rij of analyse.rijen) {
      for (const interval of rij.intervallen) {
        const sleutel = `${interval.woningId}:${interval.vanDatum}:${interval.totDatum}`;
        const periode =
          periodes.get(sleutel) ??
          ({
            woning_id: interval.woningId,
            van_datum: interval.vanDatum,
            tot_datum: interval.totDatum,
            aantal_dagen: interval.dagen,
            aantal_weken: interval.dagen / 7,
            gemiddeld_bewoners_aantal: null,
            dagstroom: leegVerbruik(),
            nachtstroom: leegVerbruik(),
            elektriciteit: leegVerbruik(),
            gas: leegVerbruik(),
            water: leegVerbruik(),
          } satisfies Verbruiksperiode);
        const totaal =
          interval.betrouwbaar && interval.waarde !== null
            ? interval.waarde
            : null;
        periode[drager] = {
          totaal,
          per_week:
            totaal === null || interval.dagen <= 0
              ? null
              : totaal / (interval.dagen / 7),
          per_bewoner_per_week: null,
        };
        periodes.set(sleutel, periode);
      }
    }
  }

  return [...periodes.values()].sort(
    (a, b) =>
      b.tot_datum.localeCompare(a.tot_datum) ||
      b.van_datum.localeCompare(a.van_datum),
  ).filter((periode) =>
    dragers.some((drager) => periode[drager].totaal !== null),
  );
}

export type Bezettingsbron = {
  verhuurperioden: EnergieVerhuurperiode[];
  bewoners: EnergieBewoner[];
};

export type BronInterval = {
  drager: "elektriciteit" | "gas" | "water";
  van_datum: string;
  tot_datum: string;
  dagen: number;
  waarde: number | null;
  persoonsdagen: number;
  bezetting_bekend: boolean;
};

/**
 * Gemeten bronintervallen per drager (tussen twee opnames van dezelfde meter), met
 * persoonsdagen uit de daggeldige bewonersregistraties en verhuurperioden. De
 * bewoners_aantal-snapshot van een opname speelt hierbij geen rol.
 */
export function berekenBronIntervallen(
  meterstanden: Meterstand[],
  totExclusief: string,
  bezetting: Bezettingsbron = { verhuurperioden: [], bewoners: [] },
  meterconfiguraties: Meterconfiguratie[] = [],
): BronInterval[] {
  const bereik = bepaalEnergieDatumbereik(meterstanden);
  if (!bereik) return [];
  const woningIds = [...new Set(meterstanden.map((meter) => meter.woning_id))];
  const bron: Brondata = {
    meterstanden: meterstanden.map(
      (meter): EnergieMeterstand => ({
        id: meter.id,
        woning_id: meter.woning_id,
        opnamedatum: meter.opnamedatum,
        bewoners_aantal: meter.bewoners_aantal,
        dagstroom_kwh: meter.dagstroom_kwh,
        nachtstroom_kwh: meter.nachtstroom_kwh,
        elektriciteit_kwh: meter.elektriciteit_kwh,
        gas_m3: meter.gas_m3,
        water_m3: meter.water_m3,
        analyse_status: meter.analyse_status,
        analyse_resultaat: meter.analyse_resultaat,
        opvolging_nodig: meter.opvolging_nodig,
        updated_at: meter.updated_at,
        meteruitzonderingen: meter.meteruitzonderingen,
      }),
    ),
    woningen: woningIds.map((id) => ({ id, adres: "", postcode: "", plaats: "" })),
    bedrijven: [],
    verhuurperioden: bezetting.verhuurperioden,
    bewoners: bezetting.bewoners,
    meterconfiguraties,
  };
  const resultaat: BronInterval[] = [];
  for (const drager of ["elektriciteit", "gas", "water"] as const) {
    const analyse = bouwEnergiePortfolioAnalyse(bron, {
      niveau: "totaal",
      drager,
      vanaf: bereik.vanaf,
      totEnMet: totExclusief,
      archief: true,
      modus: "schatting",
    });
    const groepen = new Map<string, BronInterval>();
    for (const interval of analyse.rijen.flatMap((rij) => rij.intervallen)) {
      if (interval.geschat) continue;
      const sleutel = `${interval.woningId}:${interval.bronVanaf}:${interval.bronTot}`;
      const waarde =
        interval.betrouwbaar && interval.waarde !== null ? interval.waarde : null;
      const bestaand = groepen.get(sleutel);
      if (!bestaand) {
        groepen.set(sleutel, {
          drager,
          van_datum: interval.bronVanaf,
          tot_datum: interval.bronTot,
          dagen: interval.dagen,
          waarde,
          persoonsdagen: interval.persoonsdagen,
          bezetting_bekend: interval.bezettingBekend,
        });
        continue;
      }
      bestaand.dagen += interval.dagen;
      bestaand.persoonsdagen += interval.persoonsdagen;
      bestaand.bezetting_bekend &&= interval.bezettingBekend;
      bestaand.waarde =
        bestaand.waarde === null || waarde === null
          ? null
          : bestaand.waarde + waarde;
    }
    resultaat.push(...groepen.values());
  }
  return resultaat;
}
