import Link from "next/link";
import { notFound } from "next/navigation";
import MaandrapportageForm from "@/components/rapportages/MaandrapportageForm";
import { getMaandrapportageById } from "@/services/maandrapportages";
import { getWoningById } from "@/services/woningen-server";

export const dynamic = "force-dynamic";

export default async function RapportageBewerkenPage({
  params,
}: {
  params: Promise<{
    id: string;
    rapportageId: string;
  }>;
}) {
  const { id, rapportageId } = await params;
  const woningId = Number(id);
  const rapportageNummer = Number(rapportageId);

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0 ||
    !Number.isInteger(rapportageNummer) ||
    rapportageNummer <= 0
  ) {
    notFound();
  }

  const [woning, rapportage] =
    await Promise.all([
      getWoningById(woningId),
      getMaandrapportageById(
        rapportageNummer
      ),
    ]);

  if (
    !woning ||
    !rapportage ||
    rapportage.woning_id !== woningId
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/woningen/${woning.id}/rapportages/${rapportage.id}`}
          className="mb-6 inline-block font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar rapportage
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Rapportagebeheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Maandrapportage bewerken
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.adres}, {woning.postcode}{" "}
            {woning.plaats}
          </p>

          <div className="mt-8">
            <MaandrapportageForm
              woningId={woning.id}
              verhuurperiodeId={
                rapportage.verhuurperiode_id
              }
              rapportage={rapportage}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
