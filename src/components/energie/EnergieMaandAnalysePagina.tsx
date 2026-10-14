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
import { kleurEnergieMaand } from "@/lib/energie/maand-kleuren";
import { beoordeelMaatregel } from "@/lib/energie/resultaten";
import EnergieMaandSelectie from "./EnergieMaandSelectie";
import EnergieAfzender from "./EnergieAfzender";
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
  return kleurEnergieMaand(month);
}

function MonthLegend({ months }: { months: string[] }) {
  return (
    <ul
      aria-label="Legenda maandkleuren"
      className="flex flex-wrap gap-x-4 gap-y-2 border-y border-stone-200 py-3 text-sm text-slate-700"
    >
      {months.map((month) => (
        <li key={month} className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: monthColor(month) }}
          />
          <span className="capitalize">{monthTitle(month)}</span>
        </li>
      ))}
    </ul>
  );
}

function selectedQuery(selectie: EnergieMaandAnalyse["selectie"]) {
  const params = new URLSearchParams();
  selectie.maanden.forEach((month) => params.append("maand", month));
  selectie.bedrijfIds.forEach((id) => params.append("bedrijf", String(id)));
  selectie.woningIds.forEach((id) => params.append("woning", String(id)));
  params.set("woningselectie", selectie.woningselectie ?? "automatisch");
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

function herstelSelectieVoorPagina(
  parameters: EnergieMaandParameters,
  bron: Awaited<ReturnType<typeof getEnergieAnalyseBrondata>>,
): EnergieMaandAnalyseSelectie {
  const fallback = leesEnergieMaandSelectie({}, bron).selectie;
  const waarden = (key: string) => {
    const value = parameters[key];
    return (Array.isArray(value) ? value : value ? [value] : [])
      .flatMap((item) => item.split(","))
      .filter(Boolean);
  };
  const enkeleWaarde = (key: string) => {
    const value = parameters[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const ids = (key: string, allowed: Set<number>) =>
    [...new Set(
      waarden(key)
        .filter((value) => /^\d+$/.test(value))
        .map(Number)
        .filter((id) => Number.isSafeInteger(id) && allowed.has(id)),
    )];
  const maanden = [...new Set(waarden("maand"))]
    .filter((month) => {
      try {
        parseEnergieMaand(month);
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, 36);
  const restoredMonths = maanden.length ? maanden : fallback.maanden;
  const referentie = enkeleWaarde("referentiemaand");
  const drager = enkeleWaarde("drager");
  const maat = enkeleWaarde("maat");
  const aggregatie = enkeleWaarde("aggregatie");
  const woningselectie = enkeleWaarde("woningselectie");
  const safeParameters: EnergieMaandParameters = {
    weergave: "intern",
    maand: restoredMonths,
    referentiemaand:
      referentie && restoredMonths.includes(referentie)
        ? referentie
        : restoredMonths[0],
    bedrijf: ids(
      "bedrijf",
      new Set(bron.bedrijven.map((bedrijf) => bedrijf.id)),
    ).map(String),
    woning: ids(
      "woning",
      new Set(bron.woningen.map((woning) => woning.id)),
    ).map(String),
    woningselectie:
      woningselectie === "automatisch" ||
      woningselectie === "aangepast" ||
      woningselectie === "leeg"
        ? woningselectie
        : "aangepast",
    drager:
      drager === "elektriciteit" ||
      drager === "dagstroom" ||
      drager === "nachtstroom" ||
      drager === "gas" ||
      drager === "water"
        ? drager
        : fallback.drager,
    maat: maat === "verbruik" || maat === "kosten" ? maat : fallback.maat,
    aggregatie:
      aggregatie === "persoon" || aggregatie === "pand"
        ? aggregatie
        : fallback.aggregatie,
  };
  try {
    return leesEnergieMaandSelectie(safeParameters, bron).selectie;
  } catch {
    return leesEnergieMaandSelectie(
      { ...safeParameters, woning: [], woningselectie: "leeg" },
      bron,
    ).selectie;
  }
}

function selectieFoutmelding(cause: unknown) {
  const message = cause instanceof Error ? cause.message : "";
  if (/bedrijf/.test(message))
    return "Een geselecteerde klant is niet beschikbaar. Controleer de klantselectie.";
  if (/woning|pand|panden/.test(message))
    return "Een geselecteerd pand is niet beschikbaar voor de gekozen klant(en) en maanden. Pas de pandselectie aan.";
  if (/maand|sorteermaand|kalender/.test(message))
    return "Controleer de gekozen kalendermaanden en de sorteermaand.";
  return "De selectie kon niet worden verwerkt. Controleer de klant, panden, maanden en instellingen.";
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
    <div className="grid grid-cols-[minmax(6rem,0.8fr)_minmax(2.5rem,1.5fr)_minmax(5.5rem,1fr)] items-center gap-2 border-b border-stone-100 py-3 sm:grid-cols-[minmax(9rem,1fr)_minmax(8rem,2fr)_minmax(7rem,1fr)_minmax(7rem,1fr)] sm:gap-4">
      <p className="text-sm font-semibold capitalize text-slate-700">{monthTitle(month.maand)}</p>
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
      </div>
      <div className="col-span-3 text-right text-xs text-slate-600 sm:col-span-1">
        {supportingValue ??
          (month.status === "gedeeltelijk" && month.verbruik !== null
            ? `${getal(month.verbruik)} ${analyse.eenheid} gemeten`
            : "")}
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
  const rows = analyse.woningen.map((woning, index) => (
    <article
      key={woning.id}
      className="border-b border-emerald-900/15 py-4 sm:py-5"
    >
      <header className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold">
          {presentation
            ? `Pand ${String(index + 1).padStart(2, "0")}`
            : woning.adres}
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
  return (
    <div>
      <MonthLegend months={analyse.selectie.maanden} />
      <div>{rows}</div>
    </div>
  );
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
    <div>
      <MonthLegend months={dataset.maanden} />
      {dataset.woningen.map((woning) => (
        <article key={woning.pand} className="border-b border-emerald-900/15 py-4 sm:py-5">
          <h3 className="pb-2 font-semibold text-emerald-950">{woning.pand}</h3>
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
            const secondaryValue =
              dataset.maat === "kosten"
                ? `${getal(month.verbruik)} ${dataset.eenheid} verbruik`
                : month.kosten === null
                  ? null
                  : euro(month.kosten, month.valuta);
            const status =
              month.status === "geen"
                ? month.maand > new Date().toISOString().slice(0, 7)
                  ? "Nog geen meetgegevens"
                  : "Geen gegevens"
                : month.status === "gedeeltelijk"
                  ? "Onvolledig"
                  : value === null
                    ? dataset.maat === "kosten"
                      ? "Kosten onbekend"
                      : "Bewoning onbekend"
                    : `${getal(value)} ${unit}`;
            return (
              <div
                key={month.maand}
                className="grid grid-cols-[minmax(6rem,0.8fr)_minmax(2.5rem,1.5fr)_minmax(5.5rem,1fr)] items-center gap-2 border-b border-stone-100 py-3 sm:grid-cols-[minmax(9rem,1fr)_minmax(8rem,2fr)_minmax(7rem,1fr)_minmax(7rem,1fr)] sm:gap-4"
              >
                <span className="text-sm capitalize text-slate-700">
                  {monthTitle(month.maand)}
                </span>
                <div
                  role="img"
                  aria-label={`${monthTitle(month.maand)}: ${status}`}
                  className="h-4 overflow-hidden rounded-full bg-stone-100"
                >
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
                    <div
                      className="h-full border-y border-dashed"
                      style={{ borderColor: monthColor(month.maand) }}
                    />
                  )}
                </div>
                <strong className="text-right text-sm tabular-nums">{status}</strong>
                <span className="col-span-3 text-right text-xs text-slate-600 sm:col-span-1">
                  {secondaryValue ?? ""}
                </span>
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
  const requestedView = Array.isArray(parameters.weergave)
    ? ""
    : parameters.weergave;
  const foutCodes: Record<string, string> = {
    "geen-panden": "Selecteer minimaal één pand.",
    "ongeldige-selectie":
      "De selectie kon niet worden verwerkt. Controleer panden, maanden en product.",
    verlopen: "De previewsessie is verlopen. Selecteer de panden opnieuw.",
  };
  let error =
    typeof parameters.fout === "string"
      ? foutCodes[parameters.fout] ?? ""
      : "";
  if (requestedView === "anoniem") {
    const cookieValue = (await cookies()).get(
      ENERGIE_ANONIEME_SELECTIE_COOKIE,
    )?.value;
    if (!cookieValue) {
      error = foutCodes.verlopen;
    } else {
      try {
        analysisParameters = decodeerEnergieAnoniemeSelectie(cookieValue);
      } catch {
        error = foutCodes.verlopen;
      }
    }
  } else if (
    requestedView === "selectie" &&
    parameters.maand === undefined &&
    parameters.woning === undefined &&
    parameters.bedrijf === undefined
  ) {
    const cookieValue = (await cookies()).get(
      ENERGIE_ANONIEME_SELECTIE_COOKIE,
    )?.value;
    if (cookieValue) {
      try {
        analysisParameters = {
          ...decodeerEnergieAnoniemeSelectie(cookieValue),
          weergave: "selectie",
        };
      } catch {
        analysisParameters = parameters;
      }
    }
  }
  bron.meterconfiguraties = uitbreiding.configuraties;
  let selection: EnergieMaandAnalyseSelectie;
  let view: EnergieMaandWeergave = "intern";
  let presentationError = false;
  try {
    if (requestedView === "anoniem" && error)
      throw new Error("Presentatie niet beschikbaar.");
    const parsed = leesEnergieMaandSelectie(analysisParameters, bron);
    selection = parsed.selectie;
    view = parsed.weergave;
  } catch (cause) {
    error =
      parameters.fout || requestedView === "anoniem"
        ? error || "De presentatie kan niet worden geopend."
        : selectieFoutmelding(cause);
    selection = herstelSelectieVoorPagina(parameters, bron);
    if (requestedView === "anoniem") {
      view = "selectie";
      presentationError = true;
    }
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
  const optionsWoningen = bron.woningen;
  const exportParams =
    view === "anoniem"
      ? new URLSearchParams("weergave=anoniem")
      : new URLSearchParams(query);
  if (view !== "anoniem") exportParams.set("weergave", view);
  const exportAvailable =
    analysis &&
    analysis.woningen.length > 0 &&
    (view === "klant" || view === "anoniem");
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
    <main className="min-h-screen bg-[#f7f7f2] p-3 text-slate-950 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        {view === "intern" && (
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-wide text-emerald-800">
                CFME CONTROL
              </p>
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

        {presentationError && (
          <section
            role="alert"
            className="border-y border-emerald-900/15 bg-[#fffefa] px-5 py-8"
          >
            <p className="font-bold tracking-wide text-emerald-800">
              CFME CONTROL
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-emerald-950">
              Presentatie niet beschikbaar
            </h1>
            <p className="mt-2 max-w-2xl text-slate-700">
              Deze anonieme presentatie kan niet worden geopend. De selectie is
              mogelijk verlopen of ongeldig.
            </p>
            <Link
              href="/bedrijven/energieanalyse?weergave=selectie"
              className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-emerald-900 px-4 font-semibold text-white"
            >
              Terug naar pandselectie
            </Link>
          </section>
        )}

        {!presentationError && view !== "anoniem" && view !== "selectie" && (
          <PageTabs selection={selection} view={view} />
        )}

        {!presentationError && view === "anoniem" && (
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
              className="min-h-11 rounded-lg border border-stone-300 px-4 py-3 text-sm font-semibold"
            >
              Selectie aanpassen
            </Link>
          </header>
        )}

        {!presentationError && view === "klant" && (
          <header className="border-b border-emerald-900/20 bg-emerald-950 px-5 py-5 text-white sm:px-7">
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

        {!presentationError && view === "selectie" && (
          <section className="border-y border-emerald-900/15 bg-[#fffefa] px-4 py-4">
            <Link
              href="/bedrijven/energieanalyse"
              className="text-sm font-semibold text-emerald-800"
            >
              ← Terug naar analyse
            </Link>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">
              CFME CONTROL
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-emerald-950">
              Anonieme presentatie
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Kies rechtstreeks de panden en maanden. Adressen zijn alleen
              zichtbaar in dit interne selectiescherm.
            </p>
          </section>
        )}

        {!presentationError && view !== "anoniem" && (
          <EnergieMaandSelectie
            key={`${view}:${view === "selectie" ? "" : selection.bedrijfIds.join(",")}:${selection.woningIds.join(",")}:${selection.maanden.join(",")}:${selection.woningselectie}`}
            bedrijven={view === "selectie" ? [] : bron.bedrijven}
            woningen={optionsWoningen}
            relaties={bron.verhuurperioden.map(
              ({
                woning_id,
                bedrijf_id,
                startdatum,
                werkelijke_einddatum,
              }) => ({
                woning_id,
                ...(view === "selectie" ? {} : { bedrijf_id }),
                startdatum: startdatum ?? null,
                werkelijke_einddatum: werkelijke_einddatum ?? null,
              }),
            )}
            bedrijfIds={view === "selectie" ? [] : selection.bedrijfIds}
            woningIds={selection.woningIds}
            woningselectie={selection.woningselectie ?? "automatisch"}
            maanden={selection.maanden}
            referentiemaand={selection.referentiemaand}
            drager={selection.drager}
            maat={selection.maat}
            aggregatie={selection.aggregatie}
            weergave={view}
            validationError={error || undefined}
          />
        )}

        {!presentationError && analysis && view !== "selectie" && view !== "anoniem" && (
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

        {!presentationError && analysis && view === "anoniem" && (
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
                  className="inline-flex min-h-11 items-center rounded-lg bg-emerald-900 px-4 font-semibold text-white"
                >
                  Download anonieme PDF
                </button>
              </form>
            )}
          </>
        )}

        {!presentationError && analysis && view === "klant" && (
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
                  className="inline-flex min-h-11 items-center rounded-lg bg-emerald-900 px-4 font-semibold text-white"
                >
                  Download klant-PDF
                </button>
              </form>
            )}
          </>
        )}

        {!presentationError && analysis && view === "intern" && (
          <section className="border-t border-stone-200 py-4 text-sm text-slate-600">
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

        {!presentationError && analysis && view === "klant" && analysis.woningen.length === 0 && (
          <p className="border-y border-stone-200 bg-[#fffefa] p-4">Geen panden voor de geselecteerde klant.</p>
        )}
        <EnergieAfzender />
      </div>
    </main>
  );
}
