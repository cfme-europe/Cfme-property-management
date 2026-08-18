import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";
import VerhuurperiodeBewerkenForm from "@/components/verhuur/VerhuurperiodeBewerkenForm";
import { getBedrijven } from "@/services/bedrijven-server";
import { getWoningById } from "@/services/woningen-server";
import {
  getActieveVerhuurperiodeVoorWoning,
} from "@/services/verhuurperiodes-server";

export const dynamic = "force-dynamic";

export default async function VerhuurperiodeBewerkenPage({
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

  const [
    woning,
    verhuurperiode,
    bedrijven,
  ] = await Promise.all([
    getWoningById(woningId),
    getActieveVerhuurperiodeVoorWoning(
      woningId
    ),
    getBedrijven(),
  ]);

  if (!woning) {
    notFound();
  }

  if (!verhuurperiode) {
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

        <section className="rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Verhuurbeheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Verhuurperiode bewerken
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.adres}, {woning.postcode}{" "}
            {woning.plaats}
          </p>

          <div className="mt-8">
            <VerhuurperiodeBewerkenForm
              woningId={woning.id}
              bedrijven={bedrijven}
              verhuurperiode={verhuurperiode}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
