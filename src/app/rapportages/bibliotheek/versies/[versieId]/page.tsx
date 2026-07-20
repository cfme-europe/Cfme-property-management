import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import TemplateversieBeheer from "@/components/rapportages/TemplateversieBeheer";
import { magRapportagebibliotheekBeheren } from "@/services/autorisatie";
import {
  getRapportblokken,
  getRapporttemplateById,
  getRapporttemplateversieMetBlokken,
} from "@/services/rapportagebibliotheek";

export const dynamic = "force-dynamic";

export default async function TemplateversiePage({
  params,
}: {
  params: Promise<{ versieId: string }>;
}) {
  if (!(await magRapportagebibliotheekBeheren())) {
    redirect("/");
  }

  const { versieId } = await params;
  const id = Number(versieId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const versie =
    await getRapporttemplateversieMetBlokken(id);

  if (!versie) {
    notFound();
  }

  const [template, rapportblokken] =
    await Promise.all([
      getRapporttemplateById(versie.template_id),
      getRapportblokken(true),
    ]);

  if (!template) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/rapportages/bibliotheek"
          className="font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar rapportagebibliotheek
        </Link>

        <header className="my-6 rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Templateversie
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {template.naam} — versie {versie.versienummer}
          </h1>

          <p className="mt-2 text-slate-600">
            Status: {versie.status}
          </p>
        </header>

        <TemplateversieBeheer
          template={template}
          versie={versie}
          rapportblokken={rapportblokken}
        />
      </div>
    </main>
  );
}
