import Link from "next/link";
import { notFound } from "next/navigation";
import MaandrapportageInhoud from "@/components/rapportages/MaandrapportageInhoud";
import RapportageGenererenButton from "@/components/rapportages/RapportageGenererenButton";
import RapportagePdfButton from "@/components/rapportages/RapportagePdfButton";
import RapportageExcelButton from "@/components/rapportages/RapportageExcelButton";
import { getMaandrapportageById } from "@/services/maandrapportages-server";
import { getRapportexportsVoorRapportage } from "@/services/rapportexports-server";
import type {
  RapportexportStatus,
} from "@/types/rapportexport";
import { getWoningById } from "@/services/woningen-server";
import type { MaandrapportageStatus } from "@/types/maandrapportage";

export const dynamic = "force-dynamic";

const maanden = [
  "Januari",
  "Februari",
  "Maart",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Augustus",
  "September",
  "Oktober",
  "November",
  "December",
];

function datumTijd(
  waarde: string | null
): string {
  if (!waarde) return "—";

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(waarde));
}

function exportStatusLabel(
  status: RapportexportStatus
): string {
  const labels: Record<
    RapportexportStatus,
    string
  > = {
    aangemaakt: "Aangemaakt",
    gereed: "Gereed",
    mislukt: "Mislukt",
  };

  return labels[status];
}

function exportStatusClass(
  status: RapportexportStatus
): string {
  const classes: Record<
    RapportexportStatus,
    string
  > = {
    aangemaakt:
      "bg-amber-100 text-amber-800",
    gereed:
      "bg-emerald-100 text-emerald-800",
    mislukt:
      "bg-red-100 text-red-800",
  };

  return classes[status];
}

function statusLabel(
  status: MaandrapportageStatus
): string {
  const labels: Record<
    MaandrapportageStatus,
    string
  > = {
    concept: "Concept",
    definitief: "Definitief",
    verzonden: "Verzonden",
  };

  return labels[status];
}

export default async function RapportageDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
    rapportageId: string;
  }>;
}) {
  const { id, rapportageId } = await params;
  const woningId = Number(id);
  const rapportageNummer = Number(rapportageId);

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0 ||
    !Number.isInteger(rapportageNummer) ||
    rapportageNummer <= 0
  ) {
    notFound();
  }

  const [
    woning,
    rapportage,
    exports,
  ] = await Promise.all([
    getWoningById(woningId),
    getMaandrapportageById(
      rapportageNummer
    ),
    getRapportexportsVoorRapportage(
      rapportageNummer
    ),
  ]);

  if (
    !woning ||
    !rapportage ||
    rapportage.woning_id !== woningId
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/woningen/${woning.id}`}
          className="mb-6 inline-block font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar woning
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Maandrapportage
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                {rapportage.titel}
              </h1>

              <p className="mt-2 text-slate-600">
                {woning.adres}, {woning.postcode}{" "}
                {woning.plaats}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <RapportageGenererenButton
                rapportage={rapportage}
              />

              <RapportagePdfButton
                rapportage={rapportage}
                adres={woning.adres}
                postcode={woning.postcode}
                plaats={woning.plaats}
              />

              <RapportageExcelButton
                rapportage={rapportage}
                adres={woning.adres}
              />

              <Link
                href={`/woningen/${woning.id}/rapportages/${rapportage.id}/bewerken`}
                className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
              >
                Bewerken
              </Link>
            </div>
          </div>

          <dl className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm text-slate-500">
                Rapportperiode
              </dt>
              <dd className="mt-1 font-semibold">
                {
                  maanden[
                    rapportage.rapportmaand - 1
                  ]
                }{" "}
                {rapportage.rapportjaar}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Status
              </dt>
              <dd className="mt-1 font-semibold">
                {statusLabel(rapportage.status)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Ontvanger
              </dt>
              <dd className="mt-1 font-semibold">
                {rapportage.ontvanger_naam ||
                  "—"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                E-mailadres
              </dt>
              <dd className="mt-1 font-semibold">
                {rapportage.ontvanger_email ||
                  "—"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Gegenereerd
              </dt>
              <dd className="mt-1 font-semibold">
                {datumTijd(
                  rapportage.gegenereerd_at
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Verzonden
              </dt>
              <dd className="mt-1 font-semibold">
                {datumTijd(
                  rapportage.verzonden_at
                )}
              </dd>
            </div>
          </dl>

          <section className="mt-8">
            <h2 className="text-xl font-bold">
              Interne opmerkingen
            </h2>

            <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-100 p-5">
              {rapportage.opmerkingen ||
                "Geen opmerkingen."}
            </p>
          </section>

          <MaandrapportageInhoud
            rapportage={rapportage}
          />

          <section className="mt-10">
            <div>
              <h2 className="text-xl font-bold">
                Exportgeschiedenis
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Geregistreerde PDF- en Excel-exports van deze rapportage.
              </p>
            </div>

            {exports.length === 0 ? (
              <p className="mt-4 rounded-xl bg-slate-100 p-5 text-slate-600">
                Nog geen exports geregistreerd.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-300 text-sm text-slate-600">
                      <th className="px-3 py-3">
                        Bestand
                      </th>
                      <th className="px-3 py-3">
                        Formaat
                      </th>
                      <th className="px-3 py-3">
                        Status
                      </th>
                      <th className="px-3 py-3">
                        Aangemaakt
                      </th>
                      <th className="px-3 py-3">
                        Afgerond
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {exports.map((exportItem) => (
                      <tr
                        key={exportItem.id}
                        className="border-b border-slate-200 align-top"
                      >
                        <td className="px-3 py-4 font-medium">
                          {exportItem.bestandsnaam}
                          {exportItem.foutmelding && (
                            <p className="mt-1 text-sm font-normal text-red-700">
                              {exportItem.foutmelding}
                            </p>
                          )}
                        </td>

                        <td className="px-3 py-4 uppercase">
                          {exportItem.exportformaat}
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${exportStatusClass(
                              exportItem.status
                            )}`}
                          >
                            {exportStatusLabel(
                              exportItem.status
                            )}
                          </span>
                        </td>

                        <td className="px-3 py-4">
                          {datumTijd(
                            exportItem.created_at
                          )}
                        </td>

                        <td className="px-3 py-4">
                          {datumTijd(
                            exportItem.gegenereerd_at
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      </div>
    </main>
  );
}
