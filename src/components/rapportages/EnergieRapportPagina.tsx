import type { EnergieKlantSnapshot } from "@/lib/energie/snapshot";
const number = (n: number | null, d = 1) =>
  n === null ? "—" : n.toLocaleString("nl-NL", { maximumFractionDigits: d });
export default function EnergieRapportPagina({
  snapshot,
  adres,
  pagina = 3,
  totaalPaginas = 3,
}: {
  snapshot: EnergieKlantSnapshot;
  adres: string;
  pagina?: number;
  totaalPaginas?: number;
}) {
  return (
    <section
      data-energiepagina
      className="mx-auto max-w-5xl break-before-page rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:shadow-none"
    >
      <header className="flex items-start justify-between gap-4 border-b border-emerald-300 pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-700">
            CFME Control · Energie & resultaat
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Grip op verbruik.
            <br />
            Zicht op vooruitgang.
          </h2>
          <p className="mt-2 text-xs text-slate-500">
            {adres} · {snapshot.vanaf} → {snapshot.tot} (einde exclusief)
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white">
          Pagina {pagina} van {totaalPaginas}
        </span>
      </header>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {snapshot.producten.map((p) => (
          <article
            key={p.product}
            className="rounded-xl bg-slate-950 p-5 text-white"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
              {p.product}
            </p>
            <p className="mt-3 text-3xl font-black">
              {number(p.verbruik)}{" "}
              <span className="text-sm font-normal text-slate-300">
                {p.eenheid}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {number(p.verbruik_per_persoon_per_periode)} {p.eenheid} per
              persoon in de periode
            </p>
            <p className="mt-2 text-xs text-slate-300">
              {number(p.norm)} {p.eenheid} / persoon / week
            </p>
            <div className="mt-4 border-t border-white/15 pt-3">
              <p className="text-lg font-bold">
                {p.kosten.totaal === null
                  ? "Kosten onvolledig"
                  : `${number(p.kosten.totaal, 2)} ${p.kosten.valuta}`}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {p.kosten.geschat
                  ? "Naar rato berekende kosten"
                  : "Kosten beschikbare intervallen"}
              </p>
            </div>
          </article>
        ))}
      </div>
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Hoe betrouwbaar is het beeld?</h3>
          <span className="text-xs text-slate-500">Kalenderdekking</span>
        </div>
        <div className="mt-3 space-y-3">
          {snapshot.producten.map((p) => (
            <div
              key={p.product}
              className="grid grid-cols-[100px_1fr_auto] items-center gap-4 text-sm"
            >
              <span className="capitalize">{p.product}</span>
              <div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${p.kwaliteit === "exact" ? "bg-emerald-600" : "bg-amber-500"}`}
                    style={{
                      width: `${Math.max(0, Math.min(100, p.dekking))}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-500">
                  {number(p.dekking)}% tijdsdekking
                  {p.naar_rato_berekend ? " · naar rato berekend" : ""} ·{" "}
                  {p.kwaliteit.replaceAll("_", " ")}
                </p>
              </div>
              <strong>{number(p.dekking)}%</strong>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-600">
          Gedeeltelijke dekking betekent dat de beschikbare metingen niet de
          hele rapportperiode beschrijven. Geschatte delen zijn geen
          afzonderlijke metingen.
        </p>
      </section>
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="font-bold">Ontwikkeling & vergelijking</h3>
          {snapshot.producten.map((p) => (
            <div key={p.product} className="mt-3 text-xs">
              <p className="font-semibold capitalize">{p.product}</p>
              <p className="mt-1 text-slate-600">
                Vorige vergelijkbare periode:{" "}
                {p.verschil_percentage === null
                  ? "nog niet betrouwbaar vergelijkbaar"
                  : `${p.verschil_percentage >= 0 ? "+" : ""}${number(p.verschil_percentage)}% per persoon/week`}
              </p>
              <p className="mt-1 text-slate-600">
                {p.mediaan === null
                  ? "Nog onvoldoende vergelijkbare benchmarkpanden"
                  : `Mediaan ${number(p.mediaan)} ${p.eenheid}/persoon/week · ${p.benchmark_aantal} panden`}
              </p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="font-bold">Kosten onderbouwd</h3>
          {snapshot.producten.map((p) => (
            <div key={p.product} className="mt-3 text-xs text-slate-600">
              <p className="font-semibold capitalize text-slate-900">
                {p.product}
              </p>
              <p>{number(p.kosten_per_persoon_per_week,2)} {p.kosten.valuta??""} per persoon/week</p>
              <p>
                Variabel{" "}
                {number(p.kosten.regels.length ? p.kosten.variabel : null, 2)} ·
                vast {number(p.kosten.regels.length ? p.kosten.vast : null, 2)}
              </p>
              <p>
                Belastingen{" "}
                {number(
                  p.kosten.regels.length ? p.kosten.belastingen : null,
                  2,
                )}{" "}
                · btw {number(p.kosten.regels.length ? p.kosten.btw : null, 2)}{" "}
                {p.kosten.valuta ?? ""}
              </p>
              <p className="mt-1">
                {p.kosten.ontbrekend.length
                  ? "Ontbrekende tarieven of grensstanden; geen volledig kostentotaal."
                  : [...new Set(p.kosten.regels.map((r) => r.bron))].join(
                      ", ",
                    ) || "Nog geen tarieven vastgelegd."}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-6 rounded-xl bg-emerald-50 p-5">
        <h3 className="font-bold text-emerald-950">
          Wat CFME onderzoekt en verbetert
        </h3>
        {!snapshot.maatregelen.length ? (
          <p className="mt-2 text-sm text-emerald-900">
            Nog geen klantgerichte maatregelen in deze momentopname vastgelegd.
            Er wordt geen gerealiseerde besparing geclaimd.
          </p>
        ) : (
          snapshot.maatregelen.slice(0, 3).map((m, i) => (
            <div
              key={i}
              className="mt-3 border-t border-emerald-200 pt-3 text-sm"
            >
              <div className="flex justify-between gap-3">
                <strong>{m.titel}</strong>
                <span className="text-xs">{m.status}</span>
              </div>
              <p className="mt-1 text-xs">{m.toelichting}</p>
            </div>
          ))
        )}
        {snapshot.maatregelen.length > 3 && (
          <p className="mt-2 text-xs">
            Nog {snapshot.maatregelen.length - 3} maatregelen in de bijbehorende
            Excel-momentopname.
          </p>
        )}
      </section>
      <footer className="mt-5 border-t pt-3 text-[10px] leading-4 text-slate-500">
        <p>{snapshot.conclusie}</p>
        <p className="mt-1">
          Vastgelegd {snapshot.gegenereerd_op.slice(0, 10)} · Rekenregels{" "}
          {snapshot.versie} · Gebruikte meetperioden en tariefregels beschikbaar
          in de energiespecificatie.
        </p>
      </footer>
    </section>
  );
}
