import Link from "next/link";
import { notFound } from "next/navigation";
import Kamerbeheer from "@/components/kamers/Kamerbeheer";
import { getKamersVoorWoning } from "@/services/kamers";
import { getWoningById } from "@/services/woningen";

export const dynamic = "force-dynamic";

export default async function KamersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const woningId = Number(id);

  if (!Number.isInteger(woningId) || woningId <= 0) {
    notFound();
  }

  const [woning, kamers] = await Promise.all([
    getWoningById(woningId),
    getKamersVoorWoning(woningId),
  ]);

  if (!woning) {
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

        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Woningdossier
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Kamers van {woning.adres}
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.postcode} {woning.plaats}
          </p>
        </header>

        <Kamerbeheer woningId={woning.id} kamers={kamers} />
      </div>
    </main>
  );
}
