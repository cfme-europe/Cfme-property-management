import Link from "next/link";
import { notFound } from "next/navigation";
import InspectieForm from "@/components/inspecties/InspectieForm";
import { getInspectieById } from "@/services/inspecties";
import { getWoningById } from "@/services/woningen-server";

export const dynamic = "force-dynamic";

export default async function InspectieBewerkenPage({
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
          href={`/woningen/${woning.id}/inspecties/${inspectie.id}`}
          className="mb-6 inline-block font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar inspectie
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Inspectiebeheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Inspectie bewerken
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.adres}, {woning.postcode}{" "}
            {woning.plaats}
          </p>

          <div className="mt-8">
            <InspectieForm
              woningId={woning.id}
              verhuurperiodeId={
                inspectie.verhuurperiode_id
              }
              inspectie={inspectie}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
