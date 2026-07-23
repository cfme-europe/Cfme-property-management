import Link from "next/link";
import { notFound } from "next/navigation";
import { getMaandrapportageById } from "@/services/maandrapportages-server";
import { getRapportexportsVoorRapportage } from "@/services/rapportexports-server";
import { getWoningById } from "@/services/woningen-server";
import type {
  RapportexportStatus,
} from "@/types/rapportexport";

export const dynamic = "force-dynamic";

function datumTijd(
  waarde: string | null
): string {
  if (!waarde) {
    return "—";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(waarde));
}

function statusLabel(
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

function statusClass(
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

export default async function ExportgeschiedenisPage({
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
          href={`/woningen/${woning.id}/rapportages/${rapportage.id}`}
          className="mb-6 inline-block font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar rapportage
        </Link>

        <section className="rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Rapportagebeheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Exportgeschiedenis
          </h1>

          <p className="mt-2 text-slate-600">
            {rapportage.titel}
          </p>

          <p className="mt-1 text-slate-600">
            {woning.adres}, {woning.postcode}{" "}
            {woning.plaats}
          </p>

          {exports.length === 0 ? (
            <p className="mt-8 rounded-xl bg-slate-100 p-5 text-slate-600">
              Nog geen exports geregistreerd.
            </p>
          ) : (
            <div className="mt-8 overflow-x-auto">
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
                          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusClass(
                            exportItem.status
                          )}`}
                        >
                          {statusLabel(
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
    </main>
  );
}
