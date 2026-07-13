import Link from "next/link";
import { notFound } from "next/navigation";
import HuurderVerwijderenButton from "@/components/huurders/HuurderVerwijderenButton";
import { getHuurderById } from "@/services/huurders";
import { getWoningById } from "@/services/woningen";

export const dynamic = "force-dynamic";

function datum(waarde: string | null): string {
  if (!waarde) return "—";

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${waarde}T00:00:00`));
}

function naam(
  voornaam: string,
  tussenvoegsel: string | null,
  achternaam: string
): string {
  return [voornaam, tussenvoegsel, achternaam]
    .filter(Boolean)
    .join(" ");
}

export default async function HuurderDetailPage({
  params,
}: {
  params: Promise<{ id: string; huurderId: string }>;
}) {
  const { id, huurderId } = await params;
  const woningId = Number(id);
  const huurderNummer = Number(huurderId);

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0 ||
    !Number.isInteger(huurderNummer) ||
    huurderNummer <= 0
  ) {
    notFound();
  }

  const [woning, huurder] = await Promise.all([
    getWoningById(woningId),
    getHuurderById(huurderNummer),
  ]);

  if (!woning || !huurder) {
    notFound();
  }

  const volledigeNaam = naam(
    huurder.voornaam,
    huurder.tussenvoegsel,
    huurder.achternaam
  );

  const gegevens = [
    ["Geboortedatum", datum(huurder.geboortedatum)],
    ["Nationaliteit", huurder.nationaliteit || "—"],
    ["Telefoon", huurder.telefoon || "—"],
    ["E-mail", huurder.email || "—"],
    ["Documenttype", huurder.document_type || "—"],
    ["Documentnummer", huurder.documentnummer || "—"],
  ];

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
                Huurderdossier
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                {volledigeNaam}
              </h1>
              <p className="mt-2 text-slate-600">
                {woning.adres}, {woning.postcode} {woning.plaats}
              </p>
            </div>

            <Link
              href={`/woningen/${woning.id}/huurders/${huurder.id}/bewerken`}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
            >
              Bewerken
            </Link>
          </div>

          <dl className="mt-8 grid gap-6 md:grid-cols-2">
            {gegevens.map(([label, waarde]) => (
              <div key={label}>
                <dt className="text-sm text-slate-500">{label}</dt>
                <dd className="mt-1 font-semibold">{waarde}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8">
            <p className="text-sm text-slate-500">Opmerkingen</p>
            <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-100 p-5">
              {huurder.opmerkingen || "Geen opmerkingen."}
            </p>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <HuurderVerwijderenButton
              woningId={woning.id}
              huurderId={huurder.id}
              verhuurperiodeId={huurder.verhuurperiode_id}
              naam={volledigeNaam}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
