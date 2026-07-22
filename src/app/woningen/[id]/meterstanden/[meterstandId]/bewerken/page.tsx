import Link from "next/link";
import { notFound } from "next/navigation";
import MeterstandForm from "@/components/meterstanden/MeterstandForm";
import { getMeterstandById } from "@/services/meterstanden-server";
import { getWoningById } from "@/services/woningen-server";

export const dynamic = "force-dynamic";

export default async function MeterstandBewerkenPage({
  params,
}: {
  params: Promise<{
    id: string;
    meterstandId: string;
  }>;
}) {
  const { id, meterstandId } = await params;
  const woningId = Number(id);
  const meterstandNummer = Number(meterstandId);

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0 ||
    !Number.isInteger(meterstandNummer) ||
    meterstandNummer <= 0
  ) {
    notFound();
  }

  const [woning, meterstand] = await Promise.all([
    getWoningById(woningId),
    getMeterstandById(meterstandNummer),
  ]);

  if (
    !woning ||
    !meterstand ||
    meterstand.woning_id !== woningId
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/woningen/${woning.id}/meterstanden/${meterstand.id}`}
          className="mb-6 inline-block font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar meteropname
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Energiebeheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Meteropname bewerken
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.adres}, {woning.postcode}{" "}
            {woning.plaats}
          </p>

          <div className="mt-8">
            <MeterstandForm
              woningId={woning.id}
              standaardBewonersAantal={
                meterstand.bewoners_aantal
              }
              meterstand={meterstand}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
