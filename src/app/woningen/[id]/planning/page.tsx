import Link from "next/link";
import { notFound } from "next/navigation";
import WoningPlanningBeheer from "@/components/planning/WoningPlanningBeheer";
import {
  getActieveProfielen,
  getActieveWoningplanning,
  getActieveWoningRayonToewijzing,
  getRayons,
} from "@/services/planning";
import { getWoningById } from "@/services/woningen";

export const dynamic = "force-dynamic";

export default async function WoningPlanningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const woningId = Number(id);

  if (!Number.isInteger(woningId) || woningId <= 0) {
    notFound();
  }

  const [
    woning,
    rayons,
    profielen,
    planning,
    toewijzing,
  ] = await Promise.all([
    getWoningById(woningId),
    getRayons(true),
    getActieveProfielen(),
    getActieveWoningplanning(woningId),
    getActieveWoningRayonToewijzing(woningId),
  ]);

  if (!woning) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/woningen/${woning.id}`}
          className="font-medium text-blue-700 hover:underline"
        >
          ← Terug naar woningdossier
        </Link>

        <header className="my-6 rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Operationele planning
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {woning.adres}
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.postcode} {woning.plaats}
          </p>
        </header>

        <WoningPlanningBeheer
          woningId={woning.id}
          rayons={rayons}
          profielen={profielen}
          planning={planning}
          toewijzing={toewijzing}
        />
      </div>
    </main>
  );
}
