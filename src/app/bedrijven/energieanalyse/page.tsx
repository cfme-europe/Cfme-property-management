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
import {
  EnergieSelectieValidatieFout,
  leesSelectie,
  type EnergieSelectieVeld,
  type Parameters,
} from "@/lib/energie/selectie";
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
  let validatiefout: { veld: EnergieSelectieVeld; bericht: string } | null =
    null;
  try {
    keuze = leesSelectie(parameters, bron);
  } catch (error) {
    validatiefout = {
      veld:
        error instanceof EnergieSelectieValidatieFout
          ? error.veld
          : "algemeen",
      bericht:
        error instanceof Error ? error.message : "Ongeldige selectie.",
    };
    keuze = leesSelectie({}, bron);
  }
  const { selectie, dragers } = keuze,
    bereik = bepaalEnergieDatumbereik(bron.meterstanden);
  const analyses = validatiefout
    ? []
    : dragers.map((drager) =>
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
          <Link
            href="/bedrijven"
            className="inline-flex min-h-11 items-center text-emerald-800"
          >
            ← Bedrijven
          </Link>
          <Link
            href="/bedrijven/energieanalyse/beheer"
            className="inline-flex min-h-11 items-center font-semibold text-emerald-800"
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
          {validatiefout ? (
            <p className="mt-6 inline-block rounded-full bg-amber-300/15 px-4 py-2 text-sm text-amber-100">
              Selectie niet toegepast — herstel de gemarkeerde keuze
            </p>
          ) : (
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
          )}
        </header>
        {!uitbreiding.beschikbaar && (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            Verbruiksanalyse beschikbaar. Tarieven, meterconfiguraties,
            maatregelen en rapportmomentopnames worden beschikbaar na de
            afzonderlijk goedgekeurde database-uitbreiding.
          </p>
        )}
        <EnergieFilters
          key={JSON.stringify(parameters)}
          bron={{
            woningen: bron.woningen,
            bedrijven: bron.bedrijven,
            verhuurperioden: bron.verhuurperioden,
          }}
          selectie={selectie}
          dragers={dragers}
          minimum={bereik?.vanaf ?? selectie.vanaf}
          maximum={bereik?.totEnMet ?? selectie.totEnMet}
          initialValues={parameters}
          validationError={
            validatiefout
              ? { veld: validatiefout.veld, bericht: validatiefout.bericht }
              : undefined
          }
        />
        {validatiefout && (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            De bestaande resultaten zijn niet vervangen. Pas de gemarkeerde
            selectie aan; de ingevulde keuzes blijven behouden.
          </p>
        )}
        {analyses.map((a) => {
          const kosten = berekenEnergiekosten(
            a.rijen.flatMap((r) => r.intervallen),
            tarieven,
            a.selectie.drager,
            a.eenheid,
            selectie.modus === "schatting",
          );
          const vergelijking = a.rijen
            .filter((rij) => rij.per_persoon_per_week !== null)
            .sort(
              (eerste, tweede) =>
                tweede.per_persoon_per_week! -
                eerste.per_persoon_per_week!,
            );
          const ontbrekendeNorm = a.rijen.filter(
            (rij) => rij.per_persoon_per_week === null,
          );
          const maximumNorm = Math.max(
            1,
            ...vergelijking.map((rij) => rij.per_persoon_per_week!),
          );
          const maximumTrend = Math.max(
            1,
            ...a.trends.flatMap((trend) =>
              trend.per_persoon_per_week === null
                ? []
                : [trend.per_persoon_per_week],
            ),
          );
          const tariefOntbreekt = kosten.ontbrekend.some((melding) =>
            melding.includes("tarief ontbreekt"),
          );
          const kostenTitel =
            kosten.totaal !== null
              ? `${getal(kosten.totaal, 2)} ${kosten.valuta}`
              : kosten.regels.length
                ? "Gedeeltelijk berekend"
                : tariefOntbreekt
                  ? "Tarief ontbreekt"
                  : "Niet volledig berekenbaar";
          return (
            <section key={a.selectie.drager} className="space-y-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-2xl font-bold capitalize">
                  {a.selectie.drager}
                </h2>
                <p className="text-sm text-slate-600">
                  {a.rijen.length} panden · {a.selectie.vanaf} t/m{" "}
                  {a.selectie.totEnMet}
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
                    kostenTitel,
                    kosten.regels.length && kosten.totaal === null
                      ? `Bekend subtotaal: ${getal(kosten.bekend_subtotaal, 2)} ${kosten.valuta ?? ""} — niet volledig`
                      : kosten.totaal !== null
                        ? `${kosten.geschat ? "Gedeeltelijk geschat · " : ""}${getal(a.per_persoon_per_week !== null && a.persoonsdagen > 0 ? kosten.totaal / (a.persoonsdagen / 7) : null, 2)} ${kosten.valuta ?? ""} per persoon/week`
                        : "Geen bedrag als nul ingevuld",
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
                    {label === "Kosten bruikbare intervallen" &&
                      kosten.totaal === null && (
                        <Link
                          href="/bedrijven/energieanalyse/beheer"
                          className="mt-3 inline-block min-h-11 py-2 font-semibold text-emerald-800 underline underline-offset-4"
                        >
                          Tarieven beheren
                        </Link>
                      )}
                  </article>
                ))}
              </div>
              <p className="rounded-xl bg-slate-200/70 p-4 text-sm">
                {a.benchmark_toelichting}
              </p>
              {(selectie.modus === "exact" ||
                (selectie.minimaleDekking ?? 100) !== 100 ||
                (selectie.kwaliteit ?? "alle") !== "alle") && (
                <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <h3 className="font-bold">
                    Actieve instellingen beperken de uitkomst
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {selectie.modus === "exact" && (
                      <li>
                        Alleen gemeten intervallen: meetintervallen die de
                        gekozen periodegrens kruisen worden niet verdeeld.
                      </li>
                    )}
                    {(selectie.minimaleDekking ?? 100) !== 100 && (
                      <li>
                        De benchmark gebruikt minimaal{" "}
                        {getal(selectie.minimaleDekking ?? 100, 0)}%
                        kalenderdekking en behoudt de betrouwbaarheidseisen.
                      </li>
                    )}
                    {(selectie.kwaliteit ?? "alle") !== "alle" && (
                      <li>
                        Datakwaliteitsfilter actief:{" "}
                        {selectie.kwaliteit === "betrouwbaar"
                          ? "metingen met controle- of onvoldoende-data-status worden niet getoond."
                          : "alleen resultaten met een controlesignaal worden getoond."}
                      </li>
                    )}
                  </ul>
                </aside>
              )}
              <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
                <h3 className="font-bold text-sky-950">Datadekking</h3>
                <p className="mt-2 text-2xl font-bold text-sky-950">
                  {getal(a.dekking_percentage)}% kalenderdekking
                </p>
                <p className="mt-1 text-sm text-sky-900">
                  Dit is het aandeel kalenderdagen met bruikbare meetgegevens,
                  niet de hoeveelheid verbruik.{" "}
                  {a.rijen.reduce((som, rij) => som + rij.meetperioden, 0)}{" "}
                  bruikbare van{" "}
                  {a.rijen.reduce(
                    (som, rij) => som + rij.beschikbare_meetperioden,
                    0,
                  )}{" "}
                  beschikbare intervallen.
                </p>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-lg font-bold">
                  Verbruik per persoon per week — pandvergelijking
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Geldige waarden staan van hoog naar laag. De balk toont
                  verbruik per aanwezige persoon per week; ontbrekende waarden
                  staan apart met de reden.
                </p>
                <div className="mt-4 space-y-3">
                  {vergelijking.map((rij) => (
                    <div
                      key={rij.woning_id}
                      className="grid gap-2 sm:grid-cols-[minmax(10rem,1fr)_minmax(8rem,2fr)_auto] sm:items-center"
                    >
                      <Link
                        href={`/woningen/${rij.woning_id}`}
                        className="min-h-11 py-2 font-semibold text-emerald-800 underline underline-offset-4"
                      >
                        {rij.adres}
                      </Link>
                      <div
                        className="h-6 overflow-hidden rounded bg-slate-100"
                        role="img"
                        aria-label={`${rij.adres}: ${getal(rij.per_persoon_per_week)} ${a.eenheid} per persoon per week`}
                      >
                        <div
                          className="h-full rounded bg-emerald-700"
                          style={{
                            width: `${(rij.per_persoon_per_week! / maximumNorm) * 100}%`,
                          }}
                        />
                      </div>
                      <strong className="text-sm">
                        {getal(rij.per_persoon_per_week)} {a.eenheid}
                      </strong>
                    </div>
                  ))}
                  {!vergelijking.length && (
                    <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                      Geen betrouwbare persoonsnormen beschikbaar voor deze
                      selectie.
                    </p>
                  )}
                </div>
                {!!ontbrekendeNorm.length && (
                  <div className="mt-5 border-t border-slate-200 pt-4">
                    <h4 className="font-semibold">
                      Geen vergelijkbare persoonsnorm
                    </h4>
                    <ul className="mt-2 space-y-2 text-sm">
                      {ontbrekendeNorm.map((rij) => (
                        <li key={rij.woning_id}>
                          <Link
                            href={`/woningen/${rij.woning_id}`}
                            className="font-semibold text-emerald-800 underline underline-offset-4"
                          >
                            {rij.adres}
                          </Link>
                          <span className="text-slate-700">
                            {" "}
                            —{" "}
                            {rij.meldingen[0] ??
                              "Geen betrouwbaar verbruik per persoon per week berekend."}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
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
                            className="inline-block min-h-11 py-2 font-bold underline decoration-emerald-300 underline-offset-4"
                          >
                            {r.adres}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">
                            {r.bedrijven.join(", ")}
                          </p>
                          <details className="mt-3 max-w-md">
                            <summary className="min-h-11 cursor-pointer py-3 text-xs text-emerald-800">
                              Bronnen en rekenstappen ({r.intervallen.length})
                            </summary>
                            {r.intervallen.map((i, index) => (
                              <div
                                key={index}
                                className="mt-2 rounded-lg bg-slate-50 p-3 text-xs"
                              >
                                <p>
                                  Pand {r.adres}
                                  {i.meteridentiteit
                                    ? ` · meter ${i.meteridentiteit}`
                                    : " · meterconfiguratie niet gekoppeld"}
                                </p>
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
                          <strong>{getal(r.dekking_percentage)}%</strong>
                          <p className="mt-1 text-xs text-slate-500">
                            kalenderdagen gedekt
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {getal(r.exacte_dekking_percentage)}% exact gemeten
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
                  <h3 className="font-bold">
                    Trend per pand — verbruik per persoon per week
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Elke balk is één interval met de werkelijke begin- en
                    einddatum. Intervallen van verschillende panden of perioden
                    worden niet opgeteld; dit zijn geen maandtotalen.
                  </p>
                  <div className="mt-4 space-y-5">
                    {a.rijen.map((rij) => {
                      const pandTrends = a.trends.filter(
                        (trend) => trend.woning_id === rij.woning_id,
                      );
                      const geldigeTrends = pandTrends.filter(
                        (trend) => trend.per_persoon_per_week !== null,
                      );
                      return (
                        <section
                          key={rij.woning_id}
                          className="border-t border-slate-200 pt-4 first:border-0 first:pt-0"
                        >
                          <Link
                            href={`/woningen/${rij.woning_id}`}
                            className="inline-block min-h-11 py-2 font-semibold text-emerald-800 underline underline-offset-4"
                          >
                            {rij.adres}
                          </Link>
                          {geldigeTrends.length ? (
                            <div
                              role="img"
                              aria-label={`Trend voor ${rij.adres}: verbruik per persoon per week per meetinterval`}
                              className="mt-2 overflow-x-auto"
                            >
                              <div
                                className="flex h-56 min-w-max items-end gap-3 border-b border-l border-slate-300 px-3"
                                style={{
                                  minWidth: `${Math.max(480, geldigeTrends.length * 120)}px`,
                                }}
                              >
                                {geldigeTrends.map((trend) => (
                                  <div
                                    key={`${trend.woning_id}-${trend.periode}`}
                                    className="flex h-full min-w-24 flex-1 flex-col items-center justify-end"
                                    title={`${rij.adres} · ${trend.periode}${trend.geschat ? " · geschat" : ""}`}
                                  >
                                    <strong className="mb-1 text-center text-xs">
                                      {getal(trend.per_persoon_per_week)}{" "}
                                      {a.eenheid}
                                    </strong>
                                    <div
                                      className={`w-10 rounded-t-md ${
                                        trend.geschat
                                          ? "bg-amber-500"
                                          : "bg-emerald-700"
                                      }`}
                                      style={{
                                        height: `${Math.max(
                                          trend.per_persoon_per_week === 0
                                            ? 1
                                            : 8,
                                          (trend.per_persoon_per_week! /
                                            maximumTrend) *
                                            160,
                                        )}px`,
                                      }}
                                    />
                                    <span className="mt-2 max-w-28 text-center text-xs text-slate-600">
                                      {trend.periode}
                                      {trend.geschat ? " · geschat" : ""}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-slate-600">
                              Geen betrouwbare persoonsnorm per meetinterval
                              beschikbaar.
                              {rij.meldingen[0] ? ` ${rij.meldingen[0]}` : ""}
                            </p>
                          )}
                        </section>
                      );
                    })}
                    {!a.rijen.length && (
                      <p className="text-sm text-slate-600">
                        Geen panden beschikbaar voor een trend in deze selectie.
                      </p>
                    )}
                  </div>
                </article>
                <article className="rounded-2xl bg-white p-6">
                  <h3 className="font-bold">Kosten en tariefverantwoording</h3>
                  {tariefOntbreekt && (
                    <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
                      Tarief ontbreekt voor één of meer intervallen. Er is geen
                      nulbedrag aangenomen.
                    </p>
                  )}
                  {kosten.totaal === null && kosten.regels.length > 0 && (
                    <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
                      Het bekende subtotaal is gedeeltelijk berekend en is geen
                      volledig kostenbedrag.
                    </p>
                  )}
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
                  <Link
                    href="/bedrijven/energieanalyse/beheer"
                    className="mt-3 inline-block min-h-11 py-2 font-semibold text-emerald-800 underline underline-offset-4"
                  >
                    Tarieven beheren
                  </Link>
                  <details className="mt-4 text-sm">
                    <summary className="min-h-11 cursor-pointer py-3">
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
