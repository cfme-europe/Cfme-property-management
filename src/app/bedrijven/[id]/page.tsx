import Link from "next/link";
import { notFound } from "next/navigation";
import BedrijfStatusButton from "@/components/bedrijven/BedrijfStatusButton";
import { getBedrijfById } from "@/services/bedrijven";

export const dynamic = "force-dynamic";

export default async function BedrijfDossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bedrijfId = Number(id);

  if (!Number.isInteger(bedrijfId) || bedrijfId <= 0) {
    notFound();
  }

  const bedrijf = await getBedrijfById(bedrijfId);

  if (!bedrijf) {
    notFound();
  }

  const waarde = (tekst: string | null) => tekst?.trim() || "—";

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/bedrijven"
            className="font-medium text-emerald-700 hover:underline"
          >
            ← Terug naar bedrijven
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                bedrijf.actief
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {bedrijf.actief ? "Actief" : "Inactief"}
            </span>

            <Link
              href={`/bedrijven/${bedrijf.id}/bewerken`}
              className="rounded-xl border border-slate-300 px-5 py-3 font-medium"
            >
              Bewerken
            </Link>

            <BedrijfStatusButton
              bedrijfId={bedrijf.id}
              actief={bedrijf.actief}
            />
          </div>
        </div>

        <header className="mb-8 rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Bedrijfsdossier
          </p>
          <h1 className="mt-2 text-3xl font-bold">{bedrijf.naam}</h1>
          <p className="mt-2 text-slate-600">
            Klantnummer: {waarde(bedrijf.klantnummer)}
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-5 text-xl font-bold">Bedrijfsgegevens</h2>

            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-slate-500">KvK-nummer</dt>
                <dd className="font-medium">{waarde(bedrijf.kvk_nummer)}</dd>
              </div>

              <div>
                <dt className="text-sm text-slate-500">Btw-nummer</dt>
                <dd className="font-medium">{waarde(bedrijf.btw_nummer)}</dd>
              </div>

              <div>
                <dt className="text-sm text-slate-500">Klantnummer</dt>
                <dd className="font-medium">{waarde(bedrijf.klantnummer)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-5 text-xl font-bold">Contact</h2>

            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-slate-500">Contactpersoon</dt>
                <dd className="font-medium">
                  {waarde(bedrijf.contactpersoon)}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-slate-500">Telefoon</dt>
                <dd className="font-medium">{waarde(bedrijf.telefoon)}</dd>
              </div>

              <div>
                <dt className="text-sm text-slate-500">E-mail</dt>
                <dd className="font-medium">{waarde(bedrijf.email)}</dd>
              </div>

              <div>
                <dt className="text-sm text-slate-500">Factuur-e-mail</dt>
                <dd className="font-medium">
                  {waarde(bedrijf.factuur_email)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-5 text-xl font-bold">Factuuradres</h2>

            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-slate-500">Adres</dt>
                <dd className="font-medium">
                  {waarde(bedrijf.factuuradres)}
                </dd>
              </div>

              <div>
                <dt className="text-sm text-slate-500">Postcode en plaats</dt>
                <dd className="font-medium">
                  {[bedrijf.postcode, bedrijf.plaats]
                    .filter(Boolean)
                    .join(" ") || "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-5 text-xl font-bold">Opmerkingen</h2>
            <p className="whitespace-pre-wrap text-slate-700">
              {waarde(bedrijf.opmerkingen)}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
