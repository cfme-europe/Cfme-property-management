import Link from "next/link";
import { notFound } from "next/navigation";
import BedrijfEditForm from "@/components/bedrijven/BedrijfEditForm";
import { getBedrijfById } from "@/services/bedrijven-server";

export const dynamic = "force-dynamic";

export default async function BedrijfBewerkenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bedrijfId = Number(id);

  if (!Number.isInteger(bedrijfId) || bedrijfId <= 0) {
    notFound();
  }

  const bedrijf = await getBedrijfById(bedrijfId);

  if (!bedrijf) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/bedrijven/${bedrijf.id}`}
          className="mb-6 inline-block font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar bedrijfsdossier
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold">
            Bedrijf bewerken
          </h1>

          <p className="mt-2 text-slate-600">
            {bedrijf.naam}
          </p>

          <div className="mt-8">
            <BedrijfEditForm bedrijf={bedrijf} />
          </div>
        </div>
      </div>
    </main>
  );
}
