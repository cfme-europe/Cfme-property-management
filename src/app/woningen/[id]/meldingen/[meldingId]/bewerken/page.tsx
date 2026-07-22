import Link from "next/link";
import { notFound } from "next/navigation";
import MeldingForm from "@/components/meldingen/MeldingForm";
import { getInspectiesVoorWoning } from "@/services/inspecties-server";
import { getMeldingById } from "@/services/meldingen";
import { getWoningById } from "@/services/woningen-server";

export const dynamic = "force-dynamic";

export default async function MeldingBewerkenPage({
  params,
}: {
  params: Promise<{
    id: string;
    meldingId: string;
  }>;
}) {
  const { id, meldingId } = await params;
  const woningId = Number(id);
  const meldingNummer = Number(meldingId);

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0 ||
    !Number.isInteger(meldingNummer) ||
    meldingNummer <= 0
  ) {
    notFound();
  }

  const [woning, melding, inspecties] =
    await Promise.all([
      getWoningById(woningId),
      getMeldingById(meldingNummer),
      getInspectiesVoorWoning(woningId),
    ]);

  if (
    !woning ||
    !melding ||
    melding.woning_id !== woningId
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/woningen/${woning.id}/meldingen/${melding.id}`}
          className="mb-6 inline-block font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar melding
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
            Meldingenbeheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Melding bewerken
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.adres}, {woning.postcode}{" "}
            {woning.plaats}
          </p>

          <div className="mt-8">
            <MeldingForm
              woningId={woning.id}
              inspecties={inspecties}
              melding={melding}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
