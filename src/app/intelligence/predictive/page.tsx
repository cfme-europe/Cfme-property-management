import Link from "next/link";
import { getPredictiveIntelligence } from "@/services/predictive-intelligence";
import type {
  PredictiveBetrouwbaarheid,
  PredictiveSignaalNiveau,
} from "@/types/predictive-intelligence";

export const dynamic = "force-dynamic";

function niveauClass(
  niveau: PredictiveSignaalNiveau,
): string {
  if (niveau === "kritiek") {
    return "bg-red-100 text-red-900";
  }

  if (niveau === "hoog") {
    return "bg-orange-100 text-orange-900";
  }

  if (niveau === "middel") {
    return "bg-amber-100 text-amber-900";
  }

  return "bg-emerald-100 text-emerald-900";
}

function betrouwbaarheidLabel(
  waarde: PredictiveBetrouwbaarheid,
): string {
  const labels: Record<
    PredictiveBetrouwbaarheid,
    string
  > = {
    onvoldoende: "Onvoldoende",
    beperkt: "Beperkt",
    redelijk: "Redelijk",
    hoog: "Hoog",
  };

  return labels[waarde];
}

export default async function PredictiveIntelligencePage() {
  const resultaat =
    await getPredictiveIntelligence();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar Business Intelligence Cockpit
        </Link>

        <header className="my-6 rounded-3xl bg-slate-950 p-7 text-white shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
            9.0J Predictive Intelligence
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Uitlegbare voorspelsignalen
          </h1>

          <p className="mt-4 max-w-4xl leading-7 text-slate-300">
            {resultaat.uitgangspunt}
          </p>

          <p className="mt-4 text-sm text-slate-400">
            Modelversie {resultaat.modelversie}
            {" · "}
            Gegenereerd{" "}
            {new Intl.DateTimeFormat("nl-NL", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Europe/Amsterdam",
            }).format(
              new Date(
                resultaat.gegenereerd_op,
              ),
            )}
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            [
              "Woningen",
              resultaat.samenvatting
                .woningen_geanalyseerd,
            ],
            [
              "Met signalen",
              resultaat.samenvatting
                .woningen_met_signalen,
            ],
            [
              "Onvoldoende historie",
              resultaat.samenvatting
                .woningen_onvoldoende_historie,
            ],
            [
              "Kritieke signalen",
              resultaat.samenvatting
                .kritieke_signalen,
            ],
            [
              "Hoge signalen",
              resultaat.samenvatting
                .hoge_signalen,
            ],
            [
              "Hercontroleprioriteit",
              resultaat.samenvatting
                .hercontroles_met_prioriteit,
            ],
          ].map(([label, waarde]) => (
            <article
              key={String(label)}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">
                {label}
              </p>
              <p className="mt-2 text-3xl font-black">
                {waarde}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 space-y-6">
          {resultaat.woningen.map(
            (woning) => (
              <article
                key={woning.woning_id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-6">
                  <div>
                    <Link
                      href={`/woningen/${woning.woning_id}`}
                      className="text-xl font-bold hover:text-emerald-700 hover:underline"
                    >
                      {woning.adres}
                    </Link>

                    <p className="mt-1 text-slate-600">
                      {woning.postcode}{" "}
                      {woning.plaats}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <span
                      className={`rounded-full px-4 py-2 text-sm font-bold ${niveauClass(
                        woning.hoogste_niveau,
                      )}`}
                    >
                      Hoogste niveau:{" "}
                      {woning.hoogste_niveau}
                    </span>

                    <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold">
                      Prioriteit{" "}
                      {woning.prioriteit_score}/100
                    </span>
                  </div>
                </header>

                {!woning.voldoende_historie && (
                  <p className="m-6 rounded-xl bg-amber-50 p-4 text-amber-900">
                    Voor deze woning is nog
                    onvoldoende historische data
                    beschikbaar voor betrouwbare
                    voorspelsignalen.
                  </p>
                )}

                <div className="grid gap-5 p-6 xl:grid-cols-2">
                  {woning.signalen.map(
                    (signaal) => (
                      <section
                        key={signaal.type}
                        className="rounded-2xl border border-slate-200 p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h2 className="text-lg font-bold">
                              {signaal.titel}
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                              Betrouwbaarheid:{" "}
                              {betrouwbaarheidLabel(
                                signaal.betrouwbaarheid,
                              )}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-sm font-bold ${niveauClass(
                              signaal.niveau,
                            )}`}
                          >
                            {signaal.niveau}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                          <div className="rounded-xl bg-slate-100 p-3">
                            <p className="text-xs uppercase text-slate-500">
                              Score
                            </p>
                            <p className="mt-1 font-bold">
                              {signaal.score}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-100 p-3">
                            <p className="text-xs uppercase text-slate-500">
                              Kans
                            </p>
                            <p className="mt-1 font-bold">
                              {signaal.waarschijnlijkheid_percentage ===
                              null
                                ? "—"
                                : `${signaal.waarschijnlijkheid_percentage}%`}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-100 p-3">
                            <p className="text-xs uppercase text-slate-500">
                              Datadekking
                            </p>
                            <p className="mt-1 font-bold">
                              {
                                signaal.datadekking_percentage
                              }
                              %
                            </p>
                          </div>
                        </div>

                        <dl className="mt-5 space-y-4 text-sm leading-6">
                          <div>
                            <dt className="font-bold">
                              Signaal
                            </dt>
                            <dd className="mt-1 text-slate-700">
                              {signaal.signaal}
                            </dd>
                          </div>

                          <div>
                            <dt className="font-bold">
                              Berekening
                            </dt>
                            <dd className="mt-1 text-slate-700">
                              {signaal.berekening}
                            </dd>
                          </div>

                          <div>
                            <dt className="font-bold">
                              Onzekerheid
                            </dt>
                            <dd className="mt-1 text-slate-700">
                              {signaal.onzekerheid}
                            </dd>
                          </div>

                          <div>
                            <dt className="font-bold">
                              Advies
                            </dt>
                            <dd className="mt-1 text-slate-700">
                              {signaal.advies}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-5 rounded-xl bg-slate-100 p-4">
                          <p className="font-bold">
                            Gebruikte bewijzen
                          </p>

                          <ul className="mt-2 space-y-2 text-sm text-slate-700">
                            {signaal.bewijzen.map(
                              (item) => (
                                <li
                                  key={`${item.bron}-${item.omschrijving}`}
                                >
                                  • {item.bron}:{" "}
                                  {
                                    item.aantal_waarnemingen
                                  }{" "}
                                  waarneming(en) —{" "}
                                  {item.omschrijving}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>

                        <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-medium text-blue-900">
                          Dit is een voorspellend
                          signaal, geen vastgestelde
                          feitelijke conclusie.
                        </p>
                      </section>
                    ),
                  )}
                </div>
              </article>
            ),
          )}
        </section>
      </div>
    </main>
  );
}
