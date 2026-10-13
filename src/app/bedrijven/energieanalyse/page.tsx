import Link from "next/link";
import EnergieFilters from "@/components/energie/EnergieFilters";
import {
  getEnergieAnalyseBrondata,
  getEnergieUitbreiding,
} from "@/services/energieanalyse-server";
import {
  bouwEnergiePortfolioAnalyse,
  bepaalEnergieDatumbereik,
} from "@/lib/energie/portfolio-analyse";
import { leesSelectie, type Parameters } from "@/lib/energie/selectie";
import { berekenEnergiekosten } from "@/lib/energie/tarieven";
export const dynamic = "force-dynamic";
const getal = (v: number | null, digits = 1) =>
  v === null
    ? "—"
    : new Intl.NumberFormat("nl-NL", { maximumFractionDigits: digits }).format(
        v,
      );
export default async function EnergieanalysePage({
  searchParams,
}: {
  searchParams: Promise<Parameters>;
}) {
  const [parameters, bron, uitbreiding] = await Promise.all([
    searchParams,
    getEnergieAnalyseBrondata(),
    getEnergieUitbreiding(),
  ]);
  bron.meterconfiguraties = uitbreiding.configuraties;
  let keuze: ReturnType<typeof leesSelectie>;
  try {
    keuze = leesSelectie(parameters, bron);
  } catch (e) {
    return (
      <main className="p-10">
        <h1 className="text-2xl font-bold">Controleer de selectie</h1>
        <p role="alert" className="mt-4">
          {e instanceof Error ? e.message : "Ongeldige selectie"}
        </p>
        <Link
          href="/bedrijven/energieanalyse"
          className="mt-5 inline-block underline"
        >
          Selectie herstellen
        </Link>
      </main>
    );
  }
  const { selectie, dragers } = keuze,
    bereik = bepaalEnergieDatumbereik(bron.meterstanden);
  const analyses = dragers.map((drager) =>
    bouwEnergiePortfolioAnalyse(bron, { ...selectie, drager }),
  );
  const actieveTariefIds = new Set(
    uitbreiding.tarieven.map((t) => t.voorganger_id).filter(Boolean),
  );
  const tarieven = uitbreiding.tarieven.filter(
    (t) => !actieveTariefIds.has(t.id),
  );
  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-950 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap justify-between gap-4">
          <Link href="/bedrijven" className="text-emerald-800">
            ← Bedrijven
          </Link>
          <Link
            href="/bedrijven/energieanalyse/beheer"
            className="font-semibold text-emerald-800"
          >
            Tarieven, meters en maatregelen →
          </Link>
        </div>
        <header className="relative overflow-hidden rounded-3xl bg-slate-950 p-8 text-white sm:p-10">
          <div className="absolute -right-14 -top-20 h-72 w-72 rounded-full border-[40px] border-emerald-400/10" />
          <p className="text-xs font-bold uppercase tracking-[.25em] text-emerald-300">
            CFME · Energie-intelligence
          </p>
          <h1 className="relative mt-4 max-w-3xl text-4xl font-bold tracking-tight">
            Inzicht dat leidt tot
            <br />
            aantoonbaar resultaat.
          </h1>
          <p className="relative mt-4 max-w-2xl text-slate-300">
            Volg verbruik, onderzoek afwijkingen en meet het effect van
            maatregelen. Elke uitkomst houdt haar bron, periode en
            betrouwbaarheid.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-4 py-2">
              {selectie.vanaf} → {selectie.totEnMet}
            </span>
            <span className="rounded-full bg-emerald-400/15 px-4 py-2 text-emerald-200">
              {selectie.modus === "schatting"
                ? "Schattingen zichtbaar ingeschakeld"
                : "Gemeten intervallen"}
            </span>
          </div>
        </header>
        {!uitbreiding.beschikbaar && (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            Verbruiksanalyse beschikbaar. Tarieven, meterconfiguraties,
            maatregelen en rapportmomentopnames worden beschikbaar na de
            afzonderlijk goedgekeurde database-uitbreiding.
          </p>
        )}
        <EnergieFilters
          key={JSON.stringify(selectie)}
          bron={{
            woningen: bron.woningen,
            bedrijven: bron.bedrijven,
            verhuurperioden: bron.verhuurperioden,
          }}
          selectie={selectie}
          dragers={dragers}
          minimum={bereik?.vanaf ?? selectie.vanaf}
          maximum={bereik?.totEnMet ?? selectie.totEnMet}
        />
        {analyses.map((a) => {
          const kosten = berekenEnergiekosten(
            a.rijen.flatMap((r) => r.intervallen),
            tarieven,
            a.selectie.drager,
            a.eenheid,
            selectie.modus === "schatting",
          );
          return (
            <section key={a.selectie.drager} className="space-y-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-2xl font-bold capitalize">
                  {a.selectie.drager}
                </h2>
                <p className="text-sm text-slate-600">
                  {a.rijen.length} panden · {getal(a.dekking_percentage)}%
                  kalenderdekking
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [
                    "Verbruik",
                    `${getal(a.totaal)} ${a.eenheid}`,
                    a.selectie.drager === "water" && a.totaal !== null
                      ? `${getal(a.totaal * 1000, 0)} liter`
                      : "Bruikbare meetintervallen",
                  ],
                  [
                    "Per persoon / week",
                    `${getal(a.per_persoon_per_week)} ${a.eenheid}`,
                    `${getal(a.persoonsdagen, 0)} geregistreerde persoonsdagen`,
                  ],
                  [
                    "Kosten bruikbare intervallen",
                    kosten.totaal === null
                      ? "Nog niet volledig"
                      : `${getal(kosten.totaal, 2)} ${kosten.valuta}`,
                    `${kosten.geschat ? "Geschat · " : ""}${getal(kosten.totaal!==null && a.per_persoon_per_week!==null && a.persoonsdagen>0 ? kosten.totaal/(a.persoonsdagen/7) : null,2)} ${kosten.valuta??""} per persoon/week`,
                  ],
                  [
                    "Benchmarkmediaan",
                    `${getal(a.mediaan_per_persoon_per_week)} ${a.eenheid}`,
                    `${a.panden_in_benchmark} geschikte panden`,
                  ],
                ].map(([label, value, detail]) => (
                  <article
                    key={label}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight">
                      {value}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">{detail}</p>
                  </article>
                ))}
              </div>
              <p className="rounded-xl bg-slate-200/70 p-4 text-sm">
                {a.benchmark_toelichting}
              </p>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Pand / gebruikte periode",
                        "Verbruik",
                        "Per persoon/week",
                        "Kalenderdekking",
                        "Betrouwbaarheid",
                        "Mediaanverschil",
                      ].map((h) => (
                        <th key={h} className="p-4">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {a.rijen.map((r) => (
                      <tr
                        key={r.woning_id}
                        className="border-t border-slate-100"
                      >
                        <td className="p-4">
                          <Link
                            href={`/woningen/${r.woning_id}`}
                            className="font-bold underline decoration-emerald-300 underline-offset-4"
                          >
                            {r.adres}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">
                            {r.bedrijven.join(", ")}
                          </p>
                          <details className="mt-3 max-w-md">
                            <summary className="cursor-pointer text-xs text-emerald-800">
                              Bronnen en rekenstappen ({r.intervallen.length})
                            </summary>
                            {r.intervallen.map((i, index) => (
                              <div
                                key={index}
                                className="mt-2 rounded-lg bg-slate-50 p-3 text-xs"
                              >
                                <p>
                                  {i.vanDatum} → {i.totDatum}
                                  {i.geschat ? " · geschat" : ""}
                                </p>
                                <p>
                                  Bronopnames {i.bronIds.join(" → ")} ·{" "}
                                  {i.bronVanaf} → {i.bronTot}
                                </p>
                                <p>
                                  {getal(i.waarde, 3)} {a.eenheid} ·{" "}
                                  {getal(i.persoonsdagen)} persoonsdagen
                                </p>
                                <p>Norm = verbruik ÷ (persoonsdagen / 7)</p>
                                {i.meldingen.map((m) => (
                                  <p key={m} className="mt-1 text-amber-900">
                                    {m}
                                  </p>
                                ))}
                              </div>
                            ))}
                          </details>
                        </td>
                        <td className="p-4 font-semibold">
                          {getal(r.totaal)} {a.eenheid}
                        </td>
                        <td className="p-4">{getal(r.per_persoon_per_week)}</td>
                        <td className="min-w-36 p-4">
                          <span>{getal(r.dekking_percentage)}%</span>
                          <div className="mt-2 h-2 rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-emerald-600"
                              style={{ width: `${r.dekking_percentage}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {getal(r.exacte_dekking_percentage)}% exact
                          </p>
                        </td>
                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${r.betrouwbaarheid === "exact" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
                          >
                            {r.betrouwbaarheid.replaceAll("_", " ")}
                          </span>
                          <p className="mt-2 text-xs">
                            {r.signaal === "onvoldoende_data"
                              ? "Geen betrouwbare vergelijking"
                              : r.signaal}
                          </p>
                        </td>
                        <td className="p-4">
                          {getal(r.afwijking_mediaan_percentage)}
                          {r.afwijking_mediaan_percentage !== null ? "%" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!a.rijen.length && (
                  <p className="p-6">Geen panden binnen deze selectie.</p>
                )}
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <article className="rounded-2xl bg-white p-6">
                  <h3 className="font-bold">Werkelijke meetperioden</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Grensoverschrijdende intervallen worden niet als volledige
                    maand gepresenteerd.
                  </p>
                  <div className="mt-4 max-h-64 space-y-3 overflow-y-auto">
                    {a.trends.map((t, n) => (
                      <div
                        key={n}
                        className="flex justify-between gap-4 border-b pb-2 text-sm"
                      >
                        <span>
                          {t.maand}
                          {t.geschat ? " · geschat" : ""}
                        </span>
                        <strong>
                          {getal(t.totaal)} {a.eenheid}
                        </strong>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="rounded-2xl bg-white p-6">
                  <h3 className="font-bold">Kosten en tariefverantwoording</h3>
                  <p className="mt-3 text-sm">
                    Variabel {getal(kosten.variabel, 2)} · vast{" "}
                    {getal(kosten.vast, 2)} · belastingen{" "}
                    {getal(kosten.belastingen, 2)} · btw {getal(kosten.btw, 2)}{" "}
                    {kosten.valuta ?? ""}
                  </p>
                  {kosten.ontbrekend.map((m) => (
                    <p key={m} className="mt-2 text-xs text-amber-900">
                      {m}
                    </p>
                  ))}
                  <details className="mt-4 text-sm">
                    <summary className="cursor-pointer">
                      Tariefregels ({kosten.regels.length})
                    </summary>
                    {kosten.regels.map((r, n) => (
                      <p key={n} className="mt-2 text-xs">
                        {r.vanaf} → {r.tot} · {r.soort} ·{" "}
                        {getal(r.hoeveelheid, 3)} × {r.eenheidsprijs} ·{" "}
                        {getal(r.totaal, 2)} {r.valuta} · {r.bron}
                        {r.geschat ? " · geschat" : ""}
                      </p>
                    ))}
                  </details>
                </article>
              </div>
            </section>
          );
        })}
        <aside className="rounded-3xl bg-slate-900 p-7 text-white">
          <h2 className="text-xl font-bold">
            Van afwijking naar aantoonbaar resultaat
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
            Leg een onderzoek of maatregel vast, kies vooraf de
            referentieperiode en controleer na uitvoering opnieuw. Onverklaard
            verbruik is geen bewijs van misbruik. Verschil met een mediaan is
            een onderzoekskans, geen gerealiseerde besparing.
          </p>
          <Link
            href="/bedrijven/energieanalyse/beheer"
            className="mt-5 inline-block rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950"
          >
            Maatregelen en resultaat volgen
          </Link>
        </aside>
      </div>
    </main>
  );
}
