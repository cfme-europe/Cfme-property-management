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
  const ontbrekende = ids.filter(
    (id) =>
      !scope.some(
        (p) =>
          p.woning_id === id &&
          p.maanden.some(
            (m) => m.maand === `${jaar}-${String(maand + 1).padStart(2, "0")}`,
          ),
      ),
  );
  const key = `${jaar}-${String(maand + 1).padStart(2, "0")}`;
  const gekozen = scope.flatMap((p) =>
    p.maanden.filter((m) => m.maand === key).map((m) => ({ p, m })),
  );
  const som = (field: "kosten" | "voorschot" | "saldo" | "verschil") =>
    !gekozen.length ||
    ontbrekende.length ||
    gekozen.some((r) => r.m[field] === null)
      ? null
      : gekozen.reduce((s, r) => s + r.m[field]!, 0);
  const saldo = som("saldo");
  return (
    <section
      className="rounded-2xl border border-emerald-900/20 bg-white p-5 text-slate-950"
      aria-label="Informatief voorschotsaldo"
    >
      <header className="flex justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-emerald-950">
            Voorschot en geschatte kosten
          </h2>
          <p className="text-sm mt-1">
            Stroom + gas + water · inclusief btw · {key} · geen afrekening
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {[
          ["Afgesproken voorschot", som("voorschot")],
          ["Geschatte totale kosten", som("kosten")],
          ["Verschil deze maand", som("verschil")],
          [
            saldo === null
              ? "Opgebouwd saldo"
              : saldo < 0
                ? "Opgebouwd tekort"
                : "Opgebouwd tegoed",
            saldo,
          ],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl bg-slate-50 p-3">
            <p className="text-sm">{label}</p>
            <strong className="block mt-1 text-xl tabular-nums">
              {geld(value as number | null)}
            </strong>
          </div>
        ))}
      </div>
      {ontbrekende.length > 0 && (
        <p className="mt-3 text-amber-900">
          Voor {ontbrekende.length} geselecteerde pand(en) ontbreekt een
          voorschotafspraak. Geen volledig groepssaldo beschikbaar.
        </p>
      )}
      {!gekozen.length && (
        <p className="mt-3">Geen afspraakgegevens in de geselecteerde maand.</p>
      )}
      {gekozen.some((r) => r.m.lopend) && (
        <p className="mt-3 font-semibold">
          Lopende maand: alleen tot de getoonde peildatum, geen maandprognose.
          Ontbrekende metingen houden het saldo onbekend.
        </p>
      )}
      <p className="mt-3 text-sm">
        Positief = informatief tegoed; negatief = informatief tekort. Het saldo
        telt vanaf het startsaldo en de startdatum van de klantafspraak.
        Grafiek- en maandfilters veranderen deze berekening niet. Voorschotten
        zijn afspraken, geen gecontroleerde betalingen.
      </p>
      <details className="mt-3">
        <summary className="cursor-pointer font-semibold">
          Maanden en onderbouwing
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
    </section>
  );
}
