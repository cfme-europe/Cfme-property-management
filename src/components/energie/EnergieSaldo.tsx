import Link from "next/link";
import { saldoOverzicht } from "@/lib/energie/saldo-overzicht";
import type { PandSaldo } from "@/lib/energie/voorschotten";
export const geld = (n: number | null) =>
  n === null
    ? "Onbekend"
    : n.toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
export default function EnergieSaldo({
  saldi,
  ids,
  jaar,
  van = 0,
  tot = 11,
  maand,
  sluit,
}: {
  saldi: PandSaldo[];
  ids: number[];
  jaar: number;
  van?: number;
  tot?: number;
  maand: number;
  sluit?: () => void;
}) {
  const scope = saldi.filter((p) => ids.includes(p.woning_id));
  const overzicht = saldoOverzicht(saldi, ids, jaar, van, tot, maand);
  const saldo = overzicht.saldo;
  const periode = (key:string) => new Date(`${key}-01T12:00:00Z`).toLocaleDateString("nl-NL",{month:"long",year:"numeric",timeZone:"UTC"});
  return (
    <section
      className="rounded-2xl border border-emerald-900/20 bg-white p-3 text-slate-950"
      aria-label="Informatief voorschotsaldo"
    >
      <header className="flex justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-emerald-950">
            Voorschot en geschatte kosten · alle producten
          </h2>
          <p className="text-sm mt-1">
            {periode(overzicht.van)} t/m {periode(overzicht.tot)} · afgesloten maanden
          </p>
        </div>
        {sluit && (
          <button
            type="button"
            onClick={sluit}
            aria-label="Voorschotoverzicht verbergen"
            className="min-h-11 min-w-11"
          >
            ×
          </button>
        )}
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x mt-3">
        {[
          ["Afgesproken voorschot", overzicht.voorschot],
          ["Geschatte kosten", overzicht.kosten],
          [saldo === null ? "Opgebouwd saldo" : saldo < 0 ? "Opgebouwd tekort" : "Opgebouwd tegoed", saldo === null ? null : Math.abs(saldo)],
        ].map(([label,value],i)=><div className="min-w-0 px-3 py-2" key={String(label)}><p className="text-sm font-semibold">{label}</p><strong className={`block break-words ${value === null ? "mt-1 text-base font-medium leading-snug" : "text-2xl lg:text-3xl tabular-nums"} ${i===2 && saldo!==null && saldo<0 ? "text-amber-800" : "text-emerald-950"}`}>{value===null ? "Nog niet beschikbaar" : geld(value as number)}</strong></div>)}
      </div>
      <p className="mt-2 text-xs">Beginsaldo van deze periode: {geld(overzicht.beginsaldo)} · lopende maand niet meegenomen.</p>
      {(overzicht.ontbrekend>0 || overzicht.kosten===null || overzicht.saldo===null) && <p className="mt-2 text-sm text-amber-900">{overzicht.ontbrekend>0 ? "Voorschotgegevens: nog niet ingevuld of buiten de gekozen periode." : "Tarief, startsaldo of meetgegevens ontbreken; het volledige saldo is nog onbekend."} Het verbruik blijft zichtbaar.</p>}
      <details className="mt-3">
        <summary className="cursor-pointer font-semibold">
          Maandoverzicht bekijken
        </summary>
        {scope.map((p) => (
          <div className="mt-4" key={p.verhuurperiode_id}>
            <h3 className="font-semibold">
              {p.adres} · {p.klant}
            </h3>
            <p className="text-sm">
              Start {p.vanaf} · startsaldo {geld(p.startsaldo)}
            </p>
            <details className="my-2 text-sm">
              <summary>Startmeterstanden</summary>
              {p.startstanden?.length ? (
                p.startstanden.map((s, i) => (
                  <p key={i}>
                    {s.product} · {s.register.replaceAll("_", " ")}:{" "}
                    {s.stand.toLocaleString("nl-NL", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    · {s.geschat ? "geschat tussen opnames" : "opgenomen"}{" "}
                    {s.bronVanaf} en {s.bronTot}
                  </p>
                ))
              ) : (
                <p>
                  Geen bruikbare grensopnames; startstand onbekend. Geen
                  fictieve stand opgeslagen.
                </p>
              )}
            </details>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left mt-2">
                <thead>
                  <tr>
                    {[
                      "Maand",
                      "Voorschot",
                      "Kosten (schatting)",
                      "Verschil",
                      "Opgebouwd saldo",
                    ].map((h) => (
                      <th key={h} className="p-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {p.maanden
                    .filter(
                      (m) =>
                        Number(m.maand.slice(0, 4)) === jaar &&
                        Number(m.maand.slice(5)) - 1 >= van &&
                        Number(m.maand.slice(5)) - 1 <= tot,
                    )
                    .map((m) => (
                      <tr key={m.maand} className="border-t align-top">
                        <th className="p-2 font-normal">
                          {m.maand}
                          {m.lopend ? " · lopend" : ""}
                        </th>
                        <td className="p-2">{geld(m.voorschot)}</td>
                        <td className="p-2">
                          {geld(m.kosten)}
                          {m.kosten === null && (
                            <p>Bekend deel: {geld(m.bekend)}</p>
                          )}
                          <details>
                            <summary>Opbouw</summary>
                            {m.producten.map((v) => (
                              <p key={v.product}>
                                {v.product}:{" "}
                                {v.verbruik === null
                                  ? "onbekend"
                                  : v.verbruik.toLocaleString("nl-NL", {
                                      maximumFractionDigits: 1,
                                    })}{" "}
                                {v.product === "elektriciteit" ? "kWh" : "m³"} ·{" "}
                                {geld(v.kosten)} · {v.dekking.toFixed(0)}%
                                dekking
                              </p>
                            ))}
                            {m.ontbrekend.map((v) => (
                              <p key={v}>{v}</p>
                            ))}
                            <p>
                              {m.vanaf} tot {m.tot} (exclusief)
                            </p>
                          </details>
                        </td>
                        <td className="p-2">{geld(m.verschil)}</td>
                        <td className="p-2">{geld(m.saldo)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </details>
      <footer className="mt-3 border-t pt-2 flex flex-wrap justify-between items-center gap-2 text-xs">
        <p>Informatieve raming · inclusief btw · geen afrekening</p>
        <Link href="/bedrijven/energieanalyse/beheer" className="rounded border border-emerald-800 px-3 py-2 font-semibold text-emerald-950">Tarieven en voorschot instellen</Link>
      </footer>
    </section>
  );
}
