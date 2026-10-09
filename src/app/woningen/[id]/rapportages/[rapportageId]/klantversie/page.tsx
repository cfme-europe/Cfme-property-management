import Link from "next/link";
import { notFound } from "next/navigation";
import KlantwaardeMaandrapportage from "@/components/rapportages/KlantwaardeMaandrapportage";
import { leesKlantversieOnderdelen } from "@/lib/rapportages/klantversie-onderdelen";
import { getMaandrapportageById } from "@/services/maandrapportages-server";
import { getWoningById } from "@/services/woningen-server";

export const dynamic = "force-dynamic";

export default async function KlantversieVoorbeeldPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; rapportageId: string }>;
  searchParams: Promise<{ onderdelen?: string }>;
}) {
  const { id, rapportageId } = await params;
  const woningId = Number(id);
  const rapportageNummer = Number(rapportageId);

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0 ||
    !Number.isInteger(rapportageNummer) ||
    rapportageNummer <= 0
  ) {
    notFound();
  }

  const [woning, rapportage, zoekparameters] = await Promise.all([
    getWoningById(woningId),
    getMaandrapportageById(rapportageNummer),
    searchParams,
  ]);
  const onderdelen = leesKlantversieOnderdelen(
    zoekparameters.onderdelen,
  );

  if (
    !woning ||
    !rapportage ||
    rapportage.woning_id !== woningId ||
    onderdelen.size === 0
  ) {
    notFound();
  }

  const query = new URLSearchParams({
    variant: "klantwaarde",
    onderdelen: [...onderdelen].join(","),
  }).toString();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={`/woningen/${woning.id}/rapportages/${rapportage.id}`}
            className="font-medium text-emerald-700 hover:underline"
          >
            ← Terug naar rapportage
          </Link>
          <a
            href={`/woningen/${woning.id}/rapportages/${rapportage.id}/pdf?${query}`}
            className="rounded-xl bg-slate-950 px-5 py-3 font-medium text-white"
          >
            Deze klantversie downloaden
          </a>
        </div>

        <KlantwaardeMaandrapportage
          rapportage={rapportage}
          onderdelen={onderdelen}
        />
      </div>
    </main>
  );
}
