import Link from "next/link";
import { notFound } from "next/navigation";
import MeterstandForm from "@/components/meterstanden/MeterstandForm";
import { getBewonersVoorVerhuurperiode } from "@/services/bewoners";
import { getActieveVerhuurperiodeVoorWoning } from "@/services/verhuurperiodes";
import { getWoningById } from "@/services/woningen";

export const dynamic = "force-dynamic";

export default async function NieuweMeterstandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const woningId = Number(id);

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0
  ) {
    notFound();
  }

  const [woning, actieveVerhuur] = await Promise.all([
    getWoningById(woningId),
    getActieveVerhuurperiodeVoorWoning(woningId),
  ]);

  if (!woning) {
    notFound();
  }

  const bewoners = actieveVerhuur
    ? await getBewonersVoorVerhuurperiode(
        actieveVerhuur.id
      )
    : [];

  const actieveBewoners = bewoners.filter(
    (bewoner) => bewoner.status === "actief"
  ).length;

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
            Energiebeheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Nieuwe meteropname
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.adres}, {woning.postcode}{" "}
            {woning.plaats}
          </p>

          <div className="mt-8">
            <MeterstandForm
              woningId={woning.id}
              standaardBewonersAantal={
                actieveBewoners
              }
            />
          </div>
        </div>
      </div>
    </main>
  );
}
