import Link from "next/link";
import { notFound } from "next/navigation";
import MaandrapportageForm from "@/components/rapportages/MaandrapportageForm";
import { getActieveVerhuurperiodeVoorWoning } from "@/services/verhuurperiodes-server";
import { getActieveRapporttemplates } from "@/services/rapportagebibliotheek";
import { getWoningById } from "@/services/woningen-server";

export const dynamic = "force-dynamic";

export default async function NieuweRapportagePage({
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

  const [woning, actieveVerhuur, actieveTemplates] =
    await Promise.all([
      getWoningById(woningId),
      getActieveVerhuurperiodeVoorWoning(
        woningId
      ),
      getActieveRapporttemplates(),
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

        <div className="rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Rapportagebeheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Nieuwe maandrapportage
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.adres}, {woning.postcode}{" "}
            {woning.plaats}
          </p>

          <div className="mt-8">
            <MaandrapportageForm
              woningId={woning.id}
              verhuurperiodeId={
                actieveVerhuur?.id ?? null
              }
              actieveTemplates={actieveTemplates}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
