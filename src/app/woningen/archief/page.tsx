import Link from "next/link";
import { getWoningen } from "@/services/woningen-server";

export const dynamic = "force-dynamic";

function datum(waarde: string | null): string {
  if (!waarde) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(waarde));
}

export default async function WoningarchiefPage() {
  const woningen = await getWoningen("gearchiveerd");

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7">
          <Link href="/woningen" className="font-medium text-emerald-700 hover:underline">
            ← Terug naar actieve woningen
          </Link>
          <h1 className="mt-4 text-3xl font-bold">Woningarchief</h1>
          <p className="mt-2 text-slate-600">
            Volledige, bewaarde dossiers van woningen die niet meer operationeel worden gebruikt.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full min-w-[900px]">
            <thead className="border-b bg-slate-200">
              <tr>
                <th className="p-4 text-left">Woning</th>
                <th className="p-4 text-left">Gearchiveerd</th>
                <th className="p-4 text-left">Door</th>
                <th className="p-4 text-left">Reden</th>
                <th className="p-4 text-right">Actie</th>
              </tr>
            </thead>
            <tbody>
              {woningen.map((woning) => (
                <tr key={woning.id} className="border-b border-slate-200 last:border-0">
                  <td className="p-4">
                    <p className="font-semibold">{woning.dossiernummer} · {woning.adres}</p>
                    <p className="text-sm text-slate-500">{woning.postcode} {woning.plaats}</p>
                  </td>
                  <td className="p-4">{datum(woning.gearchiveerd_op)}</td>
                  <td className="p-4">{woning.gearchiveerd_door_naam ?? "—"}</td>
                  <td className="max-w-md p-4">{woning.archiefreden ?? "—"}</td>
                  <td className="p-4 text-right">
                    <Link href={`/woningen/${woning.id}`} className="font-medium text-emerald-700 hover:underline">
                      Dossier openen
                    </Link>
                  </td>
                </tr>
              ))}
              {woningen.length === 0 && (
                <tr><td colSpan={5} className="p-10 text-center text-slate-600">Het woningarchief is leeg.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
