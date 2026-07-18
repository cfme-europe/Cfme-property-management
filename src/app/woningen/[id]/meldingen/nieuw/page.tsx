import Link from "next/link";
import { notFound } from "next/navigation";
import MeldingForm from "@/components/meldingen/MeldingForm";
import { getInspectiesVoorWoning } from "@/services/inspecties";
import { getWoningById } from "@/services/woningen-server";

export const dynamic = "force-dynamic";

export default async function NieuweMeldingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    inspectieId?: string;
  }>;
}) {
  const { id } = await params;
  const { inspectieId } = await searchParams;

  const woningId = Number(id);
  const standaardInspectieId = inspectieId
    ? Number(inspectieId)
    : null;

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0
  ) {
    notFound();
  }

  const [woning, inspecties] = await Promise.all([
    getWoningById(woningId),
    getInspectiesVoorWoning(woningId),
  ]);

  if (!woning) {
    notFound();
  }

  const geldigeStandaardInspectie =
    standaardInspectieId &&
    Number.isInteger(standaardInspectieId) &&
    inspecties.some(
      (inspectie) =>
        inspectie.id === standaardInspectieId
    )
      ? standaardInspectieId
      : null;

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
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Meldingenbeheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Nieuwe melding
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.adres}, {woning.postcode}{" "}
            {woning.plaats}
          </p>

          <div className="mt-8">
            <MeldingForm
              woningId={woning.id}
              inspecties={inspecties}
              standaardInspectieId={
                geldigeStandaardInspectie
              }
            />
          </div>
        </div>
      </div>
    </main>
  );
}
