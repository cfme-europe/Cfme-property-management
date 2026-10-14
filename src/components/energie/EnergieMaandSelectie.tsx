"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
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
  relaties: Array<{
    woning_id: number;
    bedrijf_id?: number;
    startdatum: string | null;
    werkelijke_einddatum: string | null;
  }>;
  bedrijfIds: number[];
  woningIds: number[];
  woningselectie: "automatisch" | "aangepast" | "leeg";
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

const maandenVanJaar = Array.from({ length: 12 }, (_, index) => index + 1);
const maandnamen = new Intl.DateTimeFormat("nl-NL", {
  month: "long",
  timeZone: "UTC",
});
const veld =
  "min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-800/20";

function maandnaam(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("nl-NL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function valtSamen(
  maand: string,
  startdatum: string | null,
  einddatum: string | null,
) {
  const [year, month] = maand.split("-").map(Number);
  const vanaf = `${maand}-01`;
  const tot = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  return (!startdatum || startdatum < tot) && (!einddatum || einddatum > vanaf);
}

export default function EnergieMaandSelectie({
  bedrijven,
  woningen,
  relaties,
  bedrijfIds,
  woningIds,
  woningselectie,
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
  const [homeSelectionMode, setHomeSelectionMode] = useState(woningselectie);
  const [selectedMonths, setSelectedMonths] = useState(maanden);
  const [selectedReference, setSelectedReference] = useState(referentiemaand);
  const [monthToAddMonth, setMonthToAddMonth] = useState(
    maanden[0]?.slice(5) ?? "01",
  );
  const [monthToAddYear, setMonthToAddYear] = useState(Number(maanden[0]?.slice(0, 4) ?? new Date().getUTCFullYear()));
  const [search, setSearch] = useState("");
  const [editingHomes, setEditingHomes] = useState(
    weergave === "selectie" || woningselectie !== "automatisch",
  );
  const validationErrorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (validationError) validationErrorRef.current?.focus();
  }, [validationError]);

  const jaaropties = useMemo(() => {
    const selectedYears = selectedMonths.map((month) => Number(month.slice(0, 4)));
    const min = Math.min(new Date().getUTCFullYear() - 5, ...selectedYears);
    const max = Math.max(new Date().getUTCFullYear() + 1, ...selectedYears);
    return Array.from({ length: max - min + 1 }, (_, index) => min + index);
  }, [selectedMonths]);

  const relevanteWoningIds = useMemo(() => {
    const selectedCompanySet = new Set(selectedCompanies);
    return new Set(
      woningen
        .filter((woning) => {
          if (!selectedMonths.length) return false;
          const matchingRelations = relaties.filter(
            (relation) =>
              relation.woning_id === woning.id &&
              (weergave === "selectie" ||
                selectedCompanySet.size === 0 ||
                selectedCompanySet.has(relation.bedrijf_id ?? -1)) &&
              selectedMonths.some((month) =>
                valtSamen(
                  month,
                  relation.startdatum,
                  relation.werkelijke_einddatum,
                ),
              ),
          );
          if (weergave === "selectie") return matchingRelations.length > 0;
          return selectedCompanySet.size === 0 || matchingRelations.length > 0;
        })
        .map((woning) => woning.id),
    );
  }, [relaties, selectedCompanies, selectedMonths, weergave, woningen]);

  const automaticSelection = homeSelectionMode === "automatisch";
  const displayedHomes = automaticSelection
    ? woningen.filter((woning) => relevanteWoningIds.has(woning.id))
    : woningen.filter(
        (woning) =>
          relevanteWoningIds.has(woning.id) && selectedHomes.includes(woning.id),
      );
  const visibleHomes = woningen.filter(
    (woning) =>
      relevanteWoningIds.has(woning.id) &&
      woning.adres.toLocaleLowerCase("nl-NL").includes(search.toLocaleLowerCase("nl-NL")),
  );

  function updateHomesForSelection(
    companySelection: number[],
    monthSelection: string[],
  ) {
    const companies = new Set(companySelection);
    const applicableHomes = new Set(
      woningen
        .filter((woning) => {
          if (!monthSelection.length) return false;
          const matchingRelations = relaties.filter(
            (relation) =>
              relation.woning_id === woning.id &&
              (weergave === "selectie" ||
                companies.size === 0 ||
                companies.has(relation.bedrijf_id ?? -1)) &&
              monthSelection.some((month) =>
                valtSamen(
                  month,
                  relation.startdatum,
                  relation.werkelijke_einddatum,
                ),
              ),
          );
          return weergave === "selectie"
            ? matchingRelations.length > 0
            : companies.size === 0 || matchingRelations.length > 0;
        })
        .map((woning) => woning.id),
    );
    setSelectedHomes((current) =>
      current.filter((id) => applicableHomes.has(id)),
    );
  }

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

  function toggleCompany(id: number) {
    const next = selectedCompanies.includes(id)
      ? selectedCompanies.filter((item) => item !== id)
      : [...selectedCompanies, id];
    setSelectedCompanies(next);
    updateHomesForSelection(next, selectedMonths);
  }

  function toggleHome(id: number) {
    const next = displayedHomes.some((home) => home.id === id)
      ? displayedHomes.filter((home) => home.id !== id).map((home) => home.id)
      : [...displayedHomes.map((home) => home.id), id];
    setSelectedHomes(next);
    setHomeSelectionMode(next.length ? "aangepast" : "leeg");
  }

  function updateMonths(next: string[]) {
    setSelectedMonths(next);
    if (!next.includes(selectedReference))
      setSelectedReference(next[0] ?? "");
    updateHomesForSelection(selectedCompanies, next);
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
      className="space-y-4 border-y border-emerald-900/15 bg-[#fffefa] px-4 py-4 sm:px-5"
    >
      <input
        type="hidden"
        name="weergave"
        value={weergave === "selectie" ? "anoniem" : weergave}
      />
      <input
        type="hidden"
        name="woningselectie"
        value={
          weergave === "selectie"
            ? displayedHomes.length
              ? "aangepast"
              : "leeg"
            : automaticSelection
              ? "automatisch"
              : displayedHomes.length
                ? "aangepast"
                : "leeg"
        }
      />
      {selectedMonths.map((month) => (
        <input key={month} type="hidden" name="maand" value={month} />
      ))}
      {!automaticSelection &&
        displayedHomes.map((home) => (
          <input key={home.id} type="hidden" name="woning" value={home.id} />
        ))}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {weergave !== "selectie" && (
          <details className="min-w-0">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold text-emerald-950">
              Klanten{" "}
              <span className="font-normal text-slate-600">
                {selectedCompanies.length
                  ? `· ${selectedCompanies.length} geselecteerd`
                  : "· alle toegankelijke klanten"}
              </span>
            </summary>
            <div className="max-h-48 overflow-auto border-y border-stone-200 py-2">
              {bedrijven.map((bedrijf) => (
                <label
                  key={bedrijf.id}
                  className="flex min-h-11 items-center gap-3 px-2 text-sm hover:bg-emerald-50"
                >
                  <input
                    type="checkbox"
                    name="bedrijf"
                    value={bedrijf.id}
                    checked={selectedCompanies.includes(bedrijf.id)}
                    onChange={() => toggleCompany(bedrijf.id)}
                    className="h-5 w-5 accent-emerald-800"
                  />
                  {bedrijf.naam}
                </label>
              ))}
            </div>
            <p className="pt-2 text-xs text-slate-600">
              Bij klantselectie worden relevante panden automatisch meegenomen.
            </p>
          </details>
        )}

        <section className="min-w-0">
          <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-emerald-950">
              {displayedHomes.length}{" "}
              {displayedHomes.length === 1 ? "pand" : "panden"} geselecteerd
            </p>
            <button
              type="button"
              aria-expanded={editingHomes}
              onClick={() => {
                if (!editingHomes && automaticSelection) {
                  setSelectedHomes(displayedHomes.map((home) => home.id));
                  setHomeSelectionMode(
                    displayedHomes.length ? "aangepast" : "leeg",
                  );
                }
                setEditingHomes((current) => !current);
              }}
              className="min-h-11 rounded-lg px-3 text-sm font-semibold text-emerald-800 underline decoration-emerald-800/40 underline-offset-4 hover:bg-emerald-50"
            >
              {editingHomes ? "Panden sluiten" : "Aanpassen"}
            </button>
          </div>
          {editingHomes && (
            <div className="border-y border-stone-200 py-3">
              <label className="block text-sm font-medium">
                Zoek pand
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Zoek op adres"
                  className={`${veld} mt-1`}
                />
              </label>
              <div className="mt-2 max-h-56 overflow-auto">
                {visibleHomes.map((woning) => (
                  <label
                    key={woning.id}
                    className="flex min-h-11 items-center gap-3 px-2 text-sm hover:bg-emerald-50"
                  >
                    <input
                      type="checkbox"
                      checked={displayedHomes.some(
                        (home) => home.id === woning.id,
                      )}
                      onChange={() => toggleHome(woning.id)}
                      className="h-5 w-5 accent-emerald-800"
                    />
                    <span>
                      {woning.adres}
                      {woning.status && woning.status !== "actief"
                        ? " · archief"
                        : ""}
                    </span>
                  </label>
                ))}
                {!visibleHomes.length && (
                  <p className="px-2 py-3 text-sm text-slate-600">
                    Geen passende panden voor deze selectie.
                  </p>
                )}
              </div>
              {!automaticSelection && (
                <button
                  type="button"
                  onClick={() => {
                    setHomeSelectionMode("automatisch");
                    setSelectedHomes([]);
                  }}
                  className="mt-2 min-h-10 text-sm font-semibold text-emerald-800 underline underline-offset-4"
                >
                  Automatische selectie herstellen
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-semibold text-emerald-950">
          Energieproduct
          <select name="drager" defaultValue={drager} className={`${veld} mt-1`}>
            {producten.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="text-sm font-semibold text-emerald-950">
          <legend>Maat</legend>
          <div className="mt-1 grid grid-cols-2 border-y border-stone-300">
            {(["verbruik", "kosten"] as const).map((value) => (
              <label
                key={value}
                className={`flex min-h-11 cursor-pointer items-center justify-center px-2 ${
                  maat === value
                    ? "border-b-2 border-emerald-800 text-emerald-950"
                    : "text-slate-600"
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
        <fieldset className="text-sm font-semibold text-emerald-950">
          <legend>Weergave</legend>
          <div className="mt-1 grid grid-cols-2 border-y border-stone-300">
            {(["persoon", "pand"] as const).map((value) => (
              <label
                key={value}
                className={`flex min-h-11 cursor-pointer items-center justify-center px-2 ${
                  aggregatie === value
                    ? "border-b-2 border-emerald-800 text-emerald-950"
                    : "text-slate-600"
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
        <label className="text-sm font-semibold text-emerald-950">
          Sorteer op
          <select
            name="referentiemaand"
            value={selectedReference}
            onChange={(event) => setSelectedReference(event.target.value)}
            className={`${veld} mt-1`}
          >
            {selectedMonths.map((month) => (
              <option key={month} value={month}>
                {maandnaam(month)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="border-t border-stone-200 pt-3">
        <legend className="px-1 text-sm font-semibold text-emerald-950">
          Kalendermaanden
        </legend>
        <div className="grid gap-2 sm:grid-cols-[minmax(8rem,1fr)_minmax(7rem,0.7fr)_auto]">
          <label className="text-sm font-medium">
            Maand
            <select
              value={monthToAddMonth}
              onChange={(event) => setMonthToAddMonth(event.target.value)}
              className={`${veld} mt-1`}
              aria-label="Maand toevoegen"
            >
              {maandenVanJaar.map((month) => (
                <option key={month} value={String(month).padStart(2, "0")}>
                  {maandnamen.format(new Date(Date.UTC(2024, month - 1, 1)))}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Jaar
            <select
              value={monthToAddYear}
              onChange={(event) => setMonthToAddYear(Number(event.target.value))}
              className={`${veld} mt-1`}
              aria-label="Jaar toevoegen"
            >
              {jaaropties.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={selectedMonths.includes(
              `${monthToAddYear}-${monthToAddMonth}`,
            )}
            onClick={() => {
              const next = [
                ...selectedMonths,
                `${monthToAddYear}-${monthToAddMonth}`,
              ].sort();
              updateMonths(next);
            }}
            className="min-h-11 self-end rounded-lg border border-emerald-800 px-4 font-semibold text-emerald-900 disabled:opacity-50"
          >
            Maand toevoegen
          </button>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {selectedMonths.map((month) => (
            <li
              key={month}
              className="flex items-center gap-1 border-b border-emerald-800/30 py-1 pl-2"
            >
              <label className="flex min-h-9 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="sorteermaand"
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
                onClick={() =>
                  updateMonths(selectedMonths.filter((item) => item !== month))
                }
                className="min-h-9 min-w-9 rounded-full text-slate-700 hover:bg-emerald-50"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-600">
          Niet-aaneengesloten maanden zijn toegestaan; markeer de referentiemaand
          om de sortering te wijzigen.
        </p>
      </fieldset>

      {validationError && (
        <p
          ref={validationErrorRef}
          role="alert"
          tabIndex={-1}
          className="border-l-4 border-rose-700 bg-rose-50 p-3 text-sm text-rose-950 outline-none"
        >
          {validationError}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || selectedMonths.length === 0}
        className="min-h-12 rounded-lg bg-emerald-900 px-5 py-3 font-bold text-white hover:bg-emerald-950 disabled:opacity-60"
      >
        {pending
          ? "Analyse wordt bijgewerkt…"
          : weergave === "selectie"
            ? "Toon anonieme preview"
            : "Analyse toepassen"}
      </button>
    </form>
  );
}
