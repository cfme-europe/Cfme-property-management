import Link from "next/link";
import { notFound } from "next/navigation";
import WoningrouteWizard from "@/components/woningconfiguratie/WoningrouteWizard";
import {
  isWoningrouteOpslagbevestigingGevraagd,
  maakWoningrouteOpslagbevestiging,
} from "@/lib/woningconfiguratie/opslagbevestiging";
import { getWoningConfiguratie } from "@/services/woningconfiguratie-server";
import { getWoningById } from "@/services/woningen-server";

export const dynamic = "force-dynamic";

export default async function WoningconfiguratiePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    opgeslagen?: string | string[];
  }>;
}) {
  const [{ id }, zoekParameters] = await Promise.all([
    params,
    searchParams,
  ]);
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

  const initieleMelding =
    isWoningrouteOpslagbevestigingGevraagd(
      zoekParameters.opgeslagen,
    )
      ? maakWoningrouteOpslagbevestiging(configuratie)
      : "";

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
            Ruimten en inrichting van {woning.adres}
          </h1>

          <p className="mt-2 text-slate-600">
            Bewerk bestaande ruimten direct. Gebruik de andere onderdelen
            alleen wanneer de woningindeling of looproute verandert.
          </p>
        </header>

        <div className="mb-6 flex justify-end">
        <a
          href={`/woningen/${woning.id}/configuratie/controlepunten`}
          className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800"
        >
          Alle controlepunten
        </a>
      </div>

      <WoningrouteWizard
          woningId={woning.id}
          configuratie={configuratie}
          initieleMelding={initieleMelding}
        />

      </div>
    </main>
  );
}
