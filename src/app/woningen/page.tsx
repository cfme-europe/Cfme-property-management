import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Woning = {
  id: number;
  adres: string;
  postcode: string;
  plaats: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function WoningenPage() {
  const { data, error } = await supabase
    .from("woningen")
    .select("id, adres, postcode, plaats")
    .order("created_at", { ascending: false });

  const woningen: Woning[] = data ?? [];

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Woningen
            </h1>

            <p className="mt-2 text-slate-600">
              Overzicht van alle woningen.
            </p>
          </div>

          <Link
            href="/woningen/nieuw"
            className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
          >
            Nieuwe woning
          </Link>
        </div>

      
        {error && (
          <div className="mb-6 rounded-xl bg-red-100 p-4 text-red-800">
            Fout bij ophalen van woningen: {error.message}
          </div>
        )}

        <div className="overflow-hidden rounded-xl bg-white shadow">
          <table className="w-full">
            <thead className="border-b bg-slate-200 text-slate-900">
              <tr>
                <th className="p-4 text-left">Adres</th>
                <th className="p-4 text-left">Postcode</th>
                <th className="p-4 text-left">Plaats</th>
              </tr>
            </thead>

            <tbody className="text-slate-900">
              {woningen.map((woning) => (
                <tr
  key={woning.id}
  className="border-b border-slate-200 hover:bg-slate-50"
>
  <td className="p-4">
    <Link
      href={`/woningen/${woning.id}`}
      className="font-medium text-emerald-700 hover:underline"
    >
      {woning.adres}
    </Link>
  </td>
  <td className="p-4">{woning.postcode}</td>
  <td className="p-4">{woning.plaats}</td>
</tr>
              ))}

              {!error && woningen.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-600">
                    Nog geen woningen gevonden.
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