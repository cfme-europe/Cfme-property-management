import Link from "next/link";
import { notFound } from "next/navigation";
import WoningconfiguratieBeheer from "@/components/woningconfiguratie/WoningconfiguratieBeheer";
import { getWoningConfiguratie } from "@/services/woningconfiguratie-server";
import { getWoningById } from "@/services/woningen-server";

export const dynamic = "force-dynamic";

export default async function WoningconfiguratiePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const woningId = Number(id);

  if (!Number.isInteger(woningId) || woningId <= 0) {
    notFound();
  }

  const [woning, configuratie] = await Promise.all([
    getWoningById(woningId),
    getWoningConfiguratie(woningId),
  ]);

  if (!woning) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/woningen/${woning.id}`}
          className="mb-6 inline-block font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar woning
        </Link>

        <header className="mb-8 rounded-2xl bg-white p-6 shadow sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Woningconfiguratie
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Fysieke looproute van {woning.adres}
          </h1>

          <p className="mt-2 text-slate-600">
            Beheer verdiepingen, ruimten, individuele objecten en relevante
            controlepunten in de werkelijke loopvolgorde.
          </p>
        </header>

        <WoningconfiguratieBeheer
          woningId={woning.id}
          configuratie={configuratie}
        />
      </div>
    </main>
  );
}
