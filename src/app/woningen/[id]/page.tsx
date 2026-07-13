import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Woning = {
  id: number;
  adres: string;
  postcode: string;
  plaats: string;
  created_at: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function WoningDossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: woning, error } = await supabase
    .from("woningen")
    .select("id, adres, postcode, plaats, created_at")
    .eq("id", id)
    .single<Woning>();

  if (error || !woning) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/woningen"
          className="mb-6 inline-block font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar woningen
        </Link>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow">
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-emerald-700">
            Woningdossier
          </p>

          <h1 className="text-3xl font-bold">{woning.adres}</h1>

          <p className="mt-2 text-slate-600">
            {woning.postcode} {woning.plaats}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold">Algemene gegevens</h2>

            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-slate-500">Adres</dt>
                <dd className="font-medium">{woning.adres}</dd>
              </div>

              <div>
                <dt className="text-sm text-slate-500">Postcode</dt>
                <dd className="font-medium">{woning.postcode}</dd>
              </div>

              <div>
                <dt className="text-sm text-slate-500">Plaats</dt>
                <dd className="font-medium">{woning.plaats}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-bold">Onderdelen</h2>

            <div className="grid gap-3">
              <button className="rounded-xl border border-slate-200 p-4 text-left font-medium">
                Bewoners
              </button>

              <button className="rounded-xl border border-slate-200 p-4 text-left font-medium">
                Meterstanden
              </button>

              <button className="rounded-xl border border-slate-200 p-4 text-left font-medium">
                Inspecties
              </button>

              <button className="rounded-xl border border-slate-200 p-4 text-left font-medium">
                Meldingen en schades
              </button>

              <button className="rounded-xl border border-slate-200 p-4 text-left font-medium">
                Documenten en certificaten
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}