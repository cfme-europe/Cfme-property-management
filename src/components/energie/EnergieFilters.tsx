"use client";
import { useState } from "react";
import type {
  Brondata,
  EnergieAnalyseSelectie,
  Energiedrager,
} from "@/lib/energie/portfolio-analyse";
import EnergieAnalyseDatumvelden from "./EnergieAnalyseDatumvelden";
export default function EnergieFilters({
  bron,
  selectie,
  dragers,
  minimum,
  maximum,
}: {
  bron: Pick<Brondata, "woningen" | "bedrijven" | "verhuurperioden">;
  selectie: EnergieAnalyseSelectie;
  dragers: Energiedrager[];
  minimum: string;
  maximum: string;
}) {
  const [niveau, setNiveau] = useState(selectie.niveau),
    [klanten, setKlanten] = useState(selectie.bedrijfIds ?? []),
    [panden, setPanden] = useState(selectie.woningIds ?? []),
    [archief, setArchief] = useState(!!selectie.archief);
  const relevant = (klantIds: number[], arch: boolean) =>
    bron.woningen.filter(
      (w) =>
        (arch || w.status === "actief" || !w.status) &&
        (!klantIds.length ||
          bron.verhuurperioden.some(
            (v) =>
              v.woning_id === w.id &&
              klantIds.includes(v.bedrijf_id) &&
              (!v.startdatum || v.startdatum < selectie.totEnMet) &&
              (!v.werkelijke_einddatum ||
                v.werkelijke_einddatum > selectie.vanaf),
          )),
    );
  const beschikbaar = relevant(niveau === "woning" ? [] : klanten, archief);
  const toggle = (list: number[], id: number) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  return (
    <form className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-5 md:grid-cols-3">
        <label className="text-sm font-semibold">
          Selectieniveau
          <select
            name="niveau"
            value={niveau}
            onChange={(e) => {
              const n = e.target.value as typeof niveau;
              setNiveau(n);
              if (n === "woning") setKlanten([]);
            }}
            className="mt-2 w-full rounded-xl border p-3"
          >
            <option value="totaal">Portefeuille / vrije selectie</option>
            <option value="bedrijf">Klanten en hun panden</option>
            <option value="woning">Panden</option>
          </select>
        </label>
        {niveau !== "woning" && (
          <details className="rounded-xl border p-3">
            <summary className="cursor-pointer font-semibold">
              Klanten · {klanten.length || "alle"}
            </summary>
            <div className="mt-3 max-h-52 space-y-2 overflow-auto">
              {bron.bedrijven.map((b) => (
                <label key={b.id} className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="bedrijf"
                    value={b.id}
                    checked={klanten.includes(b.id)}
                    onChange={() => {
                      const next = toggle(klanten, b.id);
                      setKlanten(next);
                      const ids = new Set(
                        relevant(next, archief).map((w) => w.id),
                      );
                      setPanden(panden.filter((id) => ids.has(id)));
                    }}
                  />
                  {b.naam}
                </label>
              ))}
            </div>
          </details>
        )}
        <details className="rounded-xl border p-3">
          <summary className="cursor-pointer font-semibold">
            Panden · {panden.length || "alle relevante"}
          </summary>
          <div className="mt-3 max-h-52 space-y-2 overflow-auto">
            {beschikbaar.map((w) => (
              <label key={w.id} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  name="woning"
                  value={w.id}
                  checked={panden.includes(w.id)}
                  onChange={() => setPanden(toggle(panden, w.id))}
                />
                {w.adres}
                {w.status !== "actief" && w.status ? " (archief)" : ""}
              </label>
            ))}
          </div>
        </details>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">
            Energieproducten
          </legend>
          {(["elektriciteit", "gas", "water"] as const).map((d) => (
            <label key={d} className="mr-3 inline-flex gap-2 text-sm">
              <input
                type="checkbox"
                name="drager"
                value={d}
                defaultChecked={dragers.includes(d)}
              />
              {d}
            </label>
          ))}
        </fieldset>
        <label className="text-sm font-semibold">
          Berekening
          <select
            name="modus"
            defaultValue={selectie.modus ?? "exact"}
            className="mt-2 w-full rounded-xl border p-3"
          >
            <option value="exact">Alleen gemeten intervallen</option>
            <option value="schatting">
              Inclusief geschatte grensverdeling
            </option>
          </select>
        </label>
        <label className="text-sm font-semibold">
          Minimale benchmarkdekking (%)
          <input
            name="dekking"
            type="number"
            min="0"
            max="100"
            defaultValue={selectie.minimaleDekking ?? 100}
            className="mt-2 w-full rounded-xl border p-3"
          />
        </label>
        <EnergieAnalyseDatumvelden
          vanaf={selectie.vanaf}
          totEnMet={selectie.totEnMet}
          minimum={minimum}
          maximum={maximum}
        />
        <label className="text-sm font-semibold">
          Datakwaliteit
          <select
            name="kwaliteit"
            defaultValue={selectie.kwaliteit ?? "alle"}
            className="mt-2 w-full rounded-xl border p-3"
          >
            <option value="alle">Alles, inclusief ontbrekende gegevens</option>
            <option value="betrouwbaar">Bruikbare gegevens</option>
            <option value="controleren">Controle nodig</option>
          </select>
        </label>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-5">
        <button className="rounded-xl bg-emerald-700 px-6 py-3 font-bold text-white">
          Analyse toepassen
        </button>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            name="archief"
            value="1"
            checked={archief}
            onChange={(e) => {
              setArchief(e.target.checked);
              if (!e.target.checked) {
                const active = new Set(
                  relevant(klanten, false).map((w) => w.id),
                );
                setPanden(panden.filter((id) => active.has(id)));
              }
            }}
          />
          Historische / gearchiveerde panden
        </label>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Beginmeetdatum inclusief, eindmeetdatum exclusief. Binnen een filter
        geldt óf; tussen klanten en panden geldt én. Pas een gewijzigde periode
        toe om de bijbehorende pandenlijst te vernieuwen.
      </p>
    </form>
  );
}
