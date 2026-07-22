import Link from "next/link";
import { notFound } from "next/navigation";
import BewonerVerwijderenButton from "@/components/bewoners/BewonerVerwijderenButton";
import BewonerVerhuizenButton from "@/components/bewoners/BewonerVerhuizenButton";
import {
  getBewonerById,
  getBewonerKamerHistorie,
} from "@/services/bewoners-server";
import { getKamersVoorWoning } from "@/services/kamers-server";
import { getWoningById } from "@/services/woningen-server";

export const dynamic = "force-dynamic";

function datum(waarde: string | null): string {
  if (!waarde) return "—";

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${waarde}T00:00:00`));
}

export default async function BewonerDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
    bewonerId: string;
  }>;
}) {
  const { id, bewonerId } = await params;
  const woningId = Number(id);
  const bewonerNummer = Number(bewonerId);

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0 ||
    !Number.isInteger(bewonerNummer) ||
    bewonerNummer <= 0
  ) {
    notFound();
  }

  const [woning, bewoner, kamers, kamerHistorie] = await Promise.all([
  getWoningById(woningId),
  getBewonerById(bewonerNummer),
  getKamersVoorWoning(woningId),
  getBewonerKamerHistorie(bewonerNummer),
]);

  if (!woning || !bewoner) {
    notFound();
  }

  const naam = [
    bewoner.voornaam,
    bewoner.tussenvoegsel,
    bewoner.achternaam,
  ]
    .filter(Boolean)
    .join(" ");

  const gekoppeldeHuurder = bewoner.huurder
    ? [
        bewoner.huurder.voornaam,
        bewoner.huurder.tussenvoegsel,
        bewoner.huurder.achternaam,
      ]
        .filter(Boolean)
        .join(" ")
    : "Niet gekoppeld";

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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Bewonersdossier
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                {naam}
              </h1>

              <p className="mt-2 text-slate-600">
                {woning.adres}, {woning.postcode}{" "}
                {woning.plaats}
              </p>
            </div>

            <Link
              href={`/woningen/${woning.id}/bewoners/${bewoner.id}/bewerken`}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
            >
              Bewerken
            </Link>
          </div>

          <dl className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">
                Status
              </dt>
              <dd className="mt-1 font-semibold">
                {bewoner.status}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Kamer
              </dt>
              <dd className="mt-1 font-semibold">
                {bewoner.kamer?.naam ||
                  "Niet toegewezen"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Incheckdatum
              </dt>
              <dd className="mt-1 font-semibold">
                {datum(bewoner.incheckdatum)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Uitcheckdatum
              </dt>
              <dd className="mt-1 font-semibold">
                {datum(bewoner.uitcheckdatum)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Gekoppelde huurder
              </dt>
              <dd className="mt-1 font-semibold">
                {gekoppeldeHuurder}
              </dd>
            </div>
          </dl>
          <div className="mt-8">
            <p className="text-sm text-slate-500">
              Opmerkingen
            </p>

            <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-100 p-5">
              {bewoner.opmerkingen ||
                "Geen opmerkingen."}
            </p>
          </div>

          <section className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="text-lg font-bold">
          Kamerhistorie
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Historisch overzicht van kamerwissels binnen deze woning.
        </p>

        {kamerHistorie.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
            Voor deze bewoner zijn nog geen kamerwissels geregistreerd.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {kamerHistorie.map((historie) => (
              <article
                key={historie.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <p className="font-semibold">
                  {historie.oude_kamer_naam}
                  {" → "}
                  {historie.nieuwe_kamer_naam}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Verhuisdatum: {datum(historie.verhuisdatum)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-6">
            <BewonerVerhuizenButton
              bewonerId={bewoner.id}
              verhuurperiodeId={bewoner.verhuurperiode_id}
              huidigeKamerId={bewoner.kamer_id}
              kamers={kamers}
              naam={naam}
            />

            <BewonerVerwijderenButton
              woningId={woning.id}
              bewonerId={bewoner.id}
              verhuurperiodeId={bewoner.verhuurperiode_id}
              naam={naam}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
