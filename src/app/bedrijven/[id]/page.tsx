import Link from "next/link";
import { notFound } from "next/navigation";
import BedrijfStatusButton from "@/components/bedrijven/BedrijfStatusButton";
import { getBedrijfById } from "@/services/bedrijven";
import { getVerhuurperiodesVoorBedrijf } from "@/services/verhuurperiodes";

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

  const [bedrijf, verhuurperiodes] = await Promise.all([
    getBedrijfById(bedrijfId),
    getVerhuurperiodesVoorBedrijf(bedrijfId),
  ]);

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

        <section className="mb-8 rounded-2xl bg-white p-6 shadow">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Woningen en verhuurperiodes</h2>
              <p className="mt-1 text-slate-600">
                {verhuurperiodes.length} gekoppelde verhuurperiode
                {verhuurperiodes.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {verhuurperiodes.length === 0 ? (
            <p className="rounded-xl bg-slate-100 p-5 text-slate-600">
              Er zijn nog geen woningen aan dit bedrijf gekoppeld.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="border-b bg-slate-100">
                  <tr>
                    <th className="p-4 text-left">Woning</th>
                    <th className="p-4 text-left">Periode</th>
                    <th className="p-4 text-left">Maandhuur</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-right">Actie</th>
                  </tr>
                </thead>

                <tbody>
                  {verhuurperiodes.map((periode) => (
                    <tr
                      key={periode.id}
                      className="border-b border-slate-200 last:border-0"
                    >
                      <td className="p-4">
                        <p className="font-medium">
                          {periode.woning?.adres ?? "Onbekende woning"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {[periode.woning?.postcode, periode.woning?.plaats]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </p>
                      </td>

                      <td className="p-4">
                        {periode.startdatum}
                        {" – "}
                        {periode.werkelijke_einddatum ??
                          periode.geplande_einddatum ??
                          "heden"}
                      </td>

                      <td className="p-4">
                        € {Number(periode.maandhuur).toFixed(2)}
                      </td>

                      <td className="p-4">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                          {periode.status}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        {periode.woning ? (
                          <Link
                            href={`/woningen/${periode.woning.id}`}
                            className="font-medium text-emerald-700 hover:underline"
                          >
                            Woning openen
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

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
