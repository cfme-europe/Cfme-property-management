import Link from "next/link";
import {
  bepaalEnergieDatumbereik,
  bouwEnergiePortfolioAnalyse,
  type EnergieAnalyseNiveau,
  type Energiedrager,
} from "@/lib/energie/portfolio-analyse";
import { getEnergieAnalyseBrondata } from "@/services/energieanalyse-server";

export const dynamic = "force-dynamic";

type ZoekParameters = {
  niveau?: string;
  bedrijf?: string;
  woning?: string;
  drager?: string;
  vanaf?: string;
  tot?: string;
};

const getal = new Intl.NumberFormat("nl-NL", {
  maximumFractionDigits: 1,
});

const geheelGetal = new Intl.NumberFormat("nl-NL", {
  maximumFractionDigits: 0,
});

function geldigNiveau(waarde?: string): EnergieAnalyseNiveau {
  return waarde === "bedrijf" || waarde === "woning" ? waarde : "totaal";
}

function geldigeDrager(waarde?: string): Energiedrager {
  return waarde === "gas" || waarde === "water" ? waarde : "elektriciteit";
}

function geldigId(waarde: string | undefined, geldigeIds: Set<number>): number | undefined {
  const id = Number(waarde);
  return Number.isInteger(id) && geldigeIds.has(id) ? id : undefined;
}

function geldigDatum(waarde: string | undefined, terugval: string): string {
  return waarde && /^\d{4}-\d{2}-\d{2}$/.test(waarde) ? waarde : terugval;
}

function maandLabel(waarde: string): string {
  const [jaar, maand] = waarde.split("-").map(Number);
  return new Intl.DateTimeFormat("nl-NL", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(jaar, maand - 1, 1)));
}

function signaalStijl(signaal: string): string {
  if (signaal === "uitschieter") return "bg-rose-100 text-rose-800";
  if (signaal === "verhoogd") return "bg-amber-100 text-amber-800";
  if (signaal === "laag") return "bg-sky-100 text-sky-800";
  return "bg-emerald-100 text-emerald-800";
}

export default async function EnergieanalysePage({
  searchParams,
}: {
  searchParams: Promise<ZoekParameters>;
}) {
  const [parameters, brondata] = await Promise.all([
    searchParams,
    getEnergieAnalyseBrondata(),
  ]);
  const bereik = bepaalEnergieDatumbereik(brondata.meterstanden);
  const bedrijven = [...brondata.bedrijven].sort((a, b) =>
    a.naam.localeCompare(b.naam, "nl"),
  );
  const woningen = [...brondata.woningen].sort((a, b) =>
    a.adres.localeCompare(b.adres, "nl"),
  );
  const niveau = geldigNiveau(parameters.niveau);
  const drager = geldigeDrager(parameters.drager);
  const bedrijfId =
    geldigId(parameters.bedrijf, new Set(bedrijven.map((bedrijf) => bedrijf.id))) ??
    bedrijven[0]?.id;
  const woningId =
    geldigId(parameters.woning, new Set(woningen.map((woning) => woning.id))) ??
    woningen[0]?.id;
  const standaardVanaf = bereik?.vanaf ?? new Date().toISOString().slice(0, 10);
  const standaardTot = bereik?.totEnMet ?? standaardVanaf;
  const vanaf = geldigDatum(parameters.vanaf, standaardVanaf);
  const gekozenTot = geldigDatum(parameters.tot, standaardTot);
  const totEnMet = gekozenTot >= vanaf ? gekozenTot : standaardTot;
  const analyse = bouwEnergiePortfolioAnalyse(brondata, {
    niveau,
    drager,
    vanaf,
    totEnMet,
    bedrijfId,
    woningId,
  });
  const maximumRij = Math.max(
    1,
    ...analyse.rijen.map((rij) => rij.per_persoon_per_week),
  );
  const maximumTrend = Math.max(
    1,
    ...analyse.trends.map((trend) => trend.per_persoon_per_week),
  );
  const scopeNaam =
    niveau === "bedrijf"
      ? bedrijven.find((bedrijf) => bedrijf.id === bedrijfId)?.naam ?? "Klant"
      : niveau === "woning"
        ? woningen.find((woning) => woning.id === woningId)?.adres ?? "Pand"
        : "Volledige portefeuille";
  const dekkingTotaal = analyse.rijen.reduce(
    (som, rij) => som + rij.beschikbare_meetperioden,
    0,
  );
  const dekkingBruikbaar = analyse.rijen.reduce((som, rij) => som + rij.meetperioden, 0);
  const dekkingPercentage =
    dekkingTotaal > 0 ? (dekkingBruikbaar / dekkingTotaal) * 100 : 0;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          href="/bedrijven"
          className="inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          ← Terug naar bedrijven
        </Link>

        <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
          <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.4fr_1fr] md:px-10 md:py-10">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
                Energie-intelligence
              </p>
              <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                Verbruik eerlijk vergelijken
              </h1>
              <p className="mt-3 max-w-2xl text-slate-300">
                Vergelijk panden op werkelijk verbruik per aanwezige persoon per week.
                Zo worden gemiddeldes, uitschieters en besparingskansen zichtbaar zonder
                lege panden of wisseldagen verkeerd mee te tellen.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Huidige selectie</p>
              <p className="mt-1 text-xl font-semibold">{scopeNaam}</p>
              <p className="mt-4 text-sm text-slate-300">
                {drager === "elektriciteit"
                  ? "Elektriciteit"
                  : drager === "gas"
                    ? "Gas"
                    : "Water"}{" "}
                · {vanaf} t/m meetdatum {totEnMet}
              </p>
            </div>
          </div>
        </section>

        <form className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-6">
          <label>
            <span className="mb-1 block text-sm font-semibold">Vergelijking</span>
            <select
              name="niveau"
              defaultValue={niveau}
              className="w-full rounded-xl border border-slate-300 px-3 py-3"
            >
              <option value="totaal">Alle panden</option>
              <option value="bedrijf">Per klant</option>
              <option value="woning">Eén pand</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold">Klant</span>
            <select
              name="bedrijf"
              defaultValue={bedrijfId}
              className="w-full rounded-xl border border-slate-300 px-3 py-3"
            >
              {bedrijven.map((bedrijf) => (
                <option key={bedrijf.id} value={bedrijf.id}>
                  {bedrijf.naam}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold">Pand</span>
            <select
              name="woning"
              defaultValue={woningId}
              className="w-full rounded-xl border border-slate-300 px-3 py-3"
            >
              {woningen.map((woning) => (
                <option key={woning.id} value={woning.id}>
                  {woning.adres}, {woning.plaats}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold">Verbruik</span>
            <select
              name="drager"
              defaultValue={drager}
              className="w-full rounded-xl border border-slate-300 px-3 py-3"
            >
              <option value="elektriciteit">Elektriciteit</option>
              <option value="gas">Gas</option>
              <option value="water">Water</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold">Vanaf meetdatum</span>
            <input
              type="date"
              name="vanaf"
              defaultValue={vanaf}
              className="w-full rounded-xl border border-slate-300 px-3 py-3"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-semibold">Tot meetdatum</span>
            <input
              type="date"
              name="tot"
              defaultValue={totEnMet}
              className="w-full rounded-xl border border-slate-300 px-3 py-3"
            />
          </label>

          <div className="md:col-span-2 xl:col-span-6">
            <button className="rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-600">
              Analyse toepassen
            </button>
            <span className="ml-3 text-sm text-slate-500">
              Klant en pand worden gebruikt zodra het bijbehorende niveau is gekozen.
            </span>
          </div>
        </form>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Gewogen verbruik",
              waarde:
                analyse.per_persoon_per_week === null
                  ? "—"
                  : `${getal.format(analyse.per_persoon_per_week)} ${analyse.eenheid}`,
              detail: "per persoon per week",
            },
            {
              label: "Totaal verbruik",
              waarde: `${getal.format(analyse.totaal)} ${analyse.eenheid}`,
              detail: `${geheelGetal.format(analyse.persoonsdagen)} persoonsdagen`,
            },
            {
              label: "Portefeuillemediaan",
              waarde:
                analyse.mediaan_per_persoon_per_week === null
                  ? "—"
                  : `${getal.format(analyse.mediaan_per_persoon_per_week)} ${analyse.eenheid}`,
              detail: `${analyse.panden_in_benchmark} vergelijkbare panden`,
            },
            {
              label: "Uitschieters",
              waarde: geheelGetal.format(analyse.uitschieters),
              detail: "statistisch bovengemiddeld",
            },
            {
              label: "Besparingsruimte",
              waarde: `${getal.format(analyse.besparingsruimte_tot_mediaan)} ${analyse.eenheid}`,
              detail: "theoretisch tot mediaan",
            },
          ].map((kaart) => (
            <article key={kaart.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{kaart.label}</p>
              <p className="mt-2 text-2xl font-bold">{kaart.waarde}</p>
              <p className="mt-1 text-xs text-slate-500">{kaart.detail}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
                Pandvergelijking
              </p>
              <h2 className="mt-1 text-2xl font-bold">Hoogste verbruik direct zichtbaar</h2>
            </div>
            <p className="text-sm text-slate-500">
              Dekking {getal.format(dekkingPercentage)}% · {analyse.uitgesloten_meetperioden}{" "}
              meetperioden uitgesloten
            </p>
          </div>

          {analyse.rijen.length === 0 ? (
            <p className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-900">
              Voor deze selectie zijn geen volledige meetperioden met bewoningsdekking beschikbaar.
            </p>
          ) : (
            <div className="mt-7 space-y-5">
              {analyse.rijen.map((rij) => (
                <article key={rij.woning_id}>
                  <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="font-bold">{rij.adres}</p>
                      <p className="text-xs text-slate-500">
                        {rij.postcode} {rij.plaats}
                        {rij.bedrijven.length > 0 ? ` · ${rij.bedrijven.join(", ")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${signaalStijl(rij.signaal)}`}>
                        {rij.signaal}
                      </span>
                      <span className="font-bold">
                        {getal.format(rij.per_persoon_per_week)} {analyse.eenheid}/p.p./week
                      </span>
                    </div>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={
                        rij.signaal === "uitschieter"
                          ? "h-full rounded-full bg-rose-500"
                          : rij.signaal === "verhoogd"
                            ? "h-full rounded-full bg-amber-500"
                            : "h-full rounded-full bg-emerald-600"
                      }
                      style={{
                        width: `${Math.max(2, (rij.per_persoon_per_week / maximumRij) * 100)}%`,
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <article className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Ontwikkeling door de tijd</h2>
            <p className="mt-1 text-sm text-slate-500">
              Genormaliseerd per aanwezige persoon per week.
            </p>
            <div className="mt-6 flex min-h-64 items-end gap-3 overflow-x-auto border-b border-slate-200 pb-2">
              {analyse.trends.map((trend) => (
                <div key={trend.maand} className="flex min-w-20 flex-1 flex-col items-center">
                  <span className="mb-2 text-xs font-bold">
                    {getal.format(trend.per_persoon_per_week)}
                  </span>
                  <div
                    className="w-full max-w-14 rounded-t-lg bg-emerald-600"
                    style={{
                      height: `${Math.max(8, (trend.per_persoon_per_week / maximumTrend) * 180)}px`,
                    }}
                  />
                  <span className="mt-2 text-center text-xs text-slate-500">
                    {maandLabel(trend.maand)}
                  </span>
                </div>
              ))}
              {analyse.trends.length === 0 ? (
                <p className="self-center text-sm text-slate-500">Geen trendgegevens beschikbaar.</p>
              ) : null}
            </div>
          </article>

          <article className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-400">
              Betekenis voor maatregelen
            </p>
            <h2 className="mt-2 text-xl font-bold">Van uitschieter naar gerichte actie</h2>
            <ul className="mt-5 space-y-4 text-sm text-slate-300">
              <li>
                <strong className="text-white">Prioriteer rood en oranje.</strong>{" "}
                Controleer installaties, thermostaatinstellingen, isolatie en gebruikersgedrag.
              </li>
              <li>
                <strong className="text-white">Vergelijk dezelfde eenheid.</strong>{" "}
                Het gemiddelde is gewogen op werkelijke persoonsdagen, niet op losse pandgemiddelden.
              </li>
              <li>
                <strong className="text-white">Beoordeel dekking.</strong>{" "}
                Een interval zonder meterwaarde of bewoners wordt zichtbaar uitgesloten.
              </li>
              <li>
                <strong className="text-white">Meet na een ingreep opnieuw.</strong>{" "}
                Gebruik dezelfde selectie om effect in de volgende meetperiode te controleren.
              </li>
            </ul>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-bold">Onderliggende meetbare waarden</h2>
            <p className="mt-1 text-sm text-slate-500">
              Volledig controleerbaar per pand, zonder persoonsgegevens te tonen.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-5 py-3">Pand</th>
                  <th className="px-5 py-3">Totaal</th>
                  <th className="px-5 py-3">Persoonsdagen</th>
                  <th className="px-5 py-3">Per persoon/week</th>
                  <th className="px-5 py-3">T.o.v. mediaan</th>
                  <th className="px-5 py-3">Dekking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {analyse.rijen.map((rij) => (
                  <tr key={rij.woning_id}>
                    <td className="px-5 py-4 font-semibold">{rij.adres}</td>
                    <td className="px-5 py-4">{getal.format(rij.totaal)} {analyse.eenheid}</td>
                    <td className="px-5 py-4">{geheelGetal.format(rij.persoonsdagen)}</td>
                    <td className="px-5 py-4 font-semibold">
                      {getal.format(rij.per_persoon_per_week)} {analyse.eenheid}
                    </td>
                    <td className="px-5 py-4">
                      {rij.afwijking_mediaan_percentage === null
                        ? "—"
                        : `${rij.afwijking_mediaan_percentage >= 0 ? "+" : ""}${getal.format(rij.afwijking_mediaan_percentage)}%`}
                    </td>
                    <td className="px-5 py-4">{getal.format(rij.dekking_percentage)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-300 bg-white p-5 text-sm text-slate-600">
          <strong className="text-slate-900">Rekenmethode:</strong> ieder meetinterval loopt van
          de vorige meetdatum tot, maar niet inclusief, de volgende meetdatum. Daardoor wordt een
          bewonerswissel op een grensdag nooit dubbel geteld. Het verbruik is exact per pand en de
          bezetting is exact op dagniveau. Zonder individuele tussenmeters kan het systeem geen
          werkelijk verbruik aan één specifieke bewoner toeschrijven.
        </aside>
      </div>
    </main>
  );
}
