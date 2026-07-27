import Link from "next/link";
import { notFound } from "next/navigation";
import { documentAanmaken } from "@/app/woningen/[id]/documenten/actions";
import {
  getComplianceObjectOpties,
  getComplianceWerkpuntenVoorWoning,
  getObjectComplianceVoorWoning,
  getWoningComplianceSamenvatting,
} from "@/services/compliance";
import type {
  ComplianceStatus,
} from "@/types/compliance";

type Props = {
  params: Promise<{ id: string }>;
};

const statusLabels: Record<ComplianceStatus, string> = {
  compliant: "Compliant",
  waarschuwing: "Waarschuwing",
  verlopen: "Verlopen",
  ontbreekt: "Ontbreekt",
  onvolledig: "Onvolledig",
  onbekend: "Onbekend",
};

const statusClasses: Record<ComplianceStatus, string> = {
  compliant:
    "bg-emerald-100 text-emerald-800",
  waarschuwing:
    "bg-amber-100 text-amber-800",
  verlopen:
    "bg-red-100 text-red-800",
  ontbreekt:
    "bg-red-100 text-red-800",
  onvolledig:
    "bg-orange-100 text-orange-800",
  onbekend:
    "bg-slate-100 text-slate-700",
};

export const dynamic = "force-dynamic";

export default async function CompliancePage({
  params,
}: Props) {
  const { id } = await params;
  const woningId = Number(id);

  if (!Number.isInteger(woningId) || woningId <= 0) {
    notFound();
  }

  const [
    regels,
    samenvatting,
    objecten,
    werkpunten,
  ] = await Promise.all([
    getObjectComplianceVoorWoning(woningId),
    getWoningComplianceSamenvatting(woningId),
    getComplianceObjectOpties(woningId),
    getComplianceWerkpuntenVoorWoning(woningId),
  ]);

  const documentAanmakenVoorWoning =
    documentAanmaken.bind(null, woningId);

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/woningen/${woningId}`}
            className="text-sm font-medium text-emerald-700"
          >
            ← Terug naar woning
          </Link>

          <h1 className="mt-2 text-3xl font-bold">
            Compliance Intelligence
          </h1>

          <p className="mt-1 text-slate-600">
            Verplichtingen, certificeringen en bewijs
            per object.
          </p>
        </div>

        <Link
          href={`/woningen/${woningId}/certificeringen/nieuw`}
          className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
        >
          Certificering toevoegen
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          [
            "Verplichtingen",
            samenvatting?.aantal_verplichtingen ?? 0,
          ],
          [
            "Compliant",
            samenvatting?.compliant ?? 0,
          ],
          [
            "Waarschuwingen",
            samenvatting?.waarschuwingen ?? 0,
          ],
          [
            "Verlopen",
            samenvatting?.verlopen ?? 0,
          ],
          [
            "Ontbrekend",
            samenvatting?.ontbrekend ?? 0,
          ],
        ].map(([label, waarde]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="text-sm text-slate-600">
              {label}
            </div>
            <div className="mt-1 text-3xl font-bold">
              {waarde}
            </div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-xl font-semibold">
            Objectverplichtingen
          </h2>
        </div>

        {regels.length === 0 ? (
          <div className="p-6 text-slate-600">
            Voor de aanwezige objecttypen zijn nog geen
            actieve complianceverplichtingen ingericht.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {regels.map((regel) => (
              <article
                key={`${regel.object_id}-${regel.verplichting_id}`}
                className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1.5fr_auto]"
              >
                <div>
                  <div className="text-sm text-slate-500">
                    {regel.ruimte_naam}
                  </div>
                  <div className="font-semibold">
                    {regel.object_naam}
                  </div>
                  <div className="text-sm text-slate-600">
                    {regel.object_type}
                    {regel.objectnummer
                      ? ` · ${regel.objectnummer}`
                      : ""}
                  </div>
                </div>

                <div>
                  <div className="font-medium">
                    {regel.verplichting_naam}
                  </div>
                  <div className="text-sm text-slate-600">
                    {regel.verplichting_type ===
                    "certificering"
                      ? `Certificering: ${regel.certificering_type}`
                      : `Document: ${regel.document_type}`}
                  </div>

                  {regel.geldig_tot && (
                    <div className="mt-1 text-sm text-slate-600">
                      Geldig tot {regel.geldig_tot}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      statusClasses[
                        regel.compliance_status
                      ]
                    }`}
                  >
                    {
                      statusLabels[
                        regel.compliance_status
                      ]
                    }
                  </span>

                  {regel.verplichting_type ===
                  "certificering" ? (
                    <Link
                      href={`/woningen/${woningId}/certificeringen/nieuw?objectId=${regel.object_id}`}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium"
                    >
                      {regel.certificering_id
                        ? "Herkeuring registreren"
                        : "Certificering toevoegen"}
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-xl font-semibold">
            Open compliancewerkpunten
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Automatisch aangemaakte opvolging voor
            waarschuwingen, ontbrekende documenten en
            verlopen certificeringen.
          </p>
        </div>

        {werkpunten.length === 0 ? (
          <div className="p-6 text-slate-600">
            Er zijn geen open compliancewerkpunten.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {werkpunten.map((werkpunt) => (
              <article
                key={werkpunt.id}
                className="grid gap-4 p-5 lg:grid-cols-[1.4fr_1fr_auto]"
              >
                <div>
                  <div className="text-sm text-slate-500">
                    {werkpunt.ruimte_naam}
                  </div>
                  <div className="font-semibold">
                    {werkpunt.titel}
                  </div>
                  {werkpunt.omschrijving && (
                    <div className="mt-1 text-sm text-slate-600">
                      {werkpunt.omschrijving}
                    </div>
                  )}
                </div>

                <div className="text-sm text-slate-600">
                  <div>
                    Status:{" "}
                    <span className="font-medium">
                      {werkpunt.bron_status}
                    </span>
                  </div>
                  <div>
                    Prioriteit:{" "}
                    <span className="font-medium">
                      {werkpunt.prioriteit}
                    </span>
                  </div>
                  {werkpunt.deadline && (
                    <div>
                      Deadline:{" "}
                      <span className="font-medium">
                        {werkpunt.deadline}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center lg:justify-end">
                  {werkpunt.taak_id ? (
                    <Link
                      href={`/woningen/${woningId}/taken/${werkpunt.taak_id}/bewerken`}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium"
                    >
                      Taak openen
                    </Link>
                  ) : (
                    <span className="text-sm text-slate-500">
                      Taak wordt aangemaakt
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">
          Objectdocument toevoegen
        </h2>

        <form
          action={documentAanmakenVoorWoning}
          className="mt-5 grid gap-4 md:grid-cols-2"
        >
          <label>
            <span className="mb-1 block text-sm font-medium">
              Object *
            </span>
            <select
              name="object_id"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">
                Selecteer een object
              </option>
              {objecten.map((object) => (
                <option
                  key={object.id}
                  value={object.id}
                >
                  {object.ruimte_naam} — {object.naam}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Documenttype *
            </span>
            <select
              name="document_type"
              required
              defaultValue="keuring"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="certificering">
                Certificering
              </option>
              <option value="keuring">Keuring</option>
              <option value="handleiding">
                Handleiding
              </option>
              <option value="inspectie">
                Inspectie
              </option>
              <option value="overig">Overig</option>
            </select>
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Titel *
            </span>
            <input
              name="titel"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Vertrouwelijkheid *
            </span>
            <select
              name="vertrouwelijkheid"
              defaultValue="intern"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
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

          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium">
              Omschrijving
            </span>
            <textarea
              name="omschrijving"
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium">
              Bestand *
            </span>
            <input
              name="bestand"
              type="file"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium">
              Versie-opmerking
            </span>
            <input
              name="versie_opmerking"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
            >
              Document uploaden
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
