"use client";

import { useRef, useState } from "react";

type Props = {
  vanaf: string;
  totEnMet: string;
  minimum: string;
  maximum: string;
};

type DatumveldProps = {
  label: string;
  naam: "vanaf" | "tot";
  waarde: string;
  minimum: string;
  maximum: string;
  wijzig: (waarde: string) => void;
};

function Datumveld({
  label,
  naam,
  waarde,
  minimum,
  maximum,
  wijzig,
}: DatumveldProps) {
  const invoer = useRef<HTMLInputElement>(null);

  function openDatumkiezer() {
    const element = invoer.current;
    if (!element) return;

    if (typeof element.showPicker === "function") {
      element.showPicker();
      return;
    }

    element.focus();
    element.click();
  }

  return (
    <label>
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      <span className="flex overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-emerald-600">
        <input
          ref={invoer}
          required
          type="date"
          name={naam}
          value={waarde}
          min={minimum}
          max={maximum}
          onChange={(event) => wijzig(event.target.value)}
          className="min-w-0 flex-1 border-0 bg-white px-3 py-3 outline-none"
        />
        <button
          type="button"
          onClick={openDatumkiezer}
          className="shrink-0 border-l border-slate-300 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          aria-label={`${label} kiezen`}
        >
          Kies datum
        </button>
      </span>
    </label>
  );
}

export default function EnergieAnalyseDatumvelden({
  vanaf: oorspronkelijkeVanaf,
  totEnMet: oorspronkelijkeTot,
  minimum,
  maximum,
}: Props) {
  const [vanaf, setVanaf] = useState(oorspronkelijkeVanaf);
  const [totEnMet, setTotEnMet] = useState(oorspronkelijkeTot);

  function wijzigVanaf(waarde: string) {
    setVanaf(waarde);
    if (waarde && totEnMet && waarde > totEnMet) {
      setTotEnMet(waarde);
    }
  }

  function wijzigTot(waarde: string) {
    setTotEnMet(waarde);
    if (waarde && vanaf && waarde < vanaf) {
      setVanaf(waarde);
    }
  }

  return (
    <div className="contents">
      <Datumveld
        label="Vanaf meetdatum"
        naam="vanaf"
        waarde={vanaf}
        minimum={minimum}
        maximum={maximum}
        wijzig={wijzigVanaf}
      />
      <Datumveld
        label="Tot meetdatum"
        naam="tot"
        waarde={totEnMet}
        minimum={minimum}
        maximum={maximum}
        wijzig={wijzigTot}
      />
    </div>
  );
}
