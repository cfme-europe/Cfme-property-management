"use client";

import { useMemo, useState } from "react";
import {
  vindGeldendTarief,
  type Tariefplan,
} from "@/lib/energie/tarieven";
import { slaEnergiePrijzen } from "@/app/bedrijven/energieanalyse/actions";

type Woning = { id: number; adres: string };
type Verhuurperiode = {
  woning_id: number;
  bedrijf_id: number;
  startdatum?: string;
  werkelijke_einddatum?: string | null;
};

function vorigeDag(datum: string) {
  return new Date(Date.parse(`${datum}T00:00:00Z`) - 86_400_000)
    .toISOString()
    .slice(0, 10);
}

function geld(waarde: string | undefined, valuta: string) {
  if (waarde === undefined) return "Geen geregistreerd tarief";
  return `${new Intl.NumberFormat("nl-NL", {
    maximumFractionDigits: 6,
  }).format(Number(waarde))} ${valuta}`;
}

export default function EnergiePrijsForm({
  woningen,
  verhuurperioden,
  tarieven,
  beschikbaar,
}: {
  woningen: Woning[];
  verhuurperioden: Verhuurperiode[];
  tarieven: Tariefplan[];
  beschikbaar: boolean;
}) {
  const [woningId, setWoningId] = useState(String(woningen[0]?.id ?? ""));
  const [vanaf, setVanaf] = useState(new Date().toISOString().slice(0, 10));
  const woning = Number(woningId);
  const bedrijfId = useMemo(
    () =>
      verhuurperioden
        .filter(
          (huur) =>
            huur.woning_id === woning &&
            (!huur.startdatum || huur.startdatum <= vanaf) &&
            (!huur.werkelijke_einddatum || huur.werkelijke_einddatum > vanaf),
        )
        .sort((a, b) =>
          (b.startdatum ?? "").localeCompare(a.startdatum ?? ""),
        )[0]?.bedrijf_id ?? null,
    [vanaf, verhuurperioden, woning],
  );
  const geldende = (product: string) =>
    vindGeldendTarief(
      tarieven,
      product,
      woning,
      bedrijfId,
      vorigeDag(vanaf),
    );
  const prijs = (product: string, soort: string) => {
    const tarief = geldende(product);
    return tarief?.componenten.find((component) => component.soort === soort)
      ?.prijs;
  };
  const eenheden = [
    { key: "dagstroom", label: "Dagstroom", product: "elektriciteit", soort: "dag", eenheid: "€/kWh" },
    { key: "nachtstroom", label: "Nachtstroom", product: "elektriciteit", soort: "nacht", eenheid: "€/kWh" },
    { key: "gas", label: "Gas", product: "gas", soort: "variabel", eenheid: "€/m³" },
    { key: "water", label: "Water", product: "water", soort: "variabel", eenheid: "€/m³" },
  ];
  const veld =
    "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base";

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold">Eenvoudige prijsinvoer</h2>
      <p className="mt-1 text-sm text-slate-600">
        Een lege nieuwe-prijsregel laat dat tarief ongewijzigd. Vul 0 in om een
        prijs expliciet op nul te zetten.
      </p>
      {!beschikbaar ? (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
          De tariefregistratie is niet beschikbaar. Er wordt niets opgeslagen.
        </p>
      ) : (
        <form action={slaEnergiePrijzen} className="mt-5 space-y-4">
          <label className="block text-sm font-semibold">
            Pand
            <select
              name="woning_id"
              required
              value={woningId}
              onChange={(event) => setWoningId(event.target.value)}
              className={`${veld} mt-1`}
            >
              {woningen.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.adres}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Nieuwe prijzen gelden vanaf
            <input
              name="vanaf"
              type="date"
              required
              value={vanaf}
              onChange={(event) => setVanaf(event.target.value)}
              className={`${veld} mt-1`}
            />
          </label>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-3 pr-3">Product</th>
                  <th className="py-3 pr-3">Oude prijs</th>
                  <th className="py-3">Nieuwe prijs</th>
                </tr>
              </thead>
              <tbody>
                {eenheden.map((regel) => {
                  const tarief = geldende(regel.product);
                  const oudePrijs = prijs(regel.product, regel.soort);
                  return (
                    <tr key={regel.key} className="border-b border-slate-100">
                      <th className="py-3 pr-3 font-semibold">{regel.label}</th>
                      <td className="py-3 pr-3">
                        {geld(oudePrijs, tarief?.valuta ?? "EUR")}
                      </td>
                      <td className="py-3">
                        <label className="flex min-h-11 items-center gap-2">
                          <input
                            name={`${regel.key}_prijs`}
                            type="number"
                            min="0"
                            step="any"
                            inputMode="decimal"
                            placeholder="Ongewijzigd"
                            aria-label={`Nieuwe prijs ${regel.label} in ${regel.eenheid}`}
                            className={`${veld} max-w-64`}
                          />
                          <span className="whitespace-nowrap">{regel.eenheid}</span>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Btw-percentage voor nieuwe prijzen
              <input
                name="btw_percentage"
                type="number"
                min="0"
                max="100"
                step="any"
                defaultValue="21"
                required
                className={`${veld} mt-1`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Nieuwe prijzen zijn
              <select
                name="inclusief_btw"
                defaultValue="nee"
                className={`${veld} mt-1`}
              >
                <option value="nee">Exclusief btw</option>
                <option value="ja">Inclusief btw</option>
              </select>
            </label>
          </div>
          <p className="text-sm text-slate-600">
            Prijzen en btw worden samen opgeslagen. Inclusieve btw wordt in de
            berekening uitgesplitst; btw wordt dus niet dubbel berekend.
            Elektriciteitskosten gebruiken aparte Dagstroom- en
            Nachtstroomtarieven.
          </p>
          <button
            type="submit"
            disabled={!woningen.length}
            className="min-h-12 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            Prijzen opslaan
          </button>
        </form>
      )}
    </section>
  );
}
