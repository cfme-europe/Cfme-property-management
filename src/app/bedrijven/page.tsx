import Link from "next/link";
import { getBedrijven } from "@/services/bedrijven";

export const dynamic = "force-dynamic";

export default async function BedrijvenPage({
  searchParams,
}: {
  searchParams: Promise<{ zoeken?: string; status?: string }>;
}) {
  const parameters = await searchParams;
  const zoekterm = (parameters.zoeken ?? "").trim().toLowerCase();
  const status = parameters.status ?? "actief";

  const alleBedrijven = await getBedrijven();

  const bedrijven = alleBedrijven.filter((bedrijf) => {
    const pastBijZoeken =
      zoekterm === "" ||
      bedrijf.naam.toLowerCase().includes(zoekterm) ||
      bedrijf.contactpersoon?.toLowerCase().includes(zoekterm) ||
      bedrijf.plaats?.toLowerCase().includes(zoekterm) ||
      bedrijf.klantnummer?.toLowerCase().includes(zoekterm);

    const pastBijStatus =
      status === "alle" ||
      (status === "actief" && bedrijf.actief) ||
      (status === "gearchiveerd" && !bedrijf.actief);

    return pastBijZoeken && pastBijStatus;
  });

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Bedrijven</h1>
            <p className="mt-2 text-slate-600">
              Klanten, contactgegevens en status.
            </p>
          </div>

          <Link
            href="/bedrijven/nieuw"
            className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
          >
            Nieuw bedrijf
          </Link>
        </div>

        <form className="mb-6 grid gap-3 rounded-2xl bg-white p-5 shadow md:grid-cols-[1fr_220px_auto]">
          <input
            name="zoeken"
            defaultValue={parameters.zoeken ?? ""}
            placeholder="Zoek op naam, contactpersoon, plaats of klantnummer"
            className="rounded-xl border border-slate-300 px-4 py-3"
          />

          <select
            name="status"
            defaultValue={status}
            className="rounded-xl border border-slate-300 px-4 py-3"
          >
            <option value="actief">Actief</option>
            <option value="gearchiveerd">Gearchiveerd</option>
            <option value="alle">Alle bedrijven</option>
          </select>

          <button className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white">
            Filteren
          </button>
        </form>

        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="w-full min-w-[760px]">
            <thead className="border-b bg-slate-200">
              <tr>
                <th className="p-4 text-left">Naam</th>
                <th className="p-4 text-left">Klantnummer</th>
                <th className="p-4 text-left">Contactpersoon</th>
                <th className="p-4 text-left">Plaats</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-right">Acties</th>
              </tr>
            </thead>

            <tbody>
              {bedrijven.map((bedrijf) => (
                <tr
                  key={bedrijf.id}
                  className="border-b border-slate-200 last:border-0"
                >
                  <td className="p-4 font-medium">
                    {bedrijf.naam}
                  </td>
                  <td className="p-4">
                    {bedrijf.klantnummer ?? "—"}
                  </td>
                  <td className="p-4">
                    {bedrijf.contactpersoon ?? "—"}
                  </td>
                  <td className="p-4">
                    {bedrijf.plaats ?? "—"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        bedrijf.actief
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {bedrijf.actief ? "Actief" : "Gearchiveerd"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/bedrijven/${bedrijf.id}`}
                        className="font-medium text-emerald-700 hover:underline"
                      >
                        Openen
                      </Link>

                      <Link
                        href={`/bedrijven/${bedrijf.id}/bewerken`}
                        className="font-medium text-slate-700 hover:underline"
                      >
                        Bewerken
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {bedrijven.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-10 text-center text-slate-500"
                  >
                    Geen bedrijven gevonden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
