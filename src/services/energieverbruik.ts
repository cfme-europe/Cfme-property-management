import type { Meterstand } from "@/types/meterstand";

export type Verbruikswaarde = {
  totaal: number | null;
  per_bewoner_per_week: number | null;
};

export type Verbruiksperiode = {
  van_datum: string;
  tot_datum: string;
  aantal_dagen: number;
  aantal_weken: number;
  gemiddeld_bewoners_aantal: number;
  elektriciteit: Verbruikswaarde;
  gas: Verbruikswaarde;
  water: Verbruikswaarde;
};

function datumNaarTijd(waarde: string): number {
  const [jaar, maand, dag] = waarde
    .split("-")
    .map(Number);

  return Date.UTC(jaar, maand - 1, dag);
}

function verschil(
  beginstand: number | null,
  eindstand: number | null
): number | null {
  if (
    beginstand === null ||
    eindstand === null ||
    eindstand < beginstand
  ) {
    return null;
  }

  return eindstand - beginstand;
}

function verbruikswaarde(
  totaal: number | null,
  aantalWeken: number,
  gemiddeldBewonersAantal: number
): Verbruikswaarde {
  if (
    totaal === null ||
    aantalWeken <= 0 ||
    gemiddeldBewonersAantal <= 0
  ) {
    return {
      totaal,
      per_bewoner_per_week: null,
    };
  }

  return {
    totaal,
    per_bewoner_per_week:
      totaal /
      aantalWeken /
      gemiddeldBewonersAantal,
  };
}

export function berekenVerbruiksperiodes(
  meterstanden: Meterstand[]
): Verbruiksperiode[] {
  const oplopend = [...meterstanden].sort(
    (a, b) =>
      datumNaarTijd(a.opnamedatum) -
      datumNaarTijd(b.opnamedatum)
  );

  const periodes: Verbruiksperiode[] = [];

  for (
    let index = 1;
    index < oplopend.length;
    index += 1
  ) {
    const vorige = oplopend[index - 1];
    const huidige = oplopend[index];

    const aantalDagen = Math.round(
      (
        datumNaarTijd(huidige.opnamedatum) -
        datumNaarTijd(vorige.opnamedatum)
      ) /
        86400000
    );

    if (aantalDagen <= 0) {
      continue;
    }

    const aantalWeken = aantalDagen / 7;
    const gemiddeldBewonersAantal =
      (
        vorige.bewoners_aantal +
        huidige.bewoners_aantal
      ) /
      2;

    const elektriciteitTotaal = verschil(
      vorige.elektriciteit_kwh,
      huidige.elektriciteit_kwh
    );
    const gasTotaal = verschil(
      vorige.gas_m3,
      huidige.gas_m3
    );
    const waterTotaal = verschil(
      vorige.water_m3,
      huidige.water_m3
    );

    if (
      elektriciteitTotaal === null &&
      gasTotaal === null &&
      waterTotaal === null
    ) {
      continue;
    }

    periodes.push({
      van_datum: vorige.opnamedatum,
      tot_datum: huidige.opnamedatum,
      aantal_dagen: aantalDagen,
      aantal_weken: aantalWeken,
      gemiddeld_bewoners_aantal:
        gemiddeldBewonersAantal,
      elektriciteit: verbruikswaarde(
        elektriciteitTotaal,
        aantalWeken,
        gemiddeldBewonersAantal
      ),
      gas: verbruikswaarde(
        gasTotaal,
        aantalWeken,
        gemiddeldBewonersAantal
      ),
      water: verbruikswaarde(
        waterTotaal,
        aantalWeken,
        gemiddeldBewonersAantal
      ),
    });
  }

  return periodes.reverse();
}
