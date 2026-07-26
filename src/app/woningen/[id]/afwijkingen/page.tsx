import Link from "next/link";
import { notFound } from "next/navigation";
import ControleAfwijkingenBeheer from "@/components/afwijkingen/ControleAfwijkingenBeheer";
import { getControleAfwijkingenVoorWoning } from "@/services/controleafwijkingen-server";
import { getWoningById } from "@/services/woningen-server";

export const dynamic = "force-dynamic";

export default async function ControleAfwijkingenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const woningId = Number(id);

  if (!Number.isInteger(woningId) || woningId <= 0) {
    notFound();
  }

  const [woning, afwijkingen] = await Promise.all([
    getWoningById(woningId),
    getControleAfwijkingenVoorWoning(woningId),
  ]);

  if (!woning) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/woningen/${woning.id}`}
          className="font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar woning
        </Link>

        <header className="my-6 rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Automatische opvolging
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Afwijkingen – {woning.adres}
          </h1>
          <p className="mt-2 text-slate-600">
            Beheer herstel, hercontrole, kosten en
            factuurtoewijzing.
          </p>
        </header>

        <ControleAfwijkingenBeheer
          woningId={woning.id}
          afwijkingen={afwijkingen}
        />
      </div>
    </main>
  );
}
