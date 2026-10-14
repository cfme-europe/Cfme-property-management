import Link from "next/link";
import { cookies } from "next/headers";
import {
  bouwAnoniemeEnergieDataset,
  bouwEnergieMaandAnalyse,
  decodeerEnergieAnoniemeSelectie,
  ENERGIE_ANONIEME_SELECTIE_COOKIE,
  leesEnergieMaandSelectie,
  maximumEnergieMaandwaarde,
  parseEnergieMaand,
  waardeEnergieMaand,
  type EnergieMaandAnalyse,
  type EnergieMaandAnalyseSelectie,
  type EnergieMaandMeting,
  type EnergieMaandParameters,
  type EnergieMaandWeergave,
} from "@/lib/energie/maand-analyse";
import {
  bouwEnergiePortfolioAnalyse,
  type Energiedrager,
} from "@/lib/energie/portfolio-analyse";
import { vorigeDag } from "@/lib/energie/rekenregels";
import { beoordeelMaatregel } from "@/lib/energie/resultaten";
import EnergieMaandSelectie from "./EnergieMaandSelectie";
import {
  getEnergieAnalyseBrondata,
  getEnergieUitbreiding,
  type EnergieMaatregel,
} from "@/services/energieanalyse-server";

const productNamen: Record<Energiedrager, string> = {
  elektriciteit: "Elektriciteit totaal",
  dagstroom: "Dagstroom",
  nachtstroom: "Nachtstroom",
  gas: "Gas",
  water: "Water",
};
const kleuren = [
  "#0f766e",
  "#2563eb",
  "#7c3aed",
  "#c2410c",
  "#be123c",
  "#4d7c0f",
  "#0369a1",
  "#a21caf",
  "#b45309",
  "#4338ca",
  "#047857",
  "#9f1239",
];
const getal = (value: number | null, digits = 2) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("nl-NL", { maximumFractionDigits: digits }).format(
        value,
      );
const datum = (value: string) =>
  new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
const euro = (value: number | null, currency: string | null) =>
  value === null || !currency
    ? null
    : new Intl.NumberFormat("nl-NL", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);

function monthColor(month: string) {
  return kleuren[Number(month.slice(5)) - 1];
}

function selectedQuery(selectie: EnergieMaandAnalyse["selectie"]) {
  const params = new URLSearchParams();
  selectie.maanden.forEach((month) => params.append("maand", month));
  selectie.bedrijfIds.forEach((id) => params.append("bedrijf", String(id)));
  selectie.woningIds.forEach((id) => params.append("woning", String(id)));
  params.set("referentiemaand", selectie.referentiemaand);
  params.set("drager", selectie.drager);
  params.set("maat", selectie.maat);
  params.set("aggregatie", selectie.aggregatie);
  return params;
}

function monthTitle(month: string) {
  const period = parseEnergieMaand(month);
  return new Intl.DateTimeFormat("nl-NL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${period.vanaf}T00:00:00Z`));
}

function valueDetails(
  month: EnergieMaandMeting,
  analyse: EnergieMaandAnalyse,
) {
  if (analyse.selectie.maat === "kosten") {
    if (analyse.selectie.aggregatie === "persoon")
      return euro(month.kostenPerPersoonPerWeek, month.kosten.valuta);
    return euro(month.kosten.totaal, month.kosten.valuta);
  }
  return analyse.selectie.aggregatie === "persoon"
    ? getal(month.perPersoonPerWeek)
    : getal(month.verbruik);
}

function valueUnit(month: EnergieMaandMeting, analyse: EnergieMaandAnalyse) {
  if (analyse.selectie.maat === "kosten") {
    const prefix = month.kosten.valuta ?? "Kosten";
    return analyse.selectie.aggregatie === "persoon"
      ? `${prefix} per persoon/week`
      : `${prefix} maandtotaal`;
  }
  return analyse.selectie.aggregatie === "persoon"
    ? `${analyse.eenheid} per persoon/week`
    : `${analyse.eenheid} maandtotaal`;
}

function metricValue(month: EnergieMaandMeting, analyse: EnergieMaandAnalyse) {
  return waardeEnergieMaand(
    month,
    analyse.selectie.maat,
    analyse.selectie.aggregatie,
  );
}

function MonthDetails({
  month,
  analyse,
  intern,
}: {
  month: EnergieMaandMeting;
  analyse: EnergieMaandAnalyse;
  intern: boolean;
}) {
  return (
    <details className="mt-2 border-t border-slate-100 pt-1">
      <summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold text-emerald-900">
        Details · meetperiode, dekking en kosten
      </summary>
      <div className="space-y-2 pb-2 text-sm text-slate-700">
        <p>
          {monthTitle(month.maand)}: {month.vanaf} t/m {vorigeDag(month.tot)} ·{" "}
          {getal(month.dekking, 1)}% tijdsdekking.
        </p>
        <p>
          Meetgegevens beschikbaar t/m{" "}
          {month.laatsteMeetdatum ? datum(month.laatsteMeetdatum) : "onbekend"}.
        </p>
        {month.status === "gedeeltelijk" && (
          <p>
            Werkelijk toegerekend verbruik: {getal(month.verbruik)} {analyse.eenheid}
            {month.periodes.length
              ? ` over ${month.periodes.map((period) => `${period.vanaf}–${period.tot}`).join(", ")}`
              : ""}
            . Dit is geen opgehoogde volle maand.
          </p>
        )}
        {month.status === "volledig" && month.naarRato && (
          <p>
            De maand heeft volledige tijdsdekking door interpolatie tussen
            bruikbare meterstanden. Dit is niet hetzelfde als dagelijks gemeten
            verbruik.
          </p>
        )}
        {!month.persoonsdagen && (
          <p>Er zijn geen geregistreerde persoonsdagen; de persoonsnorm is onbekend.</p>
        )}
        {intern && (
          <p>{getal(month.persoonsdagen, 1)} geregistreerde persoonsdagen.</p>
        )}
        {month.periodes.map((period) => (
          <p key={`${period.vanaf}:${period.tot}`}>
            Verbruiksinterval {period.vanaf}–{period.tot} (einddatum exclusief):{" "}
            {getal(period.verbruik)} {analyse.eenheid}.
          </p>
        ))}
        {month.status === "geen" && (
          <p>Er zijn geen bruikbare metingen die deze maand afdekken.</p>
        )}
        {analyse.selectie.maat === "kosten" && month.kosten.totaal === null && (
          <p>
            Kosten onbekend; gemeten verbruik blijft beschikbaar.{" "}
            {month.kosten.ontbrekend.slice(0, 2).join(" · ")}
          </p>
        )}
        {intern &&
          month.kosten.regels.map((regel, index) => (
            <p key={`${regel.tarief_id}:${regel.vanaf}:${index}`}>
              {regel.vanaf}–{regel.tot} · {regel.soort}: {getal(regel.hoeveelheid, 3)}{" "}
              × {regel.eenheidsprijs} = {euro(regel.totaal, regel.valuta)}{" "}
              {regel.inclusief_btw ? "incl. btw" : "excl. btw"}.
            </p>
          ))}
      </div>
    </details>
  );
}

function MetricRow({
  month,
  analyse,
  maximum,
  intern,
}: {
  month: EnergieMaandMeting;
  analyse: EnergieMaandAnalyse;
  maximum: number;
  intern: boolean;
}) {
  const value = metricValue(month, analyse);
  const canDrawBar = month.status === "volledig" && value !== null;
  const percent =
    canDrawBar && maximum > 0
      ? Math.max(0, Math.min(100, (value / maximum) * 100))
      : 0;
  const state =
    month.status === "geen"
      ? month.maand > new Date().toISOString().slice(0, 7)
        ? "Nog geen meetgegevens"
        : "Geen gegevens"
      : month.status === "gedeeltelijk"
        ? "Onvolledig"
        : value === null && analyse.selectie.aggregatie === "persoon" &&
            month.persoonsdagen === 0
          ? "Bewoning onbekend"
          : value === null && analyse.selectie.maat === "kosten"
            ? "Kosten onbekend"
            : null;
  const supportingValue =
    analyse.selectie.maat === "kosten"
      ? `${getal(month.verbruik)} ${analyse.eenheid} verbruik`
      : euro(month.kosten.totaal, month.kosten.valuta);

  return (
    <div className="grid grid-cols-[minmax(7.5rem,0.85fr)_minmax(4rem,2fr)_minmax(7rem,1fr)] items-center gap-2 py-2 sm:grid-cols-[minmax(10rem,1fr)_minmax(8rem,2fr)_minmax(11rem,1fr)] sm:gap-4">
      <p className="text-sm font-semibold capitalize">{monthTitle(month.maand)}</p>
      <div
        role="img"
        aria-label={`${monthTitle(month.maand)}: ${state ?? `${valueDetails(month, analyse)} ${valueUnit(month, analyse)}`}`}
        className="h-4 overflow-hidden rounded-full bg-slate-100"
      >
        {canDrawBar && (
          <div
            className="h-full rounded-full"
            style={{
              width: `${percent}%`,
              minWidth: value === 0 ? "0" : undefined,
              backgroundColor: monthColor(month.maand),
            }}
          />
        )}
        {month.status === "gedeeltelijk" && (
          <div
            className="h-full border-y border-dashed"
            style={{ width: "100%", borderColor: monthColor(month.maand) }}
          />
        )}
      </div>
      <div className="text-right">
        <p className="text-sm font-bold tabular-nums">
          {state ??
            `${valueDetails(month, analyse) ?? "—"} ${valueUnit(month, analyse)}`}
        </p>
        {supportingValue && (
          <p className="text-xs text-slate-600">{supportingValue}</p>
        )}
        {month.status === "gedeeltelijk" && month.verbruik !== null && (
          <p className="text-xs text-amber-900">
            {getal(month.verbruik)} {analyse.eenheid} gemeten
          </p>
        )}
      </div>
      <div className="col-span-3">
        <MonthDetails month={month} analyse={analyse} intern={intern} />
      </div>
    </div>
  );
}

function PresentationChart({
  analyse,
  presentation,
  intern,
}: {
  analyse: EnergieMaandAnalyse;
  presentation: boolean;
  intern: boolean;
}) {
  const maximum = maximumEnergieMaandwaarde(
    analyse.woningen,
    analyse.selectie.maat,
    analyse.selectie.aggregatie,
  );
  const referenceMonth = analyse.selectie.referentiemaand;
  const rows = analyse.woningen.map((woning) => (
    <article
      key={woning.id}
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
    >
      <header className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold">
          {presentation ? `Pand ${String(woning.id).padStart(2, "0")}` : woning.adres}
        </h3>
        {!presentation && (
          <p className="text-xs text-slate-600">
            Meetgegevens t/m{" "}
            {woning.maanden
              .map((month) => month.laatsteMeetdatum)
              .filter((date): date is string => date !== null)
              .sort()
              .at(-1) ?? "onbekend"}
          </p>
        )}
      </header>
      {woning.maanden.map((month) => (
        <MetricRow
          key={month.maand}
          month={month}
          analyse={analyse}
          maximum={maximum}
          intern={intern}
        />
      ))}
      {referenceMonth && (
        <span className="sr-only">
          {`Referentiemaand voor sorteervolgorde: ${monthTitle(referenceMonth)}`}
        </span>
      )}
    </article>
  ));
  return <div className="space-y-3">{rows}</div>;
}

function CustomerMeasures({
  measures,
  bron,
  analyse,
}: {
  measures: EnergieMaatregel[];
  bron: Awaited<ReturnType<typeof getEnergieAnalyseBrondata>>;
  analyse: EnergieMaandAnalyse;
}) {
  const superseded = new Set(measures.map((measure) => measure.voorganger_id));
  const visible = measures.filter(
    (measure) =>
      !superseded.has(measure.id) &&
      measure.klant_goedgekeurd &&
      analyse.selectie.woningIds.includes(measure.woning_id) &&
      measure.product === analyse.selectie.drager,
  );
  if (!visible.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold">Aandachtspunten, maatregelen en nameting</h2>
      <ul className="mt-3 divide-y divide-slate-100">
        {visible.map((measure) => {
          let result: ReturnType<typeof beoordeelMaatregel> | null = null;
          if (measure.controle_vanaf && measure.controle_tot) {
            const comparison = (from: string, to: string) =>
              bouwEnergiePortfolioAnalyse(bron, {
                niveau: "woning",
                woningId: measure.woning_id,
                drager: measure.product as Energiedrager,
                vanaf: from,
                totEnMet: to,
                archief: true,
              }).rijen[0];
            result = beoordeelMaatregel(
              comparison(measure.referentie_vanaf, measure.referentie_tot),
              comparison(measure.controle_vanaf, measure.controle_tot),
              { vanaf: measure.referentie_vanaf, tot: measure.referentie_tot },
              { vanaf: measure.controle_vanaf, tot: measure.controle_tot },
            );
          }
          return (
            <li key={measure.id} className="py-3">
              <p className="font-semibold">{measure.titel}</p>
              <p className="text-sm text-slate-600">
                {measure.status}
                {measure.uitvoerdatum ? ` · ${datum(measure.uitvoerdatum)}` : ""}
                {" · "}
                {bron.woningen.find((woning) => woning.id === measure.woning_id)?.adres}
              </p>
              {measure.klant_toelichting.trim() && (
                <p className="mt-1 text-sm">{measure.klant_toelichting}</p>
              )}
              {result && (
                <p className="mt-1 text-sm">
                  Nameting:{" "}
                  {result.verschil_per_persoon_per_week === null
                    ? "nog niet vergelijkbaar"
                    : `${getal(result.verschil_per_persoon_per_week)} ${analyse.eenheid} per persoon/week gemeten verschil`}
                  . {result.conclusie}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-slate-600">
        Een benchmarkafwijking is geen bewezen besparing. Lagere kosten kunnen
        ook door gewijzigde tarieven komen.
      </p>
    </section>
  );
}

function tabsHref(
  selection: EnergieMaandAnalyse["selectie"],
  view: EnergieMaandWeergave,
) {
  const params = selectedQuery(selection);
  params.set("weergave", view);
  return `/bedrijven/energieanalyse?${params.toString()}`;
}

function PageTabs({
  selection,
  view,
}: {
  selection: EnergieMaandAnalyse["selectie"];
  view: EnergieMaandWeergave;
}) {
  const tabs: Array<[EnergieMaandWeergave, string]> = [
    ["intern", "Analyse bekijken"],
    ["klant", "Klantversie"],
    ["selectie", "Anonieme presentatie"],
  ];
  return (
    <nav
      aria-label="Energieanalyse weergave"
      className="grid grid-cols-1 gap-2 rounded-2xl bg-white p-2 sm:grid-cols-3"
    >
      {tabs.map(([key, label]) => (
        <Link
          key={key}
          href={tabsHref(selection, key)}
          aria-current={view === key || (key === "selectie" && view === "anoniem") ? "page" : undefined}
          className={`flex min-h-11 items-center justify-center rounded-xl px-3 text-center text-sm font-semibold ${
            view === key || (key === "selectie" && view === "anoniem")
              ? "bg-emerald-800 text-white"
              : "text-emerald-900 hover:bg-emerald-50"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function AnoniemeGrafiek({
  dataset,
}: {
  dataset: ReturnType<typeof bouwAnoniemeEnergieDataset>;
}) {
  const values = dataset.woningen.flatMap((woning) =>
    woning.maanden
      .filter((month) => month.status === "volledig")
      .map((month) =>
        dataset.maat === "kosten"
          ? dataset.aggregatie === "persoon"
            ? month.kostenPerPersoonPerWeek
            : month.kosten
          : dataset.aggregatie === "persoon"
            ? month.perPersoonPerWeek
            : month.verbruik,
      )
      .filter((value): value is number => value !== null),
  );
  const maximum = Math.max(0, ...values);
  return (
    <div className="space-y-3">
      {dataset.woningen.map((woning) => (
        <article key={`${woning.klant}:${woning.pand}`} className="rounded-2xl bg-white p-4">
          <h3 className="font-bold">{woning.klant} · {woning.pand}</h3>
          {woning.maanden.map((month) => {
            const value =
              dataset.maat === "kosten"
                ? dataset.aggregatie === "persoon"
                  ? month.kostenPerPersoonPerWeek
                  : month.kosten
                : dataset.aggregatie === "persoon"
                  ? month.perPersoonPerWeek
                  : month.verbruik;
            const unit =
              dataset.maat === "kosten"
                ? `${month.valuta ?? "kosten"}${
                    dataset.aggregatie === "persoon"
                      ? " per persoon/week"
                      : " maandtotaal"
                  }`
                : dataset.aggregatie === "persoon"
                  ? `${dataset.eenheid} per persoon/week`
                  : `${dataset.eenheid} maandtotaal`;
            const complete = month.status === "volledig" && value !== null;
            return (
              <div key={month.maand} className="grid grid-cols-[8rem_1fr_10rem] items-center gap-3 py-2">
                <span className="text-sm capitalize">{monthTitle(month.maand)}</span>
                <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                  {complete && value !== null && maximum > 0 && (
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (value / maximum) * 100)}%`,
                        backgroundColor: monthColor(month.maand),
                      }}
                    />
                  )}
                  {month.status === "gedeeltelijk" && (
                    <div className="h-full border-y border-dashed" style={{ borderColor: monthColor(month.maand) }} />
                  )}
                </div>
                <strong className="text-right text-sm">
                  {month.status === "geen"
                    ? "Geen gegevens"
                    : month.status === "gedeeltelijk"
                      ? "Onvolledig"
                      : value === null
                        ? "Kosten onbekend"
                        : `${getal(value)} ${unit}`}
                </strong>
              </div>
            );
          })}
        </article>
      ))}
    </div>
  );
}

export default async function EnergieMaandAnalysePagina({
  searchParams,
}: {
  searchParams: Promise<EnergieMaandParameters>;
}) {
  const [parameters, bron, uitbreiding] = await Promise.all([
    searchParams,
    getEnergieAnalyseBrondata(),
    getEnergieUitbreiding(),
  ]);
  let analysisParameters = parameters;
  let error = "";
  if (parameters.weergave === "anoniem") {
    const cookieValue = (await cookies()).get(
      ENERGIE_ANONIEME_SELECTIE_COOKIE,
    )?.value;
    if (!cookieValue) {
      error = "De previewsessie is verlopen. Selecteer de panden opnieuw.";
    } else {
      try {
        analysisParameters = decodeerEnergieAnoniemeSelectie(cookieValue);
      } catch (cause) {
        error =
          cause instanceof Error
            ? cause.message
            : "De anonieme selectie kon niet worden gelezen.";
      }
    }
  }
  bron.meterconfiguraties = uitbreiding.configuraties;
  let selection: EnergieMaandAnalyseSelectie;
  let view: EnergieMaandWeergave = "intern";
  try {
    if (error) throw new Error(error);
    const parsed = leesEnergieMaandSelectie(analysisParameters, bron);
    selection = parsed.selectie;
    view = parsed.weergave;
  } catch (cause) {
    error =
      cause instanceof Error ? cause.message : "Ongeldige energieanalyse-selectie.";
    selection = leesEnergieMaandSelectie({}, bron).selectie;
    const requestedView = Array.isArray(parameters.weergave)
      ? ""
      : parameters.weergave;
    if (requestedView === "anoniem") view = "selectie";
    else if (
      requestedView === "selectie" ||
      requestedView === "klant"
    )
      view = requestedView;
  }

  const analysis =
    view === "selectie" || error
      ? null
      : bouwEnergieMaandAnalyse(bron, uitbreiding.tarieven, selection);
  const query = analysis ? selectedQuery(analysis.selectie) : new URLSearchParams();
  const optionsWoningen = bron.woningen.filter((woning) =>
    selection.bedrijfIds.length
      ? bron.verhuurperioden.some(
          (verhuur) =>
            verhuur.woning_id === woning.id &&
            selection.bedrijfIds.includes(verhuur.bedrijf_id),
        )
      : true,
  );
  const exportParams = new URLSearchParams(query);
  exportParams.set("weergave", view);
  if (view === "anoniem") {
    exportParams.delete("bedrijf");
    exportParams.delete("woning");
  }
  const exportAvailable =
    analysis && (view === "klant" || view === "anoniem");
  const title =
    view === "klant"
      ? "Energieanalyse voor de klant"
      : view === "anoniem"
        ? "Anonieme energiepresentatie"
        : "Energieanalyse";
  const selectedCompany =
    view === "klant"
      ? bron.bedrijven.find((bedrijf) => bedrijf.id === selection.bedrijfIds[0])
      : null;
  const monthNames = selection.maanden.map(monthTitle);
  const today = new Date().toISOString().slice(0, 10);
  const latestData = analysis
    ? analysis.woningen
        .flatMap((woning) => woning.maanden.map((month) => month.laatsteMeetdatum))
        .filter((date): date is string => date !== null)
        .sort()
        .at(-1)
    : null;

  return (
    <main className={`min-h-screen p-3 text-slate-950 sm:p-6 ${view === "anoniem" ? "bg-white" : "bg-slate-100"}`}>
      <div className="mx-auto max-w-5xl space-y-4">
        {view === "intern" && (
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link href="/bedrijven" className="text-sm font-semibold text-emerald-800">
                ← Bedrijven
              </Link>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Energieanalyse</h1>
            </div>
            <Link
              href="/bedrijven/energieanalyse/beheer"
              className="inline-flex min-h-11 items-center rounded-xl border border-emerald-800 px-4 font-semibold text-emerald-900"
            >
              Beheer gegevens
            </Link>
          </header>
        )}

        {view !== "anoniem" && (
          <PageTabs selection={selection} view={view} />
        )}

        {view === "anoniem" && (
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <p className="font-bold tracking-wide text-emerald-800">CFME CONTROL</p>
              <h1 className="mt-1 text-2xl font-bold">{title}</h1>
              <p className="mt-1 text-sm text-slate-600">
                Geselecteerde panden · {monthNames.join(", ")} · {productNamen[selection.drager]}
              </p>
            </div>
            <Link
              href="/bedrijven/energieanalyse?weergave=selectie"
              className="min-h-11 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold"
            >
              Selectie aanpassen
            </Link>
          </header>
        )}

        {view === "klant" && (
          <header className="rounded-2xl bg-slate-950 p-5 text-white sm:p-7">
            <p className="text-sm font-bold tracking-wide text-emerald-300">CFME CONTROL</p>
            <h1 className="mt-2 text-2xl font-bold">{title}</h1>
            <p className="mt-2 text-slate-200">
              {selectedCompany?.naam} · {monthNames.join(", ")} · {productNamen[selection.drager]}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Bijgewerkt {datum(today)}
              {latestData ? ` · meetgegevens t/m ${datum(latestData)}` : ""}
            </p>
          </header>
        )}

        {view === "selectie" && (
          <section className="rounded-2xl border border-emerald-200 bg-white p-4">
            <h1 className="text-2xl font-bold">Selecteer gegevens voor presentatie</h1>
            <p className="mt-2 text-sm text-slate-600">
              Vink klanten en panden expliciet aan. De preview bevat alleen
              neutrale namen en een beperkte presentatiedataset.
            </p>
          </section>
        )}

        {view !== "anoniem" && (
          <EnergieMaandSelectie
            bedrijven={bron.bedrijven}
            woningen={optionsWoningen}
            bedrijfIds={selection.bedrijfIds}
            woningIds={selection.woningIds}
            maanden={selection.maanden}
            referentiemaand={selection.referentiemaand}
            drager={selection.drager}
            maat={selection.maat}
            aggregatie={selection.aggregatie}
            weergave={view}
            validationError={error || undefined}
          />
        )}

        {analysis && view !== "selectie" && view !== "anoniem" && (
          <section className="space-y-3">
            <header className="flex flex-wrap items-end justify-between gap-2">
              <div>
                {view === "intern" && (
                  <h2 className="text-lg font-bold">
                    {productNamen[analysis.selectie.drager]}
                  </h2>
                )}
                <p className="text-sm text-slate-600">
                  {monthNames.join(" · ")} · Gesorteerd op{" "}
                  {monthTitle(analysis.selectie.referentiemaand)}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Alle volledige vergelijkingsbalken gebruiken één schaal.
              </p>
            </header>
            <PresentationChart
              analyse={analysis}
              presentation={false}
              intern={view === "intern"}
            />
          </section>
        )}

        {analysis && view === "anoniem" && (
          <>
            <section className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950">
              Dit is een selectie van {analysis.woningen.length} pand(en) en{" "}
              {analysis.selectie.maanden.length} kalendermaand(en), geen
              automatische weergave van een volledige portefeuille.{" "}
              {productNamen[analysis.selectie.drager]} · Gesorteerd op{" "}
              {monthTitle(analysis.selectie.referentiemaand)} · bijgewerkt{" "}
              {datum(today)}
              {latestData ? ` · meetgegevens t/m ${datum(latestData)}` : ""}
            </section>
            <AnoniemeGrafiek dataset={bouwAnoniemeEnergieDataset(analysis)} />
            {exportAvailable && (
              <form
                action="/bedrijven/energieanalyse/export"
                method="post"
                className="inline-flex"
              >
                {[...exportParams].map(([name, value], index) => (
                  <input
                    key={`${name}:${index}`}
                    type="hidden"
                    name={name}
                    value={value}
                  />
                ))}
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-xl bg-emerald-800 px-4 font-semibold text-white"
                >
                  Download anonieme PDF
                </button>
              </form>
            )}
          </>
        )}

        {analysis && view === "klant" && (
          <>
            <CustomerMeasures
              measures={uitbreiding.maatregelen}
              bron={bron}
              analyse={analysis}
            />
            {exportAvailable && (
              <form
                action="/bedrijven/energieanalyse/export"
                method="post"
                className="inline-flex"
              >
                {[...exportParams].map(([name, value], index) => (
                  <input
                    key={`${name}:${index}`}
                    type="hidden"
                    name={name}
                    value={value}
                  />
                ))}
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-xl bg-emerald-800 px-4 font-semibold text-white"
                >
                  Download klant-PDF
                </button>
              </form>
            )}
          </>
        )}

        {analysis && view === "intern" && (
          <section className="rounded-2xl bg-white p-4 text-sm text-slate-600">
            <p>
              Product: {productNamen[selection.drager]} · bijgewerkt {datum(today)}
              {latestData ? ` · meetgegevens t/m ${datum(latestData)}` : ""}
            </p>
            {analysis.woningen.length === 0 && (
              <p className="mt-2">Geen panden beschikbaar voor deze selectie.</p>
            )}
            {!uitbreiding.beschikbaar && (
              <p className="mt-2">
                Tariefgegevens zijn niet beschikbaar; verbruik blijft zichtbaar
                en kosten worden niet als nul gerekend.
              </p>
            )}
          </section>
        )}

        {analysis && view === "klant" && analysis.woningen.length === 0 && (
          <p className="rounded-xl bg-white p-4">Geen panden voor de geselecteerde klant.</p>
        )}
      </div>
    </main>
  );
}
