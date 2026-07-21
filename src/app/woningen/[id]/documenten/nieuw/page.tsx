import Link from "next/link";
import { notFound } from "next/navigation";
import { documentAanmaken } from "../actions";
import { getWoningById } from "@/services/woningen-server";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function NieuwDocumentPage({
  params,
}: Props) {
  const { id } = await params;
  const woningId = Number(id);

  if (!Number.isInteger(woningId) || woningId <= 0) {
    notFound();
  }

  const woning = await getWoningById(woningId);

  if (!woning) {
    notFound();
  }

  const actie = documentAanmaken.bind(
    null,
    woningId
  );

  const invoerClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/woningen/${woningId}`}
          className="font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar woning
        </Link>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Documentbeheer
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Nieuw document
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.adres}, {woning.postcode}{" "}
            {woning.plaats}
          </p>

          <form
            action={actie}
            className="mt-8 space-y-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-1 block font-medium">
                  Titel *
                </span>
                <input
                  required
                  name="titel"
                  className={invoerClass}
                />
              </label>

              <label>
                <span className="mb-1 block font-medium">
                  Documenttype *
                </span>
                <select
                  required
                  name="document_type"
                  defaultValue="overig"
                  className={invoerClass}
                >
                  <option value="contract">Contract</option>
                  <option value="certificering">Certificering</option>
                  <option value="keuring">Keuring</option>
                  <option value="inspectie">Inspectie</option>
                  <option value="verzekering">Verzekering</option>
                  <option value="factuur">Factuur</option>
                  <option value="rapportage">Rapportage</option>
                  <option value="handleiding">Handleiding</option>
                  <option value="identificatie">Identificatie</option>
                  <option value="overig">Overig</option>
                </select>
              </label>

              <label>
                <span className="mb-1 block font-medium">
                  Vertrouwelijkheid *
                </span>
                <select
                  required
                  name="vertrouwelijkheid"
                  defaultValue="intern"
                  className={invoerClass}
                >
                  <option value="intern">Intern</option>
                  <option value="vertrouwelijk">
                    Vertrouwelijk
                  </option>
                  <option value="extern_geschikt">
                    Extern geschikt
                  </option>
                </select>
              </label>

              <label>
                <span className="mb-1 block font-medium">
                  Bestand *
                </span>
                <input
                  required
                  type="file"
                  name="bestand"
                  accept=".pdf,.docx,.xlsx,image/jpeg,image/png,image/webp,image/heic,image/heif"
                  className={invoerClass}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block font-medium">
                Omschrijving
              </span>
              <textarea
                name="omschrijving"
                rows={4}
                className={invoerClass}
              />
            </label>

            <label className="block">
              <span className="mb-1 block font-medium">
                Opmerking bij versie 1
              </span>
              <textarea
                name="versie_opmerking"
                rows={3}
                className={invoerClass}
              />
            </label>

            <button
              type="submit"
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
            >
              Document opslaan
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
