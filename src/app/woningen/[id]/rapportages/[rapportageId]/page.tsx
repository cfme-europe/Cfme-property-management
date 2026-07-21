import Link from "next/link";
import { notFound } from "next/navigation";
import MaandrapportageInhoud from "@/components/rapportages/MaandrapportageInhoud";
import RapportageGenererenButton from "@/components/rapportages/RapportageGenererenButton";
import RapportagePdfButton from "@/components/rapportages/RapportagePdfButton";
import RapportageExcelButton from "@/components/rapportages/RapportageExcelButton";
import { getMaandrapportageById } from "@/services/maandrapportages";
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

  const [woning, rapportage] =
    await Promise.all([
      getWoningById(woningId),
      getMaandrapportageById(
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

        </div>
      </div>
    </main>
  );
}
