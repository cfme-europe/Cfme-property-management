import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessIntelligenceCockpit } from "@/services/business-intelligence";
import {
  PLANNING_STATUS_LABELS,
} from "@/types/business-intelligence";

export const dynamic = "force-dynamic";

function datum(
  waarde: string | null
): string {
  if (!waarde) {
    return "—";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${waarde}T00:00:00`));
}

function geld(
  waarde: number
): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(waarde);
}

function statusClass(
  status: string
): string {
  if (
    [
      "achterstallig",
      "niet_ingepland",
    ].includes(status)
  ) {
    return "bg-red-100 text-red-800";
  }

  if (
    [
      "vandaag",
      "geen_controleur",
      "binnen_7_dagen",
    ].includes(status)
  ) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-emerald-100 text-emerald-800";
}

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profiel } =
      await supabase
        .from("profiles")
        .select("rol, actief")
        .eq("id", user.id)
        .maybeSingle();

    if (
      profiel?.actief &&
      profiel.rol === "controleur"
    ) {
      redirect("/controleur");
    }
  }

  let cockpit;

  try {
    cockpit =
      await getBusinessIntelligenceCockpit();
  } catch (error) {
    console.error(
      "[CFME Cockpit] Laden mislukt",
      error
    );

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <section className="max-w-xl rounded-3xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            CFME Control
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            Cockpit tijdelijk niet beschikbaar
          </h1>
          <p className="mt-4 text-slate-600">
            De bestuurlijke gegevens konden niet
            volledig worden geladen.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-medium text-white"
          >
            Opnieuw proberen
          </Link>
        </section>
      </main>
    );
  }

  const kaarten = [
    {
      titel: "Controles vandaag",
      waarde: cockpit.kpis.controles_vandaag,
      href: "/planning/intelligence",
    },
    {
      titel: "Woningen met aandacht",
      waarde:
        cockpit.kpis.woningen_met_aandacht,
      href: "#aandacht",
    },
    {
      titel: "Energie-afwijkingen",
      waarde:
        cockpit.kpis.energie_afwijkingen,
      href: "#energie",
    },
    {
      titel: "Open spoedmeldingen",
      waarde:
        cockpit.kpis.open_spoedmeldingen,
      href: "#spoed",
    },
    {
      titel: "Achterstallige taken",
      waarde:
        cockpit.kpis.achterstallige_taken,
      href: "#taken",
    },
    {
      titel: "Overbezette woningen",
      waarde:
        cockpit.kpis.overbezette_woningen,
      href: "#bezetting",
    },
    {
      titel: "Compliance kritisch",
      waarde:
        cockpit.kpis.verlopen_compliance,
      href: "#compliance",
    },
    {
      titel: "Geregistreerde kosten",
      waarde: geld(
        cockpit.kpis.kosten_totaal
      ),
      href: "#kosten",
    },
    {
      titel: "Rapportages gereed",
      waarde:
        cockpit.kpis.rapportages_gereed,
      href: "#rapportages",
    },
    {
      titel: "Rapportages achterstallig",
      waarde:
        cockpit.kpis
          .rapportages_achterstallig,
      href: "#rapportages",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-900 sm:px-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-lg">
          <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-5 py-4 md:px-8">
            <Link
              href="/"
              className="text-lg font-bold"
            >
              CFME Control
            </Link>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/woningen"
                className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-slate-800"
              >
                Woningen
              </Link>
              <Link
                href="/planning/intelligence"
                className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-slate-800"
              >
                Planning
              </Link>
              <Link
                href="/rapportages/bibliotheek"
                className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-slate-800"
              >
                Rapportages
              </Link>
              <Link
                href="/beheer/gebruikers"
                className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-slate-800"
              >
                Gebruikers
              </Link>
            </div>
          </nav>

          <div className="px-5 py-8 md:px-8 md:py-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
              Business Intelligence Cockpit
            </p>
            <h1 className="mt-3 text-3xl font-bold md:text-5xl">
              Vandaag sturen op oorzaak en actie
            </h1>
            <p className="mt-3 max-w-3xl text-slate-300">
              Planning, risico, energie,
              onderhoud, compliance, bezetting,
              kosten en rapportages in één
              bestuurlijk overzicht.
            </p>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {kaarten.map((kaart) => (
            <Link
              key={kaart.titel}
              href={kaart.href}
              className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-sm text-slate-600">
                {kaart.titel}
              </p>
              <p className="mt-2 text-3xl font-bold">
                {kaart.waarde}
              </p>
              <p className="mt-3 text-sm font-medium text-emerald-700">
                Open oorzaak en actie →
              </p>
            </Link>
          ))}
        </section>

        <section
          id="aandacht"
          className="mt-7 rounded-2xl bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                Woningen die aandacht vragen
              </h2>
              <p className="mt-1 text-slate-600">
                Samengevoegd uit planning,
                Woning-DNA, meldingen, taken,
                energie, bezetting en compliance.
              </p>
            </div>
          </div>

          {cockpit.aandachtspunten.length === 0 ? (
            <p className="mt-5 rounded-xl bg-emerald-50 p-5 text-emerald-900">
              Geen woningen met actuele aandacht.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {cockpit.aandachtspunten.map(
                (aandachtspunt) => (
                  <Link
                    key={aandachtspunt.woning.id}
                    href={`/woningen/${aandachtspunt.woning.id}`}
                    className="rounded-xl border border-slate-200 p-5 hover:border-emerald-500"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">
                          {
                            aandachtspunt.woning
                              .adres
                          }
                        </p>
                        <p className="text-sm text-slate-600">
                          {
                            aandachtspunt.woning
                              .postcode
                          }{" "}
                          {
                            aandachtspunt.woning
                              .plaats
                          }
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          aandachtspunt.urgentie ===
                          "kritiek"
                            ? "bg-red-100 text-red-800"
                            : aandachtspunt.urgentie ===
                                "hoog"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {aandachtspunt.urgentie}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {aandachtspunt.oorzaken.map(
                        (oorzaak) => (
                          <span
                            key={oorzaak}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                          >
                            {oorzaak}
                          </span>
                        )
                      )}
                    </div>
                  </Link>
                )
              )}
            </div>
          )}
        </section>

        <section className="mt-7 grid gap-7 xl:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Controlewerkvoorraad
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Vandaag en eerstvolgende termijnen.
            </p>

            <div className="mt-5 space-y-3">
              {cockpit.planning
                .filter(
                  (regel) =>
                    regel.planning_status !==
                    "op_schema"
                )
                .slice(0, 10)
                .map((regel) => (
                  <Link
                    key={regel.woning_id}
                    href={`/woningen/${regel.woning_id}/planning`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 hover:border-blue-500"
                  >
                    <div>
                      <p className="font-semibold">
                        {regel.adres}
                      </p>
                      <p className="text-sm text-slate-600">
                        {regel.plaats} ·{" "}
                        {datum(
                          regel.volgende_controle_op
                        )}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                        regel.planning_status
                      )}`}
                    >
                      {
                        PLANNING_STATUS_LABELS[
                          regel.planning_status
                        ]
                      }
                    </span>
                  </Link>
                ))}
            </div>
          </div>

          <div
            id="spoed"
            className="rounded-2xl bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold">
              Open spoedmeldingen
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Directe operationele actie vereist.
            </p>

            {cockpit.spoedmeldingen.length === 0 ? (
              <p className="mt-5 rounded-xl bg-emerald-50 p-5 text-emerald-900">
                Geen open spoedmeldingen.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {cockpit.spoedmeldingen.map(
                  (melding) => (
                    <Link
                      key={melding.id}
                      href={`/woningen/${melding.woning_id}/meldingen/${melding.id}`}
                      className="block rounded-xl border border-red-200 p-4 hover:bg-red-50"
                    >
                      <p className="font-semibold">
                        {melding.titel}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {melding.woning?.adres ??
                          "Onbekende woning"}
                      </p>
                    </Link>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        <section className="mt-7 grid gap-7 xl:grid-cols-2">
          <div
            id="taken"
            className="rounded-2xl bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold">
              Achterstallige taken
            </h2>

            <div className="mt-5 space-y-3">
              {cockpit.achterstalligeTaken
                .slice(0, 10)
                .map((taak) => (
                  <Link
                    key={taak.id}
                    href={`/woningen/${taak.woning_id}/taken/${taak.id}/bewerken`}
                    className="block rounded-xl border border-slate-200 p-4 hover:border-red-500"
                  >
                    <p className="font-semibold">
                      {taak.titel}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Deadline:{" "}
                      {datum(taak.deadline)}
                    </p>
                  </Link>
                ))}
            </div>
          </div>

          <div
            id="bezetting"
            className="rounded-2xl bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold">
              Overbezetting
            </h2>

            {cockpit.overbezetting.length === 0 ? (
              <p className="mt-5 rounded-xl bg-emerald-50 p-5 text-emerald-900">
                Geen overbezette woningen.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {cockpit.overbezetting.map(
                  (regel) => (
                    <Link
                      key={regel.woning.id}
                      href={`/woningen/${regel.woning.id}`}
                      className="flex items-center justify-between rounded-xl border border-red-200 p-4"
                    >
                      <div>
                        <p className="font-semibold">
                          {regel.woning.adres}
                        </p>
                        <p className="text-sm text-slate-600">
                          {regel.bewoners} bewoners ·{" "}
                          {regel.capaciteit} plaatsen
                        </p>
                      </div>
                      <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-800">
                        +{regel.overschrijding}
                      </span>
                    </Link>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        <section
          id="energie"
          className="mt-7 rounded-2xl bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-bold">
            Energie-afwijkingen
          </h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead className="border-b bg-slate-100">
                <tr>
                  <th className="p-4 text-left">
                    Woning
                  </th>
                  <th className="p-4 text-left">
                    Drager
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
                {cockpit.energieAfwijkingen.map(
                  (regel) => (
                    <tr
                      key={`${regel.woning.id}-${regel.soort}`}
                      className="border-b"
                    >
                      <td className="p-4">
                        <Link
                          href={`/woningen/${regel.woning.id}`}
                          className="font-semibold text-emerald-700"
                        >
                          {regel.woning.adres}
                        </Link>
                      </td>
                      <td className="p-4">
                        {regel.soort}
                      </td>
                      <td className="p-4 font-bold">
                        {regel.afwijking_percentage >
                        0
                          ? "+"
                          : ""}
                        {Math.round(
                          regel.afwijking_percentage
                        )}
                        %
                      </td>
                      <td className="p-4">
                        {datum(regel.periode_van)}
                        {" – "}
                        {datum(regel.periode_tot)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-7 grid gap-7 xl:grid-cols-2">
          <div
            id="kosten"
            className="rounded-2xl bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold">
              Kosten
            </h2>
            <p className="mt-3 text-4xl font-bold">
              {geld(cockpit.kosten.totaal)}
            </p>
            <p className="mt-2 text-slate-600">
              Vastgelegd in{" "}
              {cockpit.kosten.registraties}{" "}
              onderhoudsregistraties.
            </p>
          </div>

          <div
            id="rapportages"
            className="rounded-2xl bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold">
              Rapportagestatus
            </h2>

            <div className="mt-5 space-y-3">
              {cockpit.rapportages
                .slice(0, 10)
                .map((rapportage) => (
                  <Link
                    key={rapportage.id}
                    href={`/woningen/${rapportage.woning_id}/rapportages/${rapportage.id}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                  >
                    <div>
                      <p className="font-semibold">
                        {rapportage.titel}
                      </p>
                      <p className="text-sm text-slate-600">
                        {rapportage.woning?.adres ??
                          "Onbekende woning"}{" "}
                        · {rapportage.rapportmaand}/
                        {rapportage.rapportjaar}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        rapportage.achterstallig
                          ? "bg-red-100 text-red-800"
                          : rapportage.status ===
                              "definitief"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {rapportage.achterstallig
                        ? "Achterstallig"
                        : rapportage.status}
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
