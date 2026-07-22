import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import VerhuurperiodeBeeindigenForm from "@/components/verhuur/VerhuurperiodeBeeindigenForm";
import { getActieveVerhuurperiodeVoorWoning } from "@/services/verhuurperiodes-server";
import { getWoningById } from "@/services/woningen-server";

export const dynamic = "force-dynamic";

function datum(waarde: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${waarde}T00:00:00`));
}

export default async function VerhuurperiodeBeeindigenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const woningId = Number(id);

  if (!Number.isInteger(woningId) || woningId <= 0) {
    notFound();
  }

  const [woning, actieveVerhuur] = await Promise.all([
    getWoningById(woningId),
    getActieveVerhuurperiodeVoorWoning(woningId),
  ]);

  if (!woning) {
    notFound();
  }

  if (!actieveVerhuur) {
    redirect(`/woningen/${woningId}`);
  }

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
          <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
            Verhuurbeheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Verhuurperiode beëindigen
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.adres}, {woning.postcode} {woning.plaats}
          </p>

          <div className="mt-6 rounded-xl bg-slate-100 p-5">
            <p className="text-sm text-slate-500">Huidige huurder</p>
            <p className="mt-1 font-semibold">
              {actieveVerhuur.bedrijf?.naam ?? "Onbekend bedrijf"}
            </p>

            <p className="mt-4 text-sm text-slate-500">
              Startdatum
            </p>
            <p className="mt-1 font-semibold">
              {datum(actieveVerhuur.startdatum)}
            </p>
          </div>

          <div className="mt-8">
            <VerhuurperiodeBeeindigenForm
              woningId={woning.id}
              verhuurperiodeId={actieveVerhuur.id}
              startdatum={actieveVerhuur.startdatum}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
