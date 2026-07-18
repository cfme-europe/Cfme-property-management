import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BewonerForm from "@/components/bewoners/BewonerForm";
import { getHuurdersVoorVerhuurperiode } from "@/services/huurders";
import { getKamersVoorWoning } from "@/services/kamers";
import { getActieveVerhuurperiodeVoorWoning } from "@/services/verhuurperiodes";
import { getWoningById } from "@/services/woningen-server";

export const dynamic = "force-dynamic";

export default async function NieuweBewonerPage({
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

  const [woning, actieveVerhuur, kamers] =
    await Promise.all([
      getWoningById(woningId),
      getActieveVerhuurperiodeVoorWoning(woningId),
      getKamersVoorWoning(woningId),
    ]);

  if (!woning) {
    notFound();
  }

  if (!actieveVerhuur) {
    redirect(`/woningen/${woningId}`);
  }

  const huurders =
    await getHuurdersVoorVerhuurperiode(
      actieveVerhuur.id
    );

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
            Bewonersbeheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Nieuwe bewoner
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.adres}, {woning.postcode}{" "}
            {woning.plaats}
          </p>

          <div className="mt-8">
            <BewonerForm
              woningId={woning.id}
              verhuurperiodeId={actieveVerhuur.id}
              huurders={huurders}
              kamers={kamers}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
