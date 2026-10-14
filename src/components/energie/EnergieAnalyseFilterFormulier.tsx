"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Energiedrager } from "@/lib/energie/portfolio-analyse";
import EnergieAnalyseDatumvelden from "./EnergieAnalyseDatumvelden";

type WoningKeuze = {
  id: number;
  adres: string;
  status?: string;
  beschikbaar: boolean;
};

type Props = {
  bedrijven: Array<{ id: number; naam: string }>;
  woningen: WoningKeuze[];
  bedrijfId?: number;
  woningIds: number[];
  vanaf: string;
  totEnMet: string;
  drager: Energiedrager;
  minimum: string;
  maximum: string;
  validationError?: string;
};

const productNamen: Record<Energiedrager, string> = {
  elektriciteit: "Elektriciteit totaal",
  dagstroom: "Dagstroom",
  nachtstroom: "Nachtstroom",
  gas: "Gas",
  water: "Water",
};

export default function EnergieAnalyseFilterFormulier({
  bedrijven,
  woningen,
  bedrijfId,
  woningIds,
  vanaf,
  totEnMet,
  drager,
  minimum,
  maximum,
  validationError,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [startDatum, setStartDatum] = useState(vanaf);
  const [eindDatum, setEindDatum] = useState(totEnMet);
  const [geselecteerdePanden, setGeselecteerdePanden] = useState(woningIds);

  function wijzigBereik(nieuwVanaf: string, nieuwTotEnMet: string) {
    setStartDatum(nieuwVanaf);
    setEindDatum(nieuwTotEnMet);
  }

  function toepassen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parameters = new URLSearchParams();
    new FormData(event.currentTarget).forEach((waarde, naam) => {
      if (typeof waarde === "string") parameters.append(naam, waarde);
    });
    startTransition(() =>
      router.push(`/bedrijven/energieanalyse?${parameters.toString()}`),
    );
  }

  return (
    <form
      method="get"
      onSubmit={toepassen}
      aria-busy={pending}
      className="grid min-w-0 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <label className="min-w-0 text-sm font-semibold">
        Klant
        <select
          name="bedrijf"
          defaultValue={bedrijfId?.toString() ?? ""}
          className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3"
        >
          <option value="">Alle klanten</option>
          {bedrijven.map((bedrijf) => (
            <option key={bedrijf.id} value={bedrijf.id}>
              {bedrijf.naam}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="min-w-0 rounded-xl border border-slate-200 p-3">
        <legend className="px-1 text-sm font-semibold">Panden</legend>
        <div className="mt-1 max-h-56 space-y-1 overflow-auto">
          {woningen.map((woning) => (
            <label
              key={woning.id}
              className={`flex min-h-11 items-center gap-3 py-2 text-sm ${
                woning.beschikbaar ? "" : "text-amber-900"
              }`}
            >
              <input
                type="checkbox"
                name="woning"
                value={woning.id}
                checked={geselecteerdePanden.includes(woning.id)}
                onChange={() =>
                  setGeselecteerdePanden((huidig) =>
                    huidig.includes(woning.id)
                      ? huidig.filter((id) => id !== woning.id)
                      : [...huidig, woning.id],
                  )
                }
                className="h-5 w-5 shrink-0 accent-emerald-700"
              />
              <span>
                {woning.adres}
                {woning.status && woning.status !== "actief"
                  ? " (archief)"
                  : ""}
                {!woning.beschikbaar
                  ? " — niet beschikbaar voor deze klant of periode"
                  : ""}
              </span>
            </label>
          ))}
          {!woningen.length && (
            <p className="py-2 text-sm text-slate-600">
              Geen panden beschikbaar voor deze klant en periode.
            </p>
          )}
        </div>
        <p className="mt-2 text-xs font-normal text-slate-600">
          Geen selectie = alle panden.
        </p>
      </fieldset>

      <label className="min-w-0 text-sm font-semibold">
        Energieproduct
        <select
          name="drager"
          defaultValue={drager}
          className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3"
        >
          {Object.entries(productNamen).map(([waarde, naam]) => (
            <option key={waarde} value={waarde}>
              {naam}
            </option>
          ))}
        </select>
      </label>

      <EnergieAnalyseDatumvelden
        vanaf={startDatum}
        totEnMet={eindDatum}
        minimum={minimum}
        maximum={maximum}
        onWijzigBereik={wijzigBereik}
      />

      <div className="flex min-w-0 items-end">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 w-full rounded-lg bg-emerald-700 px-4 font-bold text-white disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? "Analyse wordt toegepast…" : "Analyse toepassen"}
        </button>
      </div>
      {validationError && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900 sm:col-span-2 xl:col-span-4"
        >
          Analyse niet toegepast: {validationError}
        </p>
      )}
      {pending && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm font-semibold text-emerald-900 sm:col-span-2 xl:col-span-4"
        >
          Analyse wordt bijgewerkt…
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        Datumbereik: {startDatum} tot en met {eindDatum}
      </span>
    </form>
  );
}
