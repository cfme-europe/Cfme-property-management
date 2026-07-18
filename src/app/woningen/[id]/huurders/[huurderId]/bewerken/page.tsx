import Link from "next/link";
import { notFound } from "next/navigation";
import HuurderForm from "@/components/huurders/HuurderForm";
import { getHuurderById } from "@/services/huurders";
import { getWoningById } from "@/services/woningen-server";

export const dynamic = "force-dynamic";

export default async function HuurderBewerkenPage({
  params,
}: {
  params: Promise<{ id: string; huurderId: string }>;
}) {
  const { id, huurderId } = await params;
  const woningId = Number(id);
  const huurderNummer = Number(huurderId);

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0 ||
    !Number.isInteger(huurderNummer) ||
    huurderNummer <= 0
  ) {
    notFound();
  }

  const [woning, huurder] = await Promise.all([
    getWoningById(woningId),
    getHuurderById(huurderNummer),
  ]);

  if (!woning || !huurder) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/woningen/${woning.id}/huurders/${huurder.id}`}
          className="mb-6 inline-block font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar huurder
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Huurdersbeheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Huurder bewerken
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.adres}, {woning.postcode} {woning.plaats}
          </p>

          <div className="mt-8">
            <HuurderForm
              woningId={woning.id}
              verhuurperiodeId={huurder.verhuurperiode_id}
              huurder={huurder}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
