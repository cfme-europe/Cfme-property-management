import Link from "next/link";
import { notFound } from "next/navigation";
import WoningconfiguratieBeheer from "@/components/woningconfiguratie/WoningconfiguratieBeheer";
import { getWoningConfiguratie } from "@/services/woningconfiguratie-server";

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    ruimte?: string;
  }>;
};

export default async function ControlepuntenBeheerPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const woningId = Number(id);

  if (!Number.isInteger(woningId) || woningId <= 0) {
    notFound();
  }

  const configuratie =
    await getWoningConfiguratie(woningId);

  const zoek = await searchParams;
  const gevraagdRuimteId = Number(zoek.ruimte);

  const ruimteFilterId =
    Number.isInteger(gevraagdRuimteId) &&
    configuratie.ruimten.some(
      (ruimte) => ruimte.id === gevraagdRuimteId,
    )
      ? gevraagdRuimteId
      : null;

  const geselecteerdeRuimte =
    ruimteFilterId === null
      ? null
      : configuratie.ruimten.find(
          (ruimte) => ruimte.id === ruimteFilterId,
        ) ?? null;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/woningen/${woningId}/configuratie`}
          className="font-semibold text-emerald-700 hover:underline"
        >
          ← Terug naar woningconfiguratie
        </Link>

        <section className="mt-6 rounded-3xl bg-slate-950 p-6 text-white md:p-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">
            Woningconfiguratie
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {geselecteerdeRuimte
              ? `Controlepunten — ${geselecteerdeRuimte.naam}`
              : "Alle controlepunten"}
          </h1>

          <p className="mt-3 text-slate-300">
            {geselecteerdeRuimte
              ? "Beheer uitsluitend de controlepunten van deze ruimte."
              : "Kies of bewerk controlepunten voor de volledige woning."}
          </p>
        </section>

        <div className="mt-6">
          <WoningconfiguratieBeheer
            woningId={woningId}
            configuratie={configuratie}
            alleenControlepunten
            ruimteFilterId={ruimteFilterId}
          />
        </div>
      </div>
    </main>
  );
}
