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
      ? Math.min(
          100,
          (
            dashboard.kpis.actieve_bewoners /
            dashboard.kpis.totale_capaciteit
          ) * 100
        )
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

  const prioriteitLabels = {
    laag: "Laag",
    normaal: "Normaal",
    hoog: "Hoog",
    spoed: "Spoed",
  };

  const inspectieLabels = {
    begininspectie: "Begininspectie",
    periodiek: "Periodieke inspectie",
    eindinspectie: "Eindinspectie",
    incident: "Incidentinspectie",
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-900 sm:px-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-lg">
          <div className="border-b border-slate-800 px-5 py-4 md:px-8">
            <nav className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/"
                className="text-lg font-bold tracking-tight"
              >
                CFME Control
              </Link>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/bedrijven"
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white"
                >
                  Bedrijven
                </Link>

                <Link
                  href="/woningen"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Woningen
                </Link>

          <Link
            href="/beheer/gebruikers"
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            Gebruikers
          </Link>
              </div>
            </nav>
          </div>

          <div className="grid gap-8 px-5 py-7 md:grid-cols-[1fr_auto] md:items-end md:px-8 md:py-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
                Complete Facility Management Europe
              </p>

              <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
                Managementdashboard
              </h1>

              <p className="mt-3 max-w-2xl text-slate-300">
                Actueel overzicht van vastgoed, bewoners,
                meldingen, inspecties en energieverbruik.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/woningen/nieuw"
                className="rounded-xl border border-slate-600 px-5 py-3 font-medium hover:bg-slate-800"
              >
                Woning toevoegen
              </Link>

              <Link
                href="/bedrijven/nieuw"
                className="rounded-xl bg-white px-5 py-3 font-medium text-slate-950 hover:bg-slate-100"
              >
                Bedrijf toevoegen
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">
                Totale bezetting
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                {dashboard.kpis.actieve_bewoners} van{" "}
                {dashboard.kpis.totale_capaciteit} beschikbare
                slaapplaatsen bezet.
              </p>
            </div>

            <p className="text-3xl font-bold text-emerald-700">
              {getal(bezettingspercentage)}%
            </p>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{
                width: `${bezettingspercentage}%`,
              }}
            />
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiKaart
            titel="Woningen"
            waarde={dashboard.kpis.woningen}
            toelichting={`${dashboard.kpis.actieve_verhuurperiodes} actief verhuurd`}
            href="/woningen"
          />

          <KpiKaart
            titel="Actieve bewoners"
            waarde={dashboard.kpis.actieve_bewoners}
            toelichting={`${dashboard.kpis.totale_capaciteit} totale slaapplaatsen`}
            accent="blauw"
            href="/woningen"
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

        <section className="mt-4 grid gap-4 sm:grid-cols-3">
          <KpiKaart
            titel="Bedrijven"
            waarde={dashboard.kpis.bedrijven}
            toelichting="Geregistreerde huurrelaties"
            href="/bedrijven"
          />

          <KpiKaart
            titel="Kamers"
            waarde={dashboard.kpis.kamers}
            toelichting={`${dashboard.kpis.totale_capaciteit} totale slaapplaatsen`}
            accent="blauw"
            href="/woningen"
          />

          <KpiKaart
            titel="Energie-afwijkingen"
            waarde={dashboard.energieAfwijkingen.length}
            toelichting="Afwijking van minimaal 20%"
            accent={
              dashboard.energieAfwijkingen.length > 0
                ? "rood"
                : "groen"
            }
          />
        </section>

        <section className="mt-7 rounded-2xl bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                Snelle acties
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Direct naar de meest gebruikte onderdelen.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/woningen"
              className="rounded-xl border border-slate-200 p-4 font-semibold hover:border-emerald-500 hover:bg-emerald-50"
            >
              Woningen beheren
              <span className="mt-2 block text-sm font-normal text-slate-500">
                Dossiers, bewoners en verhuur
              </span>
            </Link>

            <Link
              href="/bedrijven"
              className="rounded-xl border border-slate-200 p-4 font-semibold hover:border-emerald-500 hover:bg-emerald-50"
            >
              Bedrijven beheren
              <span className="mt-2 block text-sm font-normal text-slate-500">
                Klanten en gekoppelde woningen
              </span>
            </Link>

            <Link
              href="/woningen/nieuw"
              className="rounded-xl border border-slate-200 p-4 font-semibold hover:border-emerald-500 hover:bg-emerald-50"
            >
              Nieuwe woning
              <span className="mt-2 block text-sm font-normal text-slate-500">
                Nieuw vastgoeddossier starten
              </span>
            </Link>

            <Link
              href="/bedrijven/nieuw"
              className="rounded-xl border border-slate-200 p-4 font-semibold hover:border-emerald-500 hover:bg-emerald-50"
            >
              Nieuw bedrijf
              <span className="mt-2 block text-sm font-normal text-slate-500">
                Nieuwe huurrelatie registreren
              </span>
            </Link>
          </div>
        </section>

        <div className="mt-7 grid gap-7 xl:grid-cols-2">
          <section className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
            <div>
              <h2 className="text-xl font-bold">
                Open meldingen
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Actuele operationele opvolgpunten.
              </p>
            </div>

            {dashboard.openMeldingen.length === 0 ? (
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
                      className="block rounded-xl border border-slate-200 p-4 transition hover:border-amber-400 hover:shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {melding.titel}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            {woningNaam(melding.woning)}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            melding.prioriteit === "spoed"
                              ? "bg-red-100 text-red-800"
                              : melding.prioriteit === "hoog"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {
                            prioriteitLabels[
                              melding.prioriteit
                            ]
                          }
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
                          {statusLabels[melding.status]}
                        </span>

                        <span>
                          {datum(melding.melddatum)}
                        </span>
                      </div>
                    </Link>
                  )
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-bold">
              Recente inspecties
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Laatste geregistreerde controles.
            </p>

            {dashboard.recenteInspecties.length === 0 ? (
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
                      className="block rounded-xl border border-slate-200 p-4 transition hover:border-emerald-400 hover:shadow-sm"
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
                            {woningNaam(inspectie.woning)}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            inspectie.schade_aanwezig
                              ? "bg-red-100 text-red-800"
                              : inspectie.status === "open"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {inspectie.schade_aanwezig
                            ? "Schade"
                            : inspectie.status === "open"
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

        <section className="mt-7 rounded-2xl bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-xl font-bold">
            Energie-afwijkingen
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Laatste verbruiksperiode vergeleken met eerdere
            periodes per woning.
          </p>

          {dashboard.energieAfwijkingen.length === 0 ? (
            <p className="mt-5 rounded-xl bg-emerald-50 p-5 text-emerald-900">
              Geen energie-afwijkingen van 20% of meer
              gevonden.
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
                            {afwijking.woning.adres}
                          </Link>

                          <p className="text-sm text-slate-500">
                            {afwijking.woning.plaats}
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
                              .afwijking_percentage > 0
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
                          {datum(afwijking.periode_van)}
                          {" – "}
                          {datum(afwijking.periode_tot)}
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
