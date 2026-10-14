"use client";

import { useMemo, useState } from "react";

type Props = {
  vanaf: string;
  totEnMet: string;
  minimum: string;
  maximum: string;
  onWijzigBereik: (vanaf: string, totEnMet: string) => void;
  validationError?: {
    veld: "vanaf" | "tot";
    bericht: string;
  };
};

type DatumveldProps = {
  label: string;
  naam: "vanaf" | "tot";
  parameterNaam?: string;
  waarde: string;
  minimum: string;
  maximum: string;
  wijzig: (waarde: string) => void;
  fout?: string;
};

const maanden = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

function datumdelen(waarde: string) {
  const [jaar, maand, dag] = waarde.split("-").map(Number);
  return { jaar, maand, dag };
}

function isoDatum(jaar: number, maand: number, dag: number) {
  return `${jaar.toString().padStart(4, "0")}-${maand
    .toString()
    .padStart(2, "0")}-${dag.toString().padStart(2, "0")}`;
}

function dagenInMaand(jaar: number, maand: number) {
  return new Date(Date.UTC(jaar, maand, 0)).getUTCDate();
}

function begrensDatum(
  jaar: number,
  maand: number,
  dag: number,
  minimum: string,
  maximum: string,
) {
  const geldigeDag = Math.min(dag, dagenInMaand(jaar, maand));
  const gekozen = isoDatum(jaar, maand, geldigeDag);
  if (gekozen < minimum) return minimum;
  if (gekozen > maximum) return maximum;
  return gekozen;
}

function Datumveld({
  label,
  naam,
  parameterNaam,
  waarde,
  minimum,
  maximum,
  wijzig,
  fout,
}: DatumveldProps) {
  const { jaar, maand, dag } = datumdelen(waarde);
  const minimumJaar = datumdelen(minimum).jaar;
  const maximumJaar = datumdelen(maximum).jaar;
  const jaren = useMemo(
    () =>
      Array.from(
        { length: maximumJaar - minimumJaar + 1 },
        (_, index) => minimumJaar + index,
      ),
    [maximumJaar, minimumJaar],
  );
  const dagen = Array.from(
    { length: dagenInMaand(jaar, maand) },
    (_, index) => index + 1,
  );

  return (
    <fieldset
      className="min-w-0 md:col-span-1 xl:col-span-2"
      aria-invalid={fout ? true : undefined}
      aria-describedby={fout ? `${naam}-fout` : undefined}
    >
      <legend className="mb-1 block text-sm font-semibold">{label}</legend>
      <input type="hidden" name={parameterNaam ?? naam} value={waarde} />
      <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(4.5rem,0.7fr)_minmax(5.5rem,0.8fr)] gap-2">
        <label className="sr-only" htmlFor={`${naam}-maand`}>
          Maand {label.toLowerCase()}
        </label>
        <select
          id={`${naam}-maand`}
          value={maand}
          onChange={(event) =>
            wijzig(
              begrensDatum(jaar, Number(event.target.value), dag, minimum, maximum),
            )
          }
          className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3"
        >
          {maanden.map((maandNaam, index) => (
            <option key={maandNaam} value={index + 1}>
              {maandNaam}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor={`${naam}-dag`}>
          Dag {label.toLowerCase()}
        </label>
        <select
          id={`${naam}-dag`}
          value={dag}
          onChange={(event) =>
            wijzig(
              begrensDatum(jaar, maand, Number(event.target.value), minimum, maximum),
            )
          }
          className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3"
        >
          {dagen.map((dagNummer) => (
            <option key={dagNummer} value={dagNummer}>
              {dagNummer}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor={`${naam}-jaar`}>
          Jaar {label.toLowerCase()}
        </label>
        <select
          id={`${naam}-jaar`}
          value={jaar}
          onChange={(event) =>
            wijzig(
              begrensDatum(Number(event.target.value), maand, dag, minimum, maximum),
            )
          }
          className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3"
        >
          {jaren.map((jaarNummer) => (
            <option key={jaarNummer} value={jaarNummer}>
              {jaarNummer}
            </option>
          ))}
        </select>
      </div>
      {fout && (
        <p id={`${naam}-fout`} role="alert" className="mt-2 text-sm text-rose-800">
          {fout}
        </p>
      )}
    </fieldset>
  );
}

export default function EnergieAnalyseDatumvelden({
  vanaf: oorspronkelijkeVanaf,
  totEnMet: oorspronkelijkeTot,
  minimum,
  maximum,
  onWijzigBereik,
  validationError,
}: Props) {
  const [vanaf, setVanaf] = useState(oorspronkelijkeVanaf);
  const [totEnMet, setTotEnMet] = useState(oorspronkelijkeTot);

  function wijzigVanaf(waarde: string) {
    const nieuweTot = waarde > totEnMet ? waarde : totEnMet;
    setVanaf(waarde);
    if (nieuweTot !== totEnMet) setTotEnMet(nieuweTot);
    onWijzigBereik(waarde, nieuweTot);
  }

  function wijzigTot(waarde: string) {
    const nieuwVanaf = waarde < vanaf ? waarde : vanaf;
    setTotEnMet(waarde);
    if (nieuwVanaf !== vanaf) setVanaf(nieuwVanaf);
    onWijzigBereik(nieuwVanaf, waarde);
  }

  return (
    <>
      <Datumveld
        label="Van"
        naam="vanaf"
        waarde={vanaf}
        minimum={minimum}
        maximum={maximum}
        wijzig={wijzigVanaf}
        fout={
          validationError?.veld === "vanaf"
            ? validationError.bericht
            : undefined
        }
      />
      <Datumveld
        label="Tot en met"
        naam="tot"
        parameterNaam="tot_en_met"
        waarde={totEnMet}
        minimum={minimum}
        maximum={maximum}
        wijzig={wijzigTot}
        fout={
          validationError?.veld === "tot"
            ? validationError.bericht
            : undefined
        }
      />
      <p className="text-sm text-slate-600 md:col-span-2">
        Een analyse kan niet vóór 1 september 2026 beginnen. Latere
        begindatums zijn toegestaan.
      </p>
    </>
  );
}
