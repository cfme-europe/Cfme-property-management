export type VoorgangerRegister =
  | "dagstroom_kwh"
  | "nachtstroom_kwh"
  | "gas_m3"
  | "water_m3";

export type VoorgangerBron = {
  id: number;
  opnamedatum: string;
  dagstroom_kwh: number | null;
  nachtstroom_kwh: number | null;
  gas_m3: number | null;
  water_m3: number | null;
};

export type Voorgangers = Record<VoorgangerRegister, number | null>;

const REGISTERS: VoorgangerRegister[] = [
  "dagstroom_kwh",
  "nachtstroom_kwh",
  "gas_m3",
  "water_m3",
];

/**
 * Per register de laatste ingevulde stand met een opnamedatum vóór de datum
 * waarop wordt opgenomen. Dit sluit aan op controleer_oplopende_meterstanden,
 * die per kolom de naastliggende standen op datum vergelijkt.
 */
export function bepaalVoorgangers(
  meterstanden: VoorgangerBron[],
  opnamedatum: string,
): Voorgangers {
  const eerdere = meterstanden
    .filter((m) => m.opnamedatum < opnamedatum)
    .sort(
      (a, b) =>
        b.opnamedatum.localeCompare(a.opnamedatum) || b.id - a.id,
    );
  const resultaat = {} as Voorgangers;
  for (const register of REGISTERS) {
    const gevonden = eerdere.find((m) => m[register] !== null);
    resultaat[register] =
      gevonden && gevonden[register] !== null
        ? Number(gevonden[register])
        : null;
  }
  return resultaat;
}

export type RegisterBuren = {
  vorige: { opnamedatum: string; waarde: number } | null;
  volgende: { opnamedatum: string; waarde: number } | null;
};

/**
 * Naastliggende geldige standen van hetzelfde register rond een gekozen opname,
 * met dezelfde datumregels als de databasetrigger (strikt eerder/later).
 */
export function bepaalRegisterBuren(
  meterstanden: VoorgangerBron[],
  meterstandId: number,
  register: VoorgangerRegister,
): RegisterBuren {
  const gekozen = meterstanden.find((m) => m.id === meterstandId);
  if (!gekozen) return { vorige: null, volgende: null };
  const metWaarde = meterstanden.filter(
    (m) => m.id !== meterstandId && m[register] !== null,
  );
  const vorige = metWaarde
    .filter((m) => m.opnamedatum < gekozen.opnamedatum)
    .sort((a, b) => b.opnamedatum.localeCompare(a.opnamedatum))[0];
  const volgende = metWaarde
    .filter((m) => m.opnamedatum > gekozen.opnamedatum)
    .sort((a, b) => a.opnamedatum.localeCompare(b.opnamedatum))[0];
  return {
    vorige: vorige
      ? { opnamedatum: vorige.opnamedatum, waarde: Number(vorige[register]) }
      : null,
    volgende: volgende
      ? { opnamedatum: volgende.opnamedatum, waarde: Number(volgende[register]) }
      : null,
  };
}
