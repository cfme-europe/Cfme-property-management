import {elektriciteitsMeting} from "@/lib/energie/metingen";
import {datumTijd,verschil} from "@/lib/energie/rekenregels";
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
  dagstroom: Verbruikswaarde;
  nachtstroom: Verbruikswaarde;
  elektriciteit: Verbruikswaarde;
  gas: Verbruikswaarde;
  water: Verbruikswaarde;
};

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
      datumTijd(a.opnamedatum) -
      datumTijd(b.opnamedatum)
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
        datumTijd(huidige.opnamedatum) -
        datumTijd(vorige.opnamedatum)
      ) /
        86400000
    );

    if (aantalDagen <= 0 || vorige.woning_id !== huidige.woning_id) {
      continue;
    }

    const aantalWeken = aantalDagen / 7;
    const gemiddeldBewonersAantal =
      (
        vorige.bewoners_aantal +
        huidige.bewoners_aantal
      ) /
      2;

    const dagstroomTotaal = verschil(
      vorige.dagstroom_kwh,
      huidige.dagstroom_kwh
    );
    const nachtstroomTotaal = verschil(
      vorige.nachtstroom_kwh,
      huidige.nachtstroom_kwh
    );
    const elektriciteitTotaal = elektriciteitsMeting(vorige, huidige).waarde;
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
      dagstroom: verbruikswaarde(
        dagstroomTotaal,
        aantalWeken,
        gemiddeldBewonersAantal
      ),
      nachtstroom: verbruikswaarde(
        nachtstroomTotaal,
        aantalWeken,
        gemiddeldBewonersAantal
      ),
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
