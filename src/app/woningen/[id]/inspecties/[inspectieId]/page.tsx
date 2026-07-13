import Link from "next/link";
import { notFound } from "next/navigation";
import InspectieVerwijderenButton from "@/components/inspecties/InspectieVerwijderenButton";
import { getInspectieById } from "@/services/inspecties";
import { getWoningById } from "@/services/woningen";
import type {
  AlgemeneToestand,
  InspectieStatus,
  InspectieType,
} from "@/types/inspectie";

export const dynamic = "force-dynamic";

function datum(waarde: string | null): string {
  if (!waarde) return "—";

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${waarde}T00:00:00`));
}

function datumTijd(waarde: string | null): string {
  if (!waarde) return "—";

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(waarde));
}

function typeLabel(type: InspectieType): string {
  const labels: Record<InspectieType, string> = {
    begininspectie: "Begininspectie",
    periodiek: "Periodieke inspectie",
    eindinspectie: "Eindinspectie",
    incident: "Incidentinspectie",
  };

  return labels[type];
}

function statusLabel(status: InspectieStatus): string {
  return status === "afgerond" ? "Afgerond" : "Open";
}

function toestandLabel(
  toestand: AlgemeneToestand
): string {
  const labels: Record<AlgemeneToestand, string> = {
    goed: "Goed",
    aandacht_nodig: "Aandacht nodig",
    slecht: "Slecht",
  };

  return labels[toestand];
}

export default async function InspectieDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
    inspectieId: string;
  }>;
}) {
  const { id, inspectieId } = await params;
  const woningId = Number(id);
  const inspectieNummer = Number(inspectieId);

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0 ||
    !Number.isInteger(inspectieNummer) ||
    inspectieNummer <= 0
  ) {
    notFound();
  }

  const [woning, inspectie] = await Promise.all([
    getWoningById(woningId),
    getInspectieById(inspectieNummer),
  ]);

  if (
    !woning ||
    !inspectie ||
    inspectie.woning_id !== woningId
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
                Inspectiedossier
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                {typeLabel(inspectie.type)}
              </h1>

              <p className="mt-2 text-slate-600">
                {woning.adres}, {woning.postcode}{" "}
                {woning.plaats}
              </p>
            </div>

            <Link
              href={`/woningen/${woning.id}/inspecties/${inspectie.id}/bewerken`}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
            >
              Bewerken
            </Link>
          </div>

          <dl className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm text-slate-500">
                Inspectiedatum
              </dt>
              <dd className="mt-1 font-semibold">
                {datum(inspectie.inspectiedatum)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Status
              </dt>
              <dd className="mt-1">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    inspectie.status === "afgerond"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {statusLabel(inspectie.status)}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Algemene toestand
              </dt>
              <dd className="mt-1 font-semibold">
                {toestandLabel(
                  inspectie.algemene_toestand
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Orde en netheid
              </dt>
              <dd className="mt-1 font-semibold">
                {inspectie.orde_netheid_score} van 5
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Uitgevoerd door
              </dt>
              <dd className="mt-1 font-semibold">
                {inspectie.uitgevoerd_door || "—"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Afgerond op
              </dt>
              <dd className="mt-1 font-semibold">
                {datumTijd(inspectie.afgerond_at)}
              </dd>
            </div>
          </dl>

          <section className="mt-8">
            <h2 className="text-xl font-bold">
              Schade
            </h2>

            {inspectie.schade_aanwezig ? (
              <div className="mt-4 rounded-xl bg-red-50 p-5 text-red-900">
                <p className="font-semibold">
                  Schade aangetroffen
                </p>
                <p className="mt-2 whitespace-pre-wrap">
                  {inspectie.schade_omschrijving}
                </p>
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-emerald-50 p-5 text-emerald-900">
                Geen schade aangetroffen.
              </p>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold">
              Opmerkingen
            </h2>

            <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-100 p-5">
              {inspectie.opmerkingen ||
                "Geen opmerkingen."}
            </p>
          </section>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <InspectieVerwijderenButton
              woningId={woning.id}
              inspectieId={inspectie.id}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
