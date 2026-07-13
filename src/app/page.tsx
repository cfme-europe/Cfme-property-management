import Link from "next/link";
import KpiKaart from "@/components/dashboard/KpiKaart";
import { getDashboardData } from "@/services/dashboard";

export const dynamic = "force-dynamic";

function datum(waarde: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${waarde}T00:00:00`));
}

function getal(
  waarde: number,
  maximumFractionDigits = 1
): string {
  return new Intl.NumberFormat("nl-NL", {
    maximumFractionDigits,
  }).format(waarde);
}

function woningNaam(
  woning: {
    adres: string;
    postcode: string;
    plaats: string;
  } | null
): string {
  if (!woning) {
    return "Onbekende woning";
  }

  return `${woning.adres}, ${woning.plaats}`;
}

export default async function Home() {
  const dashboard = await getDashboardData();

  const bezettingspercentage =
    dashboard.kpis.totale_capaciteit > 0
      ? (
          dashboard.kpis
            .actieve_bewoners /
          dashboard.kpis
            .totale_capaciteit
        ) * 100
      : 0;

  const categorieLabels = {
    schade: "Schade",
    onderhoud: "Onderhoud",
    veiligheid: "Veiligheid",
    schoonmaak: "Schoonmaak",
    installatie: "Installatie",
    overig: "Overig",
  };

  const statusLabels = {
    open: "Open",
    in_behandeling: "In behandeling",
    opgelost: "Opgelost",
  };

  const inspectieLabels = {
    begininspectie: "Begininspectie",
    periodiek: "Periodieke inspectie",
    eindinspectie: "Eindinspectie",
    incident: "Incidentinspectie",
  };

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl bg-slate-900 p-7 text-white shadow">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
            Complete Facility Management Europe
          </p>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">
                CFME Control
              </h1>

              <p className="mt-2 text-slate-300">
                Managementoverzicht vastgoed,
                bewoners en operationele opvolging.
              </p>
            </div>

            <nav className="flex flex-wrap gap-3">
              <Link
                href="/bedrijven"
                className="rounded-xl border border-slate-600 px-5 py-3 font-medium hover:bg-slate-800"
              >
                Bedrijven
              </Link>

              <Link
                href="/woningen"
                className="rounded-xl bg-emerald-600 px-5 py-3 font-medium hover:bg-emerald-500"
              >
                Woningen
              </Link>
            </nav>
          </div>
        </header>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiKaart
            titel="Woningen"
            waarde={dashboard.kpis.woningen}
            toelichting={`${dashboard.kpis.actieve_verhuurperiodes} actief verhuurd`}
          />

          <KpiKaart
            titel="Actieve bewoners"
            waarde={dashboard.kpis.actieve_bewoners}
            toelichting={`${getal(bezettingspercentage)}% van ${dashboard.kpis.totale_capaciteit} plaatsen bezet`}
            accent="blauw"
          />

          <KpiKaart
            titel="Open meldingen"
            waarde={dashboard.kpis.open_meldingen}
            toelichting="Nog niet opgelost"
            accent={
              dashboard.kpis.open_meldingen > 0
                ? "amber"
                : "groen"
            }
          />

          <KpiKaart
            titel="Open inspecties"
            waarde={dashboard.kpis.open_inspecties}
            toelichting="Nog af te ronden"
            accent={
              dashboard.kpis.open_inspecties > 0
                ? "amber"
                : "groen"
            }
          />
        </section>

        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <KpiKaart
            titel="Bedrijven"
            waarde={dashboard.kpis.bedrijven}
            toelichting="Geregistreerde huurrelaties"
          />

          <KpiKaart
            titel="Kamers"
            waarde={dashboard.kpis.kamers}
            toelichting={`${dashboard.kpis.totale_capaciteit} totale slaapplaatsen`}
            accent="blauw"
          />

          <KpiKaart
            titel="Energie-afwijkingen"
            waarde={
              dashboard
                .energieAfwijkingen.length
            }
            toelichting="Afwijking van minimaal 20%"
            accent={
              dashboard
                .energieAfwijkingen.length > 0
                ? "rood"
                : "groen"
            }
          />
        </section>

        <div className="mt-7 grid gap-7 xl:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  Open meldingen
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Actuele operationele opvolgpunten.
                </p>
              </div>
            </div>

            {dashboard.openMeldingen.length ===
            0 ? (
              <p className="mt-5 rounded-xl bg-emerald-50 p-5 text-emerald-900">
                Geen open meldingen.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {dashboard.openMeldingen.map(
                  (melding) => (
                    <Link
                      key={melding.id}
                      href={`/woningen/${melding.woning_id}/meldingen/${melding.id}`}
                      className="block rounded-xl border border-slate-200 p-4 hover:border-amber-400"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {melding.titel}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            {woningNaam(
                              melding.woning
                            )}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            melding.prioriteit ===
                            "spoed"
                              ? "bg-red-100 text-red-800"
                              : melding.prioriteit ===
                                  "hoog"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {melding.prioriteit}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                        <span>
                          {
                            categorieLabels[
                              melding.categorie
                            ]
                          }
                        </span>
                        <span>
                          {
                            statusLabels[
                              melding.status
                            ]
                          }
                        </span>
                        <span>
                          {datum(
                            melding.melddatum
                          )}
                        </span>
                      </div>
                    </Link>
                  )
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold">
              Recente inspecties
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Laatste geregistreerde controles.
            </p>

            {dashboard.recenteInspecties
              .length === 0 ? (
              <p className="mt-5 rounded-xl bg-slate-100 p-5 text-slate-600">
                Nog geen inspecties geregistreerd.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {dashboard.recenteInspecties.map(
                  (inspectie) => (
                    <Link
                      key={inspectie.id}
                      href={`/woningen/${inspectie.woning_id}/inspecties/${inspectie.id}`}
                      className="block rounded-xl border border-slate-200 p-4 hover:border-emerald-400"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {
                              inspectieLabels[
                                inspectie.type
                              ]
                            }
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            {woningNaam(
                              inspectie.woning
                            )}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            inspectie
                              .schade_aanwezig
                              ? "bg-red-100 text-red-800"
                              : inspectie.status ===
                                  "open"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {inspectie
                            .schade_aanwezig
                            ? "Schade"
                            : inspectie.status ===
                                "open"
                              ? "Open"
                              : "Afgerond"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                        <span>
                          {datum(
                            inspectie.inspectiedatum
                          )}
                        </span>
                        <span>
                          Orde en netheid:{" "}
                          {
                            inspectie
                              .orde_netheid_score
                          }
                          /5
                        </span>
                      </div>
                    </Link>
                  )
                )}
              </div>
            )}
          </section>
        </div>

        <section className="mt-7 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">
            Energie-afwijkingen
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Laatste verbruiksperiode vergeleken
            met eerdere periodes per woning.
          </p>

          {dashboard.energieAfwijkingen
            .length === 0 ? (
            <p className="mt-5 rounded-xl bg-emerald-50 p-5 text-emerald-900">
              Geen energie-afwijkingen van 20% of
              meer gevonden.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="border-b bg-slate-100">
                  <tr>
                    <th className="p-4 text-left">
                      Woning
                    </th>
                    <th className="p-4 text-left">
                      Verbruik
                    </th>
                    <th className="p-4 text-left">
                      Laatste waarde
                    </th>
                    <th className="p-4 text-left">
                      Eerder gemiddelde
                    </th>
                    <th className="p-4 text-left">
                      Afwijking
                    </th>
                    <th className="p-4 text-left">
                      Periode
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {dashboard.energieAfwijkingen.map(
                    (afwijking) => (
                      <tr
                        key={`${afwijking.woning.id}-${afwijking.soort}`}
                        className="border-b border-slate-200 last:border-0"
                      >
                        <td className="p-4">
                          <Link
                            href={`/woningen/${afwijking.woning.id}`}
                            className="font-semibold text-emerald-700 hover:underline"
                          >
                            {
                              afwijking.woning
                                .adres
                            }
                          </Link>

                          <p className="text-sm text-slate-500">
                            {
                              afwijking.woning
                                .plaats
                            }
                          </p>
                        </td>

                        <td className="p-4">
                          {afwijking.soort}
                        </td>

                        <td className="p-4 font-semibold">
                          {getal(
                            afwijking.laatste_waarde,
                            2
                          )}{" "}
                          {afwijking.eenheid}
                        </td>

                        <td className="p-4">
                          {getal(
                            afwijking.gemiddelde_eerdere,
                            2
                          )}{" "}
                          {afwijking.eenheid}
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-semibold ${
                              afwijking.afwijking_percentage >
                              0
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {afwijking
                              .afwijking_percentage >
                            0
                              ? "+"
                              : ""}
                            {getal(
                              afwijking.afwijking_percentage,
                              1
                            )}
                            %
                          </span>
                        </td>

                        <td className="p-4">
                          {datum(
                            afwijking.periode_van
                          )}
                          {" – "}
                          {datum(
                            afwijking.periode_tot
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
