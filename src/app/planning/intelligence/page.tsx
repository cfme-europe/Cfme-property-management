import Link from "next/link";
import {
  getControleurPlanningSamenvatting,
  getPlanningIntelligenceSamenvatting,
  getRayonPlanningSamenvatting,
  getWoningPlanningIntelligence,
} from "@/services/planning-intelligence";
import type {
  PlanningStatus,
} from "@/types/planning-intelligence";

export const dynamic = "force-dynamic";

const statusLabels: Record<PlanningStatus, string> = {
  niet_ingepland: "Niet ingepland",
  geen_controleur: "Geen controleur",
  achterstallig: "Achterstallig",
  vandaag: "Vandaag",
  binnen_7_dagen: "Binnen 7 dagen",
  binnen_14_dagen: "Binnen 14 dagen",
  op_schema: "Op schema",
};

const statusClasses: Record<PlanningStatus, string> = {
  niet_ingepland:
    "bg-red-100 text-red-800",
  geen_controleur:
    "bg-orange-100 text-orange-800",
  achterstallig:
    "bg-red-100 text-red-800",
  vandaag:
    "bg-amber-100 text-amber-800",
  binnen_7_dagen:
    "bg-yellow-100 text-yellow-800",
  binnen_14_dagen:
    "bg-blue-100 text-blue-800",
  op_schema:
    "bg-emerald-100 text-emerald-800",
};

function datum(waarde: string | null): string {
  if (!waarde) {
    return "—";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${waarde}T00:00:00`));
}

export default async function PlanningIntelligencePage() {
  const [
    samenvatting,
    woningen,
    rayons,
    controleurs,
  ] = await Promise.all([
    getPlanningIntelligenceSamenvatting(),
    getWoningPlanningIntelligence(),
    getRayonPlanningSamenvatting(),
    getControleurPlanningSamenvatting(),
  ]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/woningen"
              className="font-medium text-blue-700 hover:underline"
            >
              ← Terug naar woningen
            </Link>

            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-blue-700">
              9.0G Planning Intelligence
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Controleplanning en werkvoorraad
            </h1>

            <p className="mt-2 max-w-3xl text-slate-600">
              Actuele controletermijnen, achterstanden,
              rayonbelasting en werkvoorraad per controleur.
            </p>
          </div>

          <Link
            href="/planning/rayons"
            className="rounded-xl border border-blue-700 px-5 py-3 font-medium text-blue-700 hover:bg-blue-50"
          >
            Rayons beheren
          </Link>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [
              "Achterstallig",
              samenvatting.achterstallig,
            ],
            [
              "Vandaag",
              samenvatting.vandaag,
            ],
            [
              "Binnen 7 dagen",
              samenvatting.binnen_7_dagen,
            ],
            [
              "Niet ingepland",
              samenvatting.niet_ingepland,
            ],
            [
              "Geen controleur",
              samenvatting.zonder_controleur,
            ],
            [
              "Binnen 14 dagen",
              samenvatting.binnen_14_dagen,
            ],
            [
              "Op schema",
              samenvatting.op_schema,
            ],
            [
              "Woningen totaal",
              samenvatting.aantal_woningen,
            ],
          ].map(([label, waarde]) => (
            <div
              key={String(label)}
              className="rounded-2xl bg-white p-5 shadow"
            >
              <p className="text-sm text-slate-600">
                {label}
              </p>
              <p className="mt-1 text-3xl font-bold">
                {waarde}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">
            Woningplanning
          </h2>

          <p className="mt-1 text-slate-600">
            Hoogste prioriteit staat bovenaan.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="border-b bg-slate-100">
                <tr>
                  <th className="p-4 text-left">
                    Woning
                  </th>
                  <th className="p-4 text-left">
                    Rayon
                  </th>
                  <th className="p-4 text-left">
                    Controleur
                  </th>
                  <th className="p-4 text-left">
                    Laatste controle
                  </th>
                  <th className="p-4 text-left">
                    Volgende controle
                  </th>
                  <th className="p-4 text-left">
                    Status
                  </th>
                  <th className="p-4 text-right">
                    Actie
                  </th>
                </tr>
              </thead>

              <tbody>
                {woningen.map((woning) => (
                  <tr
                    key={woning.woning_id}
                    className="border-b border-slate-200 last:border-0"
                  >
                    <td className="p-4">
                      <p className="font-semibold">
                        {woning.adres}
                      </p>
                      <p className="text-sm text-slate-600">
                        {woning.postcode} {woning.plaats}
                      </p>
                    </td>

                    <td className="p-4">
                      {woning.rayon_naam ?? "—"}
                      {woning.rayon_code && (
                        <span className="ml-1 text-sm text-slate-500">
                          ({woning.rayon_code})
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      {woning.controleur_naam ||
                        woning.controleur_email ||
                        "—"}
                    </td>

                    <td className="p-4">
                      {datum(woning.laatste_controle_op)}
                    </td>

                    <td className="p-4">
                      <p className="font-medium">
                        {datum(
                          woning.volgende_controle_op
                        )}
                      </p>

                      {woning.dagen_tot_controle !== null && (
                        <p className="text-sm text-slate-500">
                          {woning.dagen_tot_controle < 0
                            ? `${Math.abs(
                                woning.dagen_tot_controle
                              )} dagen te laat`
                            : `${woning.dagen_tot_controle} dagen resterend`}
                        </p>
                      )}
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          statusClasses[
                            woning.planning_status
                          ]
                        }`}
                      >
                        {
                          statusLabels[
                            woning.planning_status
                          ]
                        }
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <Link
                        href={`/woningen/${woning.woning_id}/planning`}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
                      >
                        Planning beheren
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold">
              Werkvoorraad per rayon
            </h2>

            <div className="mt-5 space-y-3">
              {rayons.map((rayon) => (
                <div
                  key={rayon.rayon_id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">
                        {rayon.rayon_naam}
                      </p>
                      <p className="text-sm text-slate-500">
                        {rayon.rayon_code}
                      </p>
                    </div>

                    <p className="text-2xl font-bold">
                      {rayon.werkvoorraad_7_dagen}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <span>
                      Achterstallig:{" "}
                      <strong>
                        {rayon.achterstallig}
                      </strong>
                    </span>
                    <span>
                      Vandaag:{" "}
                      <strong>{rayon.vandaag}</strong>
                    </span>
                    <span>
                      Binnen 7 dagen:{" "}
                      <strong>
                        {rayon.binnen_7_dagen}
                      </strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold">
              Werkvoorraad per controleur
            </h2>

            <div className="mt-5 space-y-3">
              {controleurs.map((controleur) => (
                <div
                  key={controleur.controleur_id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">
                        {controleur.controleur_naam ||
                          controleur.controleur_email ||
                          "Naam onbekend"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {controleur.aantal_woningen} woningen
                      </p>
                    </div>

                    <p className="text-2xl font-bold">
                      {
                        controleur.werkvoorraad_7_dagen
                      }
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <span>
                      Achterstallig:{" "}
                      <strong>
                        {controleur.achterstallig}
                      </strong>
                    </span>
                    <span>
                      Vandaag:{" "}
                      <strong>
                        {controleur.vandaag}
                      </strong>
                    </span>
                    <span>
                      Binnen 7 dagen:{" "}
                      <strong>
                        {controleur.binnen_7_dagen}
                      </strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
