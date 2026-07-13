import Link from "next/link";
import { notFound } from "next/navigation";
import VerhuurperiodeForm from "@/components/verhuur/VerhuurperiodeForm";
import { getBedrijven } from "@/services/bedrijven";
import { getWoningById } from "@/services/woningen";

export const dynamic = "force-dynamic";

export default async function NieuweVerhuurperiodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const woningId = Number(id);

  if (!Number.isInteger(woningId) || woningId <= 0) {
    notFound();
  }

  const [woning, bedrijven] = await Promise.all([
    getWoningById(woningId),
    getBedrijven(),
  ]);

  if (!woning) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/woningen/${woning.id}`}
          className="mb-6 inline-block font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar woning
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Verhuurbeheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Nieuwe verhuurperiode
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.adres}, {woning.postcode} {woning.plaats}
          </p>

          <div className="mt-8">
            <VerhuurperiodeForm
              woningId={woning.id}
              bedrijven={bedrijven}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
