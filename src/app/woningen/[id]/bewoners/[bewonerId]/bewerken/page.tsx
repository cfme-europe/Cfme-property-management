import Link from "next/link";
import { notFound } from "next/navigation";
import BewonerForm from "@/components/bewoners/BewonerForm";
import { getBewonerById } from "@/services/bewoners";
import { getHuurdersVoorVerhuurperiode } from "@/services/huurders";
import { getKamersVoorWoning } from "@/services/kamers";
import { getWoningById } from "@/services/woningen";

export const dynamic = "force-dynamic";

export default async function BewonerBewerkenPage({
  params,
}: {
  params: Promise<{
    id: string;
    bewonerId: string;
  }>;
}) {
  const { id, bewonerId } = await params;
  const woningId = Number(id);
  const bewonerNummer = Number(bewonerId);

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0 ||
    !Number.isInteger(bewonerNummer) ||
    bewonerNummer <= 0
  ) {
    notFound();
  }

  const [woning, bewoner, kamers] =
    await Promise.all([
      getWoningById(woningId),
      getBewonerById(bewonerNummer),
      getKamersVoorWoning(woningId),
    ]);

  if (!woning || !bewoner) {
    notFound();
  }

  const huurders =
    await getHuurdersVoorVerhuurperiode(
      bewoner.verhuurperiode_id
    );

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/woningen/${woning.id}/bewoners/${bewoner.id}`}
          className="mb-6 inline-block font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar bewoner
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Bewonersbeheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Bewoner bewerken
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.adres}, {woning.postcode}{" "}
            {woning.plaats}
          </p>

          <div className="mt-8">
            <BewonerForm
              woningId={woning.id}
              verhuurperiodeId={
                bewoner.verhuurperiode_id
              }
              huurders={huurders}
              kamers={kamers}
              bewoner={bewoner}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
