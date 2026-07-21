import Link from "next/link";
import { notFound } from "next/navigation";
import {
  documentArchiveren,
  documentVersieToevoegen,
} from "../actions";
import {
  getDocumentById,
  getDocumentVersies,
} from "@/services/documenten";
import { getWoningById } from "@/services/woningen-server";

type Props = {
  params: Promise<{
    id: string;
    documentId: string;
  }>;
};

function bestandsgrootte(
  bytes: number
): string {
  return new Intl.NumberFormat("nl-NL", {
    maximumFractionDigits: 1,
  }).format(bytes / 1024 / 1024) + " MB";
}

export default async function DocumentPage({
  params,
}: Props) {
  const { id, documentId } = await params;
  const woningId = Number(id);
  const documentNummer = Number(documentId);

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0 ||
    !Number.isInteger(documentNummer) ||
    documentNummer <= 0
  ) {
    notFound();
  }

  const [woning, document, versies] =
    await Promise.all([
      getWoningById(woningId),
      getDocumentById(documentNummer),
      getDocumentVersies(documentNummer),
    ]);

  if (
    !woning ||
    !document ||
    document.woning_id !== woningId
  ) {
    notFound();
  }

  const versieActie =
    documentVersieToevoegen.bind(
      null,
      document.id,
      woningId
    );

  const archiefActie =
    documentArchiveren.bind(
      null,
      document.id,
      woningId
    );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/woningen/${woningId}`}
          className="font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar woning
        </Link>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Documentbeheer
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                {document.titel}
              </h1>
              <p className="mt-2 text-slate-600">
                {woning.adres}, {woning.postcode}{" "}
                {woning.plaats}
              </p>
            </div>

            <span className={`rounded-full px-4 py-2 text-sm font-semibold ${
              document.status === "actief"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-200 text-slate-700"
            }`}>
              {document.status === "actief"
                ? "Actief"
                : "Gearchiveerd"}
            </span>
          </div>

          {document.omschrijving && (
            <p className="mt-6 rounded-xl bg-slate-100 p-4">
              {document.omschrijving}
            </p>
          )}

          <section className="mt-8">
            <h2 className="text-xl font-bold">
              Versiehistorie
            </h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="border-b bg-slate-100">
                  <tr>
                    <th className="p-4 text-left">
                      Versie
                    </th>
                    <th className="p-4 text-left">
                      Bestand
                    </th>
                    <th className="p-4 text-left">
                      Grootte
                    </th>
                    <th className="p-4 text-left">
                      Datum
                    </th>
                    <th className="p-4 text-left">
                      Actie
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {versies.map((versie) => (
                    <tr
                      key={versie.id}
                      className="border-b last:border-0"
                    >
                      <td className="p-4 font-semibold">
                        {versie.versienummer}
                      </td>
                      <td className="p-4">
                        <p>{versie.bestandsnaam}</p>
                        {versie.versie_opmerking && (
                          <p className="mt-1 text-sm text-slate-500">
                            {versie.versie_opmerking}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        {bestandsgrootte(
                          versie.bestandsgrootte
                        )}
                      </td>
                      <td className="p-4">
                        {new Intl.DateTimeFormat(
                          "nl-NL"
                        ).format(
                          new Date(versie.created_at)
                        )}
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/woningen/${woningId}/documenten/${document.id}/download?versie=${versie.id}`}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          Downloaden
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {document.status === "actief" && (
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <form
                action={versieActie}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <h2 className="text-lg font-bold">
                  Nieuwe versie
                </h2>

                <input
                  required
                  type="file"
                  name="bestand"
                  accept=".pdf,.docx,.xlsx,image/jpeg,image/png,image/webp,image/heic,image/heif"
                  className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3"
                />

                <textarea
                  name="versie_opmerking"
                  rows={3}
                  placeholder="Toelichting bij deze versie"
                  className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3"
                />

                <button className="mt-4 rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white">
                  Versie toevoegen
                </button>
              </form>

              <form
                action={archiefActie}
                className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
              >
                <h2 className="text-lg font-bold">
                  Document archiveren
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Alle versies en bestanden blijven behouden.
                </p>

                <textarea
                  name="archiefreden"
                  rows={3}
                  placeholder="Reden van archivering"
                  className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3"
                />

                <button className="mt-4 rounded-xl bg-amber-700 px-5 py-3 font-medium text-white">
                  Archiveren
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
