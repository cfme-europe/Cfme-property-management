import Link from "next/link";
import { getBedrijven } from "@/services/bedrijven";

export const dynamic = "force-dynamic";

export default async function BedrijvenPage() {
  const bedrijven = await getBedrijven();

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bedrijven</h1>
            <p className="mt-2 text-slate-600">
              Overzicht van alle klanten.
            </p>
          </div>

          <Link
            href="/bedrijven/nieuw"
            className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
          >
            Nieuw bedrijf
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow">
          <table className="w-full">
            <thead className="border-b bg-slate-200">
              <tr>
                <th className="p-4 text-left">Naam</th>
                <th className="p-4 text-left">Contactpersoon</th>
                <th className="p-4 text-left">Plaats</th>
                <th className="p-4 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {bedrijven.map((bedrijf) => (
                <tr
                  key={bedrijf.id}
                  className="border-b border-slate-200 last:border-0"
                >
                  <td className="p-4">
                    <Link
                      href={`/bedrijven/${bedrijf.id}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {bedrijf.naam}
                    </Link>
                  </td>
                  <td className="p-4">
                    {bedrijf.contactpersoon ?? "—"}
                  </td>
                  <td className="p-4">{bedrijf.plaats ?? "—"}</td>
                  <td className="p-4">
                    {bedrijf.actief ? "Actief" : "Inactief"}
                  </td>
                </tr>
              ))}

              {bedrijven.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center text-slate-500"
                  >
                    Nog geen bedrijven gevonden.
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
