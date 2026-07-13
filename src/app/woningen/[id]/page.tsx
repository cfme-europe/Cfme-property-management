import Link from "next/link";
import { notFound } from "next/navigation";
import { getWoningById } from "@/services/woningen";
import {
  getActieveVerhuurperiodeVoorWoning,
  getVerhuurhistorieVoorWoning,
} from "@/services/verhuurperiodes";

export const dynamic = "force-dynamic";

function datum(waarde: string | null): string {
  if (!waarde) return "—";

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${waarde}T00:00:00`));
}

function bedrag(waarde: number | null): string {
  if (waarde === null) return "—";

  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(Number(waarde));
}

export default async function WoningDossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const woningId = Number(id);

  if (!Number.isInteger(woningId) || woningId <= 0) {
    notFound();
  }

  const [woning, actieveVerhuur, verhuurhistorie] = await Promise.all([
    getWoningById(woningId),
    getActieveVerhuurperiodeVoorWoning(woningId),
    getVerhuurhistorieVoorWoning(woningId),
  ]);

  if (!woning) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/woningen"
            className="font-medium text-emerald-700 hover:underline"
          >
            ← Terug naar woningen
          </Link>

          {actieveVerhuur ? (
            <Link
              href={`/woningen/${woning.id}/verhuur/beeindigen`}
              className="rounded-xl bg-red-700 px-5 py-3 font-medium text-white"
            >
              Verhuurperiode beëindigen
            </Link>
          ) : (
            <Link
              href={`/woningen/${woning.id}/verhuur/nieuw`}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
            >
              Verhuurperiode starten
            </Link>
          )}
        </div>

        <header className="mb-8 rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Woningdossier
          </p>

          <h1 className="mt-2 text-3xl font-bold">{woning.adres}</h1>

          <p className="mt-2 text-slate-600">
            {woning.postcode} {woning.plaats}
          </p>
        </header>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Actieve verhuur</h2>
              <p className="mt-1 text-slate-600">
                Huidige huurder en contractgegevens.
              </p>
            </div>

            {actieveVerhuur && (
              <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
                Actief
              </span>
            )}
          </div>

          {!actieveVerhuur ? (
            <div className="rounded-xl bg-slate-100 p-5">
              <p className="font-medium">Geen actieve verhuurperiode.</p>
              <p className="mt-1 text-slate-600">
                Deze woning is momenteel niet aan een bedrijf gekoppeld.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-slate-500">Bedrijf</p>
                {actieveVerhuur.bedrijf ? (
                  <Link
                    href={`/bedrijven/${actieveVerhuur.bedrijf.id}`}
                    className="mt-1 block font-semibold text-emerald-700 hover:underline"
                  >
                    {actieveVerhuur.bedrijf.naam}
                  </Link>
                ) : (
                  <p className="mt-1 font-semibold">—</p>
                )}
              </div>

              <div>
                <p className="text-sm text-slate-500">Startdatum</p>
                <p className="mt-1 font-semibold">
                  {datum(actieveVerhuur.startdatum)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Geplande einddatum
                </p>
                <p className="mt-1 font-semibold">
                  {datum(actieveVerhuur.geplande_einddatum)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Maandhuur</p>
                <p className="mt-1 font-semibold">
                  {bedrag(actieveVerhuur.maandhuur)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Borg</p>
                <p className="mt-1 font-semibold">
                  {bedrag(actieveVerhuur.borg)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Facturatiedag
                </p>
                <p className="mt-1 font-semibold">
                  Dag {actieveVerhuur.facturatie_dag}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Referentie</p>
                <p className="mt-1 font-semibold">
                  {actieveVerhuur.referentie || "—"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Inspecties</p>
                <p className="mt-1 font-semibold">
                  Begin:{" "}
                  {actieveVerhuur.begininspectie_verplicht
                    ? "verplicht"
                    : "niet verplicht"}
                </p>
                <p className="text-sm">
                  Eind:{" "}
                  {actieveVerhuur.eindinspectie_verplicht
                    ? "verplicht"
                    : "niet verplicht"}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-5">
            <h2 className="text-xl font-bold">Verhuurhistorie</h2>
            <p className="mt-1 text-slate-600">
              Alle verhuurperiodes van deze woning.
            </p>
          </div>

          {verhuurhistorie.length === 0 ? (
            <p className="rounded-xl bg-slate-100 p-5 text-slate-600">
              Nog geen verhuurhistorie beschikbaar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead className="border-b bg-slate-100">
                  <tr>
                    <th className="p-4 text-left">Bedrijf</th>
                    <th className="p-4 text-left">Startdatum</th>
                    <th className="p-4 text-left">Opzegdatum</th>
                    <th className="p-4 text-left">Werkelijke einddatum</th>
                    <th className="p-4 text-left">Opleverdatum</th>
                    <th className="p-4 text-left">Maandhuur</th>
                    <th className="p-4 text-left">Referentie</th>
                    <th className="p-4 text-left">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {verhuurhistorie.map((periode) => (
                    <tr
                      key={periode.id}
                      className="border-b border-slate-200 last:border-0"
                    >
                      <td className="p-4">
                        {periode.bedrijf ? (
                          <Link
                            href={`/bedrijven/${periode.bedrijf.id}`}
                            className="font-medium text-emerald-700 hover:underline"
                          >
                            {periode.bedrijf.naam}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="p-4">
                        {datum(periode.startdatum)}
                      </td>

                      <td className="p-4">
                        {datum(periode.opzegdatum)}
                      </td>

                      <td className="p-4">
                        {datum(periode.werkelijke_einddatum)}
                      </td>

                      <td className="p-4">
                        {datum(periode.opleverdatum)}
                      </td>

                      <td className="p-4">
                        {bedrag(periode.maandhuur)}
                      </td>

                      <td className="p-4">
                        {periode.referentie || "—"}
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-semibold ${
                            periode.status === "actief"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {periode.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
