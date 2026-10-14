"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Energiedrager } from "@/lib/energie/portfolio-analyse";

export type EnergieSelectiePresentatie =
  | "intern"
  | "klant"
  | "selectie"
  | "anoniem";

type Props = {
  bedrijven: Array<{ id: number; naam: string }>;
  woningen: Array<{ id: number; adres: string; status?: string }>;
  bedrijfIds: number[];
  woningIds: number[];
  maanden: string[];
  referentiemaand: string;
  drager: Energiedrager;
  maat: "verbruik" | "kosten";
  aggregatie: "persoon" | "pand";
  weergave: EnergieSelectiePresentatie;
  validationError?: string;
};

const producten: Array<[Energiedrager, string]> = [
  ["elektriciteit", "Elektriciteit totaal"],
  ["dagstroom", "Dagstroom"],
  ["nachtstroom", "Nachtstroom"],
  ["gas", "Gas"],
  ["water", "Water"],
];

function maandnaam(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("nl-NL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

const veld =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base";

export default function EnergieMaandSelectie({
  bedrijven,
  woningen,
  bedrijfIds,
  woningIds,
  maanden,
  referentiemaand,
  drager,
  maat,
  aggregatie,
  weergave,
  validationError,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedCompanies, setSelectedCompanies] = useState(bedrijfIds);
  const [selectedHomes, setSelectedHomes] = useState(woningIds);
  const [selectedMonths, setSelectedMonths] = useState(maanden);
  const [selectedReference, setSelectedReference] = useState(referentiemaand);
  const [monthToAdd, setMonthToAdd] = useState("");
  const [search, setSearch] = useState("");

  const visibleHomes = useMemo(
    () =>
      woningen.filter((woning) =>
        woning.adres.toLocaleLowerCase("nl-NL").includes(search.toLocaleLowerCase("nl-NL")),
      ),
    [search, woningen],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    if (weergave === "selectie") return;
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value) params.append(key, value);
    }
    startTransition(() =>
      router.push(`/bedrijven/energieanalyse?${params.toString()}`),
    );
  }

  function toggle(
    id: number,
    selected: number[],
    setSelected: (next: number[]) => void,
  ) {
    setSelected(
      selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id],
    );
  }

  return (
    <form
      method={weergave === "selectie" ? "post" : "get"}
      action={
        weergave === "selectie"
          ? "/bedrijven/energieanalyse/presentatie"
          : undefined
      }
      onSubmit={submit}
      aria-busy={pending}
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
    >
      <input
        type="hidden"
        name="weergave"
        value={weergave === "selectie" ? "anoniem" : weergave}
      />
      {selectedMonths.map((month) => (
        <input key={month} type="hidden" name="maand" value={month} />
      ))}

      <div className="grid gap-3 md:grid-cols-2">
        <details className="rounded-xl border border-slate-200 p-3" open>
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">
            Klanten {selectedCompanies.length ? `(${selectedCompanies.length} geselecteerd)` : "(alle)"}
          </summary>
          <div className="mt-2 max-h-48 space-y-1 overflow-auto">
            {bedrijven.map((bedrijf) => (
              <label
                key={bedrijf.id}
                className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  name="bedrijf"
                  value={bedrijf.id}
                  checked={selectedCompanies.includes(bedrijf.id)}
                  onChange={() =>
                    toggle(bedrijf.id, selectedCompanies, setSelectedCompanies)
                  }
                  className="h-5 w-5 accent-emerald-700"
                />
                {bedrijf.naam}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Zonder selectie worden alle toegankelijke klanten meegenomen.
          </p>
        </details>

        <details className="rounded-xl border border-slate-200 p-3">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">
            Panden {selectedHomes.length ? `(${selectedHomes.length} geselecteerd)` : "(alle)"}
          </summary>
          <label className="mt-2 block text-sm font-medium">
            Zoek pand
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Adres zoeken"
              className={`${veld} mt-1`}
            />
          </label>
          <div className="mt-2 max-h-52 space-y-1 overflow-auto">
            {visibleHomes.map((woning) => (
              <label
                key={woning.id}
                className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  name="woning"
                  value={woning.id}
                  checked={selectedHomes.includes(woning.id)}
                  onChange={() => toggle(woning.id, selectedHomes, setSelectedHomes)}
                  className="h-5 w-5 accent-emerald-700"
                />
                <span>
                  {woning.adres}
                  {woning.status && woning.status !== "actief" ? " · archief" : ""}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Zonder selectie worden alle panden binnen de gekozen klant(en) meegenomen.
          </p>
        </details>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-semibold">
          Energieproduct
          <select name="drager" defaultValue={drager} className={`${veld} mt-1`}>
            {producten.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>
        <fieldset className="text-sm font-semibold">
          <legend>Maat</legend>
          <div className="mt-1 grid grid-cols-2 rounded-xl border border-slate-300 p-1">
            {(["verbruik", "kosten"] as const).map((value) => (
              <label
                key={value}
                className={`flex min-h-10 cursor-pointer items-center justify-center rounded-lg px-2 ${
                  maat === value ? "bg-emerald-800 text-white" : "text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="maat"
                  value={value}
                  defaultChecked={maat === value}
                  className="sr-only"
                />
                {value === "verbruik" ? "Verbruik" : "Kosten"}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="text-sm font-semibold">
          <legend>Weergave</legend>
          <div className="mt-1 grid grid-cols-2 rounded-xl border border-slate-300 p-1">
            {(["persoon", "pand"] as const).map((value) => (
              <label
                key={value}
                className={`flex min-h-10 cursor-pointer items-center justify-center rounded-lg px-2 ${
                  aggregatie === value ? "bg-emerald-800 text-white" : "text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="aggregatie"
                  value={value}
                  defaultChecked={aggregatie === value}
                  className="sr-only"
                />
                {value === "persoon" ? "Per persoon" : "Totaal pand"}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <fieldset className="rounded-xl border border-slate-200 p-3">
        <legend className="px-1 text-sm font-semibold">Kalendermaanden</legend>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-48 flex-1 text-sm font-medium">
            Maand toevoegen
            <input
              type="month"
              value={monthToAdd}
              onChange={(event) => setMonthToAdd(event.target.value)}
              className={`${veld} mt-1`}
            />
          </label>
          <button
            type="button"
            disabled={!monthToAdd || selectedMonths.includes(monthToAdd)}
            onClick={() => {
              setSelectedMonths((current) => [...current, monthToAdd]);
              setMonthToAdd("");
            }}
            className="min-h-11 rounded-xl border border-emerald-800 px-4 font-semibold text-emerald-900 disabled:opacity-50"
          >
            Maand toevoegen
          </button>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {selectedMonths.map((month) => (
            <li key={month} className="flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1">
              <label className="flex min-h-9 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="referentiemaand"
                  value={month}
                  checked={month === selectedReference}
                  onChange={() => setSelectedReference(month)}
                  aria-label={`Sorteren op ${maandnaam(month)}`}
                />
                <span>{maandnaam(month)}</span>
              </label>
              <button
                type="button"
                aria-label={`${maandnaam(month)} verwijderen`}
                onClick={() => {
                  const remaining = selectedMonths.filter((item) => item !== month);
                  setSelectedMonths(remaining);
                  if (selectedReference === month)
                    setSelectedReference(remaining[0] ?? "");
                }}
                className="min-h-9 min-w-9 rounded-full text-slate-700 hover:bg-slate-200"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-600">
          Niet-aaneengesloten maanden zijn toegestaan. De eerste maand is standaard de sorteermaand.
        </p>
      </fieldset>

      {validationError && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">
          {validationError}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || selectedMonths.length === 0}
        className="min-h-12 w-full rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Analyse wordt bijgewerkt…" : weergave === "selectie" ? "Toon anonieme preview" : "Analyse toepassen"}
      </button>
    </form>
  );
}
