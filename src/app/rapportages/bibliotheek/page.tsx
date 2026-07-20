import Link from "next/link";
import { redirect } from "next/navigation";
import RapportagebibliotheekBeheer from "@/components/rapportages/RapportagebibliotheekBeheer";
import { magRapportagebibliotheekBeheren } from "@/services/autorisatie";
import {
  getRapportblokken,
  getRapporttemplatesMetVersies,
} from "@/services/rapportagebibliotheek";

export const dynamic = "force-dynamic";

export default async function RapportagebibliotheekPage() {
  if (!(await magRapportagebibliotheekBeheren())) {
    redirect("/");
  }

  const [rapportblokken, rapporttemplates] =
    await Promise.all([
      getRapportblokken(),
      getRapporttemplatesMetVersies(),
    ]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar dashboard
        </Link>

        <header className="my-6 rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Rapportagebeheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Rapportagebibliotheek
          </h1>

          <p className="mt-2 text-slate-600">
            Beheer rapportblokken, templates en onveranderlijke templateversies.
          </p>
        </header>

        <RapportagebibliotheekBeheer
          rapportblokken={rapportblokken}
          rapporttemplates={rapporttemplates}
        />
      </div>
    </main>
  );
}
