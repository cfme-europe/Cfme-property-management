import Link from "next/link";
import type { Parameters } from "@/lib/energie/selectie";
import {
  beschikbareEnergieWoningen,
  EnergieSelectieValidatieFout,
  leesSelectie,
} from "@/lib/energie/selectie";
import {
  ENERGIE_ANALYSE_STARTDATUM,
} from "@/lib/energie/rekenregels";
import {
  bouwEnergiePeriodeAnalyse,
} from "@/lib/energie/periode-analyse";
import {
  getEnergieAnalyseBrondata,
  getEnergieUitbreiding,
} from "@/services/energieanalyse-server";
import EnergieAnalyseFilterFormulier from "./EnergieAnalyseFilterFormulier";

const producten = {
  elektriciteit: "Elektriciteit totaal",
  dagstroom: "Dagstroom",
  nachtstroom: "Nachtstroom",
  gas: "Gas",
  water: "Water",
} as const;

const getal = (value: number | null, digits = 2) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("nl-NL", { maximumFractionDigits: digits }).format(
        value,
      );

export default async function EnergiePeriodeAnalysePagina({
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

  let selectie: ReturnType<typeof leesSelectie>["selectie"];
  let validatiefout: string | undefined;
  let analyse: ReturnType<typeof bouwEnergiePeriodeAnalyse>["analyse"] | null =
    null;
  try {
    const report = bouwEnergiePeriodeAnalyse(bron, parameters);
    selectie = report.selectie;
    analyse = report.analyse;
  } catch (cause) {
    selectie = leesSelectie({}, bron).selectie;
    validatiefout =
      cause instanceof EnergieSelectieValidatieFout
        ? cause.message
        : cause instanceof Error
          ? cause.message
          : "De periodekeuze kon niet worden verwerkt.";
  }

  const companies = bron.bedrijven;
  const selectedCompanies = selectie.bedrijfIds ?? [];
  const selectedHomes = selectie.woningIds ?? [];
  const homes = beschikbareEnergieWoningen(bron, {
    bedrijfIds: selectedCompanies,
    vanaf: selectie.vanaf,
    totEnMet: selectie.totEnMet,
    archief: selectie.archief ?? false,
  }).map((home) => ({
    id: home.id,
    adres: home.adres,
    status: home.status,
    beschikbaar: true,
  }));
  const csvQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    for (const item of Array.isArray(value) ? value : value ? [value] : [])
      csvQuery.append(key, item);
  }
  const minimum = ENERGIE_ANALYSE_STARTDATUM;
  const maximum = new Date().toISOString().slice(0, 10);

  return (
    <main className="min-h-screen bg-[#f7f7f2] p-3 text-slate-950 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-2xl border border-emerald-900/15 bg-[#fffefa] p-4 sm:p-6">
          <p className="text-xs font-bold tracking-wide text-emerald-800">
            CFME CONTROL
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Link href="/bedrijven" className="text-sm font-semibold text-emerald-800">
                ← Bedrijven
              </Link>
              <h1 className="mt-1 text-2xl font-bold text-emerald-950 sm:text-3xl">
                Energieanalyse · vrije periode
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                De bestaande maandanalyse blijft beschikbaar; beide weergaven
                gebruiken dezelfde intervalberekening.
              </p>
            </div>
            <Link
              href="/bedrijven/energieanalyse"
              className="inline-flex min-h-11 items-center rounded-xl border border-emerald-800 px-4 font-semibold text-emerald-900"
            >
              Maandanalyse
            </Link>
          </div>
        </header>

        <EnergieAnalyseFilterFormulier
          key={`${selectie.vanaf}:${selectie.totEnMet}:${selectie.drager}:${selectedCompanies.join(",")}:${selectedHomes.join(",")}:${selectie.modus}`}
          bedrijven={companies}
          woningen={homes}
          bedrijfId={selectedCompanies[0]}
          woningIds={selectedHomes}
          vanaf={selectie.vanaf}
          totEnMet={selectie.totEnMet}
          drager={selectie.drager}
          minimum={minimum}
          maximum={maximum}
          modus={selectie.modus ?? "schatting"}
          validationError={validatiefout}
        />

        {analyse && (
          <>
            <section className="grid gap-3 rounded-2xl border border-emerald-900/15 bg-[#fffefa] p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Gevraagde periode
                </p>
                <p className="font-bold text-emerald-950">
                  {selectie.vanaf} tot {selectie.totEnMet}
                </p>
                <p className="text-xs text-slate-600">
                  Begin inclusief, einddatum exclusief
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Verbruik totaal
                </p>
                <p className="font-bold text-emerald-950">
                  {getal(analyse.totaal)} {analyse.eenheid}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Persoonsnorm
                </p>
                <p className="font-bold text-emerald-950">
                  {getal(analyse.per_persoon_per_week)} {analyse.eenheid}/persoon/week
                </p>
                <p className="text-xs text-slate-600">
                  {getal(analyse.persoonsdagen, 1)} persoonsdagen
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Berekeningsmodus
                </p>
                <p className="font-bold text-emerald-950">
                  {selectie.modus === "exact"
                    ? "Alleen volledige meetintervallen"
                    : "Proratering + randschattingen"}
                </p>
                <p className="text-xs text-slate-600">
                  Tarieven zijn niet nodig voor kWh- of persoonsanalyse.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-emerald-950">
                    Resultaten per pand
                  </h2>
                  <p className="text-sm text-slate-600">
                    Meetdekking sluit geschatte dagen uit; norm gebruikt alleen
                    de verbruiksdagen met bekende bezetting.
                  </p>
                </div>
                <a
                  href={`/bedrijven/energieanalyse/periode/export?${csvQuery.toString()}`}
                  className="inline-flex min-h-11 items-center rounded-xl border border-emerald-800 bg-[#fffefa] px-4 font-semibold text-emerald-900"
                >
                  CSV exporteren
                </a>
              </header>
              {!analyse.rijen.length && (
                <p className="rounded-xl bg-white p-4 text-slate-700">
                  Geen panden beschikbaar voor deze selectie.
                </p>
              )}
              {analyse.rijen.map((row) => (
                <article
                  key={row.woning_id}
                  className="space-y-3 rounded-2xl border border-emerald-900/15 bg-[#fffefa] p-4"
                >
                  <header className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <h3 className="font-bold text-emerald-950">{row.adres}</h3>
                      <p className="text-xs text-slate-600">
                        {row.bedrijven.join(", ") || "Klant niet vastgelegd"}
                      </p>
                    </div>
                    <p className="text-sm">
                      <strong>{getal(row.totaal)} {analyse.eenheid}</strong>
                      <br />{getal(row.dekking_percentage, 1)}% meetdekking
                    </p>
                    <p className="text-sm">
                      <strong>{getal(row.per_persoon_per_week)} {analyse.eenheid}/persoon/week</strong>
                      <br />{getal(row.persoonsdagen, 1)} persoonsdagen
                    </p>
                    <p className="text-sm">
                      <strong>{getal(row.geschatte_dagen, 1)} geschatte dagen</strong>
                      <br />{getal(row.exacte_dekking_percentage, 1)}% volledig gemeten
                    </p>
                  </header>
                  {row.totaal !== null &&
                    row.intervallen.some(
                      (i) => i.waarde === null || !i.betrouwbaar,
                    ) && (
                      <p className="text-sm font-semibold text-amber-900">
                        Deeltotaal: {getal(
                          row.intervallen
                            .filter((i) => i.waarde === null || !i.betrouwbaar)
                            .reduce((som, i) => som + i.dagen, 0),
                          1,
                        )}{" "}
                        dagen ontbreken door niet-berekenbare opnamen; zie Details.
                      </p>
                    )}
                  {row.onbekende_bezettingsdagen > 0 && (
                    <p className="text-sm text-amber-900">
                      Bezetting onbekend voor {getal(row.onbekende_bezettingsdagen, 1)} dagen; deze dagen blijven in het verbruik maar niet in de persoonsnorm.
                    </p>
                  )}
                  {row.meldingen.length > 0 && (
                    <ul className="list-inside list-disc text-sm text-amber-900">
                      {row.meldingen.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  )}
                  <details className="border-t border-emerald-900/10 pt-2">
                    <summary className="cursor-pointer font-semibold text-emerald-900">
                      Details: bronopnames en berekening
                    </summary>
                    <div className="mt-2 space-y-2 text-sm text-slate-700">
                      {row.intervallen.map((interval) => (
                        <p key={`${interval.vanDatum}:${interval.totDatum}`}>
                          {interval.vanDatum}–{interval.totDatum} · {getal(interval.waarde)} {analyse.eenheid} · {interval.rekenwijze.replaceAll("_", " ")} · {getal(interval.dagen, 1)} overlappende dagen · meter {interval.meteridentiteit ?? "niet vastgelegd"} · bron {interval.bronVanaf}–{interval.bronTot}, opname-ID {interval.bronIds.join(" → ") || "onbekend"} · registers {(interval.bronVelden ?? []).join(", ") || "onbekend"} · standen {interval.gebruikteStanden.map((reading) => `${reading.register} ${getal(reading.begin, 3)} → ${getal(reading.eind, 3)}`).join("; ") || "onbekend"} · bewonersbron {interval.bewonersbron} · {getal(interval.persoonsdagen, 1)} persoonsdagen
                          {interval.rekenwijze === "geschat" &&
                            ` · schatting op basis van bronperiode ${interval.bronVanaf}–${interval.bronTot}`}
                          {interval.meldingen.length > 0 &&
                            ` · ${interval.meldingen.join("; ")}`}
                        </p>
                      ))}
                    </div>
                  </details>
                </article>
              ))}
            </section>
          </>
        )}

        <footer className="border-t border-emerald-900/15 py-3 text-sm text-slate-600">
          {producten[selectie.drager]} · Periode begin inclusief en einde exclusief. De einddatum in de selectie is de eerste dag buiten de berekening.
        </footer>
      </div>
    </main>
  );
}
