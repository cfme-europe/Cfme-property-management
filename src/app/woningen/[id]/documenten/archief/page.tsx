import Link from "next/link";
import { notFound } from "next/navigation";
import { getDocumentArchiefVoorWoning } from "@/services/documenten";
import { getWoningById } from "@/services/woningen-server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DocumentArchiefPage({
  params,
}: Props) {
  const { id } = await params;
  const woningId = Number(id);

  if (!Number.isInteger(woningId) || woningId <= 0) {
    notFound();
  }

  const [woning, documenten] = await Promise.all([
    getWoningById(woningId),
    getDocumentArchiefVoorWoning(woningId),
  ]);

  if (!woning) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/woningen/${woningId}`}
          className="font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar woning
        </Link>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Documentbeheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Documentarchief
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.adres}, {woning.postcode} {woning.plaats}
          </p>

          {documenten.length === 0 ? (
            <p className="mt-8 rounded-xl bg-slate-100 p-5 text-slate-600">
              Het documentarchief is leeg.
            </p>
          ) : (
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="border-b bg-slate-100">
                  <tr>
                    <th className="p-4 text-left">Titel</th>
                    <th className="p-4 text-left">Type</th>
                    <th className="p-4 text-left">Versies</th>
                    <th className="p-4 text-left">Archiefdatum</th>
                    <th className="p-4 text-left">Actie</th>
                  </tr>
                </thead>

                <tbody>
                  {documenten.map((document) => (
                    <tr
                      key={document.id}
                      className="border-b last:border-0"
                    >
                      <td className="p-4">
                        <p className="font-semibold">
                          {document.titel}
                        </p>
                        {document.archiefreden && (
                          <p className="mt-1 text-sm text-slate-500">
                            {document.archiefreden}
                          </p>
                        )}
                      </td>

                      <td className="p-4 capitalize">
                        {document.document_type.replaceAll("_", " ")}
                      </td>

                      <td className="p-4">
                        {document.aantal_versies}
                      </td>

                      <td className="p-4">
                        {document.gearchiveerd_op
                          ? new Intl.DateTimeFormat("nl-NL").format(
                              new Date(document.gearchiveerd_op)
                            )
                          : "—"}
                      </td>

                      <td className="p-4">
                        <Link
                          href={`/woningen/${woningId}/documenten/${document.id}`}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          Openen
                        </Link>
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
