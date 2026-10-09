import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import InspectieFotoUpload from "@/components/inspecties/InspectieFotoUpload";
import InspectieVerwijderenButton from "@/components/inspecties/InspectieVerwijderenButton";
import { getInspectieFotos } from "@/services/inspectiefotos-server";
import { getInspectieById } from "@/services/inspecties-server";
import { getWoningById } from "@/services/woningen-server";
import { getLaatsteControlesessieVoorInspectie } from "@/services/controlesessies-server";
import { getControlebewijsVoorInspectie } from "@/services/controlebewijs-server";
import ControlesessieBeheer from "@/components/controlesessies/ControlesessieBeheer";
import type {
  AlgemeneToestand,
  InspectieStatus,
  InspectieType,
} from "@/types/inspectie";

export const dynamic = "force-dynamic";

function datum(waarde: string | null): string {
  if (!waarde) return "—";

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${waarde}T00:00:00`));
}

function datumTijd(waarde: string | null): string {
  if (!waarde) return "—";

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(waarde));
}

function typeLabel(type: InspectieType): string {
  const labels: Record<InspectieType, string> = {
    begininspectie: "Begininspectie",
    periodiek: "Periodieke inspectie",
    eindinspectie: "Eindinspectie",
    incident: "Incidentinspectie",
  };

  return labels[type];
}

function statusLabel(status: InspectieStatus): string {
  return status === "afgerond" ? "Afgerond" : "Open";
}

function toestandLabel(
  toestand: AlgemeneToestand
): string {
  const labels: Record<AlgemeneToestand, string> = {
    goed: "Goed",
    aandacht_nodig: "Aandacht nodig",
    slecht: "Slecht",
  };

  return labels[toestand];
}

function waardeLabel(waarde: string): string {
  return waarde
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

const fotoTypeLabels = {
  situatie: "Situatie",
  voor_herstel: "Voor herstel",
  na_herstel: "Na herstel",
  herstelbewijs: "Herstelbewijs",
};

export default async function InspectieDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
    inspectieId: string;
  }>;
}) {
  const { id, inspectieId } = await params;
  const woningId = Number(id);
  const inspectieNummer = Number(inspectieId);

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0 ||
    !Number.isInteger(inspectieNummer) ||
    inspectieNummer <= 0
  ) {
    notFound();
  }

  const [
    woning,
    inspectie,
    fotos,
    controlesessie,
    controlebewijs,
  ] = await Promise.all([
    getWoningById(woningId),
    getInspectieById(inspectieNummer),
    getInspectieFotos(inspectieNummer),
    getLaatsteControlesessieVoorInspectie(
      inspectieNummer
    ),
    getControlebewijsVoorInspectie(inspectieNummer),
  ]);

  if (
    !woning ||
    !inspectie ||
    inspectie.woning_id !== woningId
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/woningen/${woning.id}`}
          className="mb-6 inline-block font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar woning
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Inspectiedossier
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                {typeLabel(inspectie.type)}
              </h1>

              <p className="mt-2 text-slate-600">
                {woning.adres}, {woning.postcode}{" "}
                {woning.plaats}
              </p>
            </div>

            <Link
              href={`/woningen/${woning.id}/inspecties/${inspectie.id}/bewerken`}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
            >
              Bewerken
            </Link>
          </div>

          <dl className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm text-slate-500">
                Inspectiedatum
              </dt>
              <dd className="mt-1 font-semibold">
                {datum(inspectie.inspectiedatum)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Status
              </dt>
              <dd className="mt-1">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    inspectie.status === "afgerond"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {statusLabel(inspectie.status)}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Algemene toestand
              </dt>
              <dd className="mt-1 font-semibold">
                {toestandLabel(
                  inspectie.algemene_toestand
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Orde en netheid
              </dt>
              <dd className="mt-1 font-semibold">
                {inspectie.orde_netheid_score} van 5
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Uitgevoerd door
              </dt>
              <dd className="mt-1 font-semibold">
                {inspectie.uitgevoerd_door || "—"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Afgerond op
              </dt>
              <dd className="mt-1 font-semibold">
                {datumTijd(inspectie.afgerond_at)}
              </dd>
            </div>
          </dl>

          <section className="mt-8">
            <h2 className="text-xl font-bold">
              Schade
            </h2>

            {inspectie.schade_aanwezig ? (
              <div className="mt-4 rounded-xl bg-red-50 p-5 text-red-900">
                <p className="font-semibold">
                  Schade aangetroffen
                </p>
                <p className="mt-2 whitespace-pre-wrap">
                  {inspectie.schade_omschrijving}
                </p>
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-emerald-50 p-5 text-emerald-900">
                Geen schade aangetroffen.
              </p>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold">
              Opmerkingen
            </h2>

            <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-100 p-5">
              {inspectie.opmerkingen ||
                "Geen opmerkingen."}
            </p>
          </section>

          <section className="mt-8">
            <div>
              <h2 className="text-xl font-bold">
                Controlebewijs per punt
              </h2>
              <p className="mt-1 text-slate-600">
                Beoordelingen, opmerkingen, afwijkingen en reparaties die tijdens de controle zijn vastgelegd.
              </p>
            </div>

            {controlebewijs.length === 0 ? (
              <p className="mt-4 rounded-xl bg-slate-100 p-5 text-slate-600">
                Voor deze inspectie zijn geen controlepunten vastgelegd.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {controlebewijs.map((bewijs) => {
                  const bewijsFotos = fotos.filter(
                    (foto) => foto.controle_resultaat_id === bewijs.id,
                  );

                  return (
                    <article
                      key={bewijs.id}
                      className="rounded-xl border border-slate-200 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-emerald-700">
                            {bewijs.ruimte_naam_snapshot}
                            {bewijs.object_naam_snapshot
                              ? ` / ${bewijs.object_naam_snapshot}`
                              : ""}
                          </p>
                          <h3 className="mt-1 font-bold">
                            {bewijs.controlepunt_naam_snapshot}
                          </h3>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
                          {waardeLabel(bewijs.resultaat)}
                        </span>
                      </div>

                      {bewijs.numerieke_waarde !== null && (
                        <p className="mt-3 text-sm">
                          Vastgelegde waarde: <strong>{bewijs.numerieke_waarde}</strong>
                        </p>
                      )}

                      {bewijs.opmerkingen && (
                        <div className="mt-3 rounded-lg bg-blue-50 p-4">
                          <p className="text-sm font-semibold text-blue-900">Opmerking controleur</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-blue-950">
                            {bewijs.opmerkingen}
                          </p>
                        </div>
                      )}

                      {bewijs.afwijking && bewijs.afwijking.status !== "niet_relevant" && (
                        <div className={`mt-3 rounded-lg p-4 ${
                          bewijs.afwijking.ter_plaatse_hersteld
                            ? "bg-emerald-50 text-emerald-950"
                            : "bg-amber-50 text-amber-950"
                        }`}>
                          <p className="font-semibold">
                            {bewijs.afwijking.ter_plaatse_hersteld
                              ? "Ter plaatse hersteld"
                              : `Afwijking — ${waardeLabel(bewijs.afwijking.status)}`}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm">
                            {bewijs.afwijking.toelichting}
                          </p>
                          {bewijs.afwijking.oplossing && (
                            <p className="mt-2 text-sm">
                              <strong>Reparatie:</strong> {bewijs.afwijking.oplossing}
                            </p>
                          )}
                          {bewijs.afwijking.gebruikte_materialen && (
                            <p className="mt-1 text-sm">
                              <strong>Materialen:</strong> {bewijs.afwijking.gebruikte_materialen}
                            </p>
                          )}
                          {(bewijs.afwijking.arbeid_minuten !== null || bewijs.afwijking.werkelijke_kosten !== null) && (
                            <p className="mt-1 text-sm">
                              {bewijs.afwijking.arbeid_minuten !== null
                                ? `${bewijs.afwijking.arbeid_minuten} minuten arbeid`
                                : ""}
                              {bewijs.afwijking.arbeid_minuten !== null && bewijs.afwijking.werkelijke_kosten !== null
                                ? " · "
                                : ""}
                              {bewijs.afwijking.werkelijke_kosten !== null
                                ? new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(bewijs.afwijking.werkelijke_kosten)
                                : ""}
                            </p>
                          )}
                        </div>
                      )}

                      {bewijsFotos.length > 0 && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          {bewijsFotos.map((foto) => (
                            <div key={foto.id} className="overflow-hidden rounded-lg border border-slate-200">
                              {foto.tijdelijke_url && (
                                <div className="relative aspect-[4/3] bg-slate-100">
                                  <Image
                                    src={foto.tijdelijke_url}
                                    alt={foto.omschrijving || foto.bestandsnaam}
                                    fill
                                    unoptimized
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <p className="p-2 text-xs font-semibold">
                                {fotoTypeLabels[foto.foto_type ?? "situatie"]}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <ControlesessieBeheer
            woningId={woning.id}
            inspectieId={inspectie.id}
            controlesessie={controlesessie}
          />

          <section className="mt-8">
            <div className="mb-4">
              <h2 className="text-xl font-bold">
                Foto&apos;s
              </h2>

              <p className="mt-1 text-slate-600">
                Fotobewijs en visuele vastlegging van de inspectie.
              </p>
            </div>

            <InspectieFotoUpload
              inspectieId={inspectie.id}
            />

            {fotos.length === 0 ? (
              <p className="mt-5 rounded-xl bg-slate-100 p-5 text-slate-600">
                Nog geen foto&apos;s toegevoegd.
              </p>
            ) : (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {fotos.map((foto) => (
                  <article
                    key={foto.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    {foto.tijdelijke_url ? (
                      <div className="relative aspect-[4/3] bg-slate-100">
                        <Image
                          src={foto.tijdelijke_url}
                          alt={
                            foto.omschrijving ||
                            foto.bestandsnaam
                          }
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 p-4 text-center text-sm text-slate-500">
                        Voorbeeld niet beschikbaar
                      </div>
                    )}

                    <div className="p-4">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">
                        {fotoTypeLabels[foto.foto_type ?? "situatie"]}
                      </span>
                      <p className="break-all text-sm font-semibold">
                        {foto.bestandsnaam}
                      </p>

                      <p className="mt-2 text-sm text-slate-600">
                        {foto.omschrijving ||
                          "Geen omschrijving."}
                      </p>

                      <p className="mt-3 text-xs text-slate-500">
                        {new Intl.NumberFormat("nl-NL", {
                          maximumFractionDigits: 1,
                        }).format(
                          foto.bestandsgrootte /
                            (1024 * 1024)
                        )}{" "}
                        MB
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <InspectieVerwijderenButton
              woningId={woning.id}
              inspectieId={inspectie.id}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
