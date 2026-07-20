import Link from "next/link";
import { notFound } from "next/navigation";
import GebruikerBeheerForm from "@/components/beheer/GebruikerBeheerForm";
import {
  getGebruikersprofielen,
  huidigeGebruikerIsAdmin,
} from "@/services/gebruikersbeheer";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GebruikersbeheerPage() {
  if (!(await huidigeGebruikerIsAdmin())) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const profielen =
    await getGebruikersprofielen();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="text-emerald-700 hover:underline"
        >
          ← Terug naar dashboard
        </Link>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Beheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Gebruikers en rollen
          </h1>

          <p className="mt-2 text-slate-600">
            Beheer rollen en toegang van bestaande
            CFME-gebruikers.
          </p>

          <div className="mt-7 grid gap-4">
            {profielen.map((profiel) => (
              <GebruikerBeheerForm
                key={profiel.id}
                profiel={profiel}
                eigenGebruikerId={user.id}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
