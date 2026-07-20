import Link from "next/link";
import { notFound } from "next/navigation";
import { getWoningById } from "@/services/woningen-server";
import {
  getActieveVerhuurperiodeVoorWoning,
  getVerhuurhistorieVoorWoning,
} from "@/services/verhuurperiodes";
import { getHuurdersVoorVerhuurperiode } from "@/services/huurders";
import { getKamersVoorWoning } from "@/services/kamers";
import { getBewonersVoorVerhuurperiode } from "@/services/bewoners";
import { getInspectiesVoorWoning } from "@/services/inspecties";
import { getMeldingenVoorWoning } from "@/services/meldingen";
import { getTakenVoorWoning } from "@/services/taken";
import type {
  TaakPrioriteit,
  TaakStatus,
} from "@/types/taak";
import EnergieVerbruikGrafieken from "@/components/energie/EnergieVerbruikGrafieken";
import EnergieVerbruikOverzicht from "@/components/energie/EnergieVerbruikOverzicht";
import { getMeterstandenVoorWoning } from "@/services/meterstanden";
import { getCertificeringenVoorWoning } from "@/services/certificeringen";
import type {
  CertificeringStatus,
  CertificeringType,
} from "@/types/certificering";
import { getMaandrapportagesVoorWoning } from "@/services/maandrapportages";
import { getLaatsteWoningDnaVoorWoning } from "@/services/intelligence";
import { getActieveControlebriefingVoorWoning } from "@/services/intelligence-server";
import WoningDnaOverzicht from "@/components/intelligence/WoningDnaOverzicht";
import ControlebriefingOverzicht from "@/components/intelligence/ControlebriefingOverzicht";
import WoningPlanningOverzicht from "@/components/planning/WoningPlanningOverzicht";
import WoningQrCode from "@/components/woningen/WoningQrCode";
import { getActieveWoningplanning } from "@/services/planning";

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

  const [
    huurders,
    kamers,
    bewoners,
    inspecties,
    meldingen,
    taken,
    meterstanden,
    certificeringen,
    maandrapportages,
    woningDna,
    controlebriefing,
    woningplanning,
  ] = await Promise.all([
    actieveVerhuur
      ? getHuurdersVoorVerhuurperiode(actieveVerhuur.id)
      : Promise.resolve([]),
    getKamersVoorWoning(woningId),
    actieveVerhuur
      ? getBewonersVoorVerhuurperiode(actieveVerhuur.id)
      : Promise.resolve([]),
    getInspectiesVoorWoning(woningId),
    getMeldingenVoorWoning(woningId),
    getTakenVoorWoning(woningId),
    getMeterstandenVoorWoning(woningId),
    getCertificeringenVoorWoning(woningId),
    getMaandrapportagesVoorWoning(woningId),
    getLaatsteWoningDnaVoorWoning(woningId),
    getActieveControlebriefingVoorWoning(woningId),
    getActieveWoningplanning(woningId),
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

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/woningen/${woning.id}/inspecties/nieuw`}
              className="rounded-xl border border-emerald-700 px-5 py-3 font-medium text-emerald-700"
            >
              Nieuwe inspectie
            </Link>

            <Link
              href={`/woningen/${woning.id}/meldingen/nieuw`}
              className="rounded-xl border border-amber-700 px-5 py-3 font-medium text-amber-800"
            >
              Nieuwe melding
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

        <WoningPlanningOverzicht
          woningId={woning.id}
          planning={woningplanning}
        />

        <WoningQrCode
          woningId={woning.id}
          adres={woning.adres}
          postcode={woning.postcode}
          plaats={woning.plaats}
        />

        <WoningDnaOverzicht snapshot={woningDna} />

        <ControlebriefingOverzicht
          gegevens={controlebriefing}
        />

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

        <section className="mb-8 rounded-2xl bg-white p-6 shadow">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                Maandrapportages
              </h2>
              <p className="mt-1 text-slate-600">
                Rapportages voor inspecties, meldingen,
                bewoners en energieverbruik.
              </p>
            </div>

            <Link
              href={`/woningen/${woning.id}/rapportages/nieuw`}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
            >
              Nieuwe rapportage
            </Link>
          </div>

          {maandrapportages.length === 0 ? (
            <p className="rounded-xl bg-slate-100 p-5 text-slate-600">
              Nog geen maandrapportages aangemaakt.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="border-b bg-slate-100">
                  <tr>
                    <th className="p-4 text-left">
                      Periode
                    </th>
                    <th className="p-4 text-left">
                      Titel
                    </th>
                    <th className="p-4 text-left">
                      Ontvanger
                    </th>
                    <th className="p-4 text-left">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {maandrapportages.map(
                    (rapportage) => {
                      const maandNaam =
                        new Intl.DateTimeFormat(
                          "nl-NL",
                          { month: "long" }
                        ).format(
                          new Date(
                            rapportage.rapportjaar,
                            rapportage.rapportmaand - 1,
                            1
                          )
                        );

                      const statusLabels = {
                        concept: "Concept",
                        definitief: "Definitief",
                        verzonden: "Verzonden",
                      };

                      return (
                        <tr
                          key={rapportage.id}
                          className="border-b border-slate-200 last:border-0"
                        >
                          <td className="p-4 capitalize">
                            {maandNaam}{" "}
                            {rapportage.rapportjaar}
                          </td>

                          <td className="p-4">
                            <Link
                              href={`/woningen/${woning.id}/rapportages/${rapportage.id}`}
                              className="font-semibold text-emerald-700 hover:underline"
                            >
                              {rapportage.titel}
                            </Link>
                          </td>

                          <td className="p-4">
                            {rapportage.ontvanger_naam ||
                              "—"}
                          </td>

                          <td className="p-4">
                            <span
                              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                                rapportage.status ===
                                "verzonden"
                                  ? "bg-blue-100 text-blue-800"
                                  : rapportage.status ===
                                      "definitief"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {
                                statusLabels[
                                  rapportage.status
                                ]
                              }
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                Certificeringen
              </h2>
              <p className="mt-1 text-slate-600">
                Geldigheid, waarschuwingen en volledige keuringshistorie.
              </p>
            </div>

            <Link
              href={`/woningen/${woning.id}/certificeringen/nieuw`}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
            >
              Nieuwe certificering
            </Link>
          </div>

          {certificeringen.length === 0 ? (
            <p className="rounded-xl bg-slate-100 p-5 text-slate-600">
              Nog geen certificeringen geregistreerd.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px]">
                <thead className="border-b bg-slate-100">
                  <tr>
                    <th className="p-4 text-left">Type</th>
                    <th className="p-4 text-left">Naam</th>
                    <th className="p-4 text-left">Keuringsdatum</th>
                    <th className="p-4 text-left">Geldig tot</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-left">Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {certificeringen.map((certificering) => {
                    const typeLabels: Record<
                      CertificeringType,
                      string
                    > = {
                      scope: "Scope",
                      brandblusser: "Brandblusser",
                      cv: "CV",
                      rookmelder: "Rookmelder",
                      overig: "Overige keuring",
                    };

                    const statusLabels: Record<
                      CertificeringStatus,
                      string
                    > = {
                      geldig: "Geldig",
                      verloopt_binnenkort:
                        "Verloopt binnenkort",
                      verlopen: "Verlopen",
                      ingetrokken: "Ingetrokken",
                    };

                    const statusClass: Record<
                      CertificeringStatus,
                      string
                    > = {
                      geldig:
                        "bg-emerald-100 text-emerald-800",
                      verloopt_binnenkort:
                        "bg-amber-100 text-amber-800",
                      verlopen:
                        "bg-red-100 text-red-800",
                      ingetrokken:
                        "bg-slate-200 text-slate-700",
                    };

                    return (
                      <tr
                        key={certificering.id}
                        className="border-b last:border-b-0"
                      >
                        <td className="p-4">
                          {typeLabels[certificering.type]}
                        </td>
                        <td className="p-4">
                          <p className="font-medium">
                            {certificering.naam}
                          </p>
                          {certificering.installatie_omschrijving && (
                            <p className="mt-1 text-sm text-slate-500">
                              {
                                certificering.installatie_omschrijving
                              }
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          {new Intl.DateTimeFormat(
                            "nl-NL"
                          ).format(
                            new Date(
                              `${certificering.keuringsdatum}T00:00:00`
                            )
                          )}
                        </td>
                        <td className="p-4">
                          {new Intl.DateTimeFormat(
                            "nl-NL"
                          ).format(
                            new Date(
                              `${certificering.geldig_tot}T00:00:00`
                            )
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                              statusClass[
                                certificering.compliance_status
                              ]
                            }`}
                          >
                            {
                              statusLabels[
                                certificering.compliance_status
                              ]
                            }
                          </span>
                        </td>
                        <td className="p-4">
                          <Link
                            href={`/woningen/${woning.id}/certificeringen/${certificering.id}/bewerken`}
                            className="font-medium text-emerald-700 hover:underline"
                          >
                            Bewerken
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                Meterstanden
              </h2>
              <p className="mt-1 text-slate-600">
                Historie van elektriciteit, gas en water.
              </p>
            </div>

            <Link
              href={`/woningen/${woning.id}/meterstanden/nieuw`}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
            >
              Nieuwe meteropname
            </Link>
          </div>

          {meterstanden.length === 0 ? (
            <p className="rounded-xl bg-slate-100 p-5 text-slate-600">
              Nog geen meterstanden geregistreerd.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="border-b bg-slate-100">
                  <tr>
                    <th className="p-4 text-left">
                      Datum
                    </th>
                    <th className="p-4 text-left">
                      Bewoners
                    </th>
                    <th className="p-4 text-left">
                      Elektriciteit
                    </th>
                    <th className="p-4 text-left">
                      Gas
                    </th>
                    <th className="p-4 text-left">
                      Water
                    </th>
                    <th className="p-4 text-left">
                      Opgenomen door
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {meterstanden.map((meterstand) => (
                    <tr
                      key={meterstand.id}
                      className="border-b border-slate-200 last:border-0"
                    >
                      <td className="p-4">
                        <Link
                          href={`/woningen/${woning.id}/meterstanden/${meterstand.id}`}
                          className="font-semibold text-emerald-700 hover:underline"
                        >
                          {datum(meterstand.opnamedatum)}
                        </Link>
                      </td>

                      <td className="p-4">
                        {meterstand.bewoners_aantal}
                      </td>

                      <td className="p-4">
                        {meterstand.elektriciteit_kwh ===
                        null
                          ? "—"
                          : `${new Intl.NumberFormat(
                              "nl-NL",
                              {
                                maximumFractionDigits: 3,
                              }
                            ).format(
                              meterstand.elektriciteit_kwh
                            )} kWh`}
                      </td>

                      <td className="p-4">
                        {meterstand.gas_m3 === null
                          ? "—"
                          : `${new Intl.NumberFormat(
                              "nl-NL",
                              {
                                maximumFractionDigits: 3,
                              }
                            ).format(
                              meterstand.gas_m3
                            )} m³`}
                      </td>

                      <td className="p-4">
                        {meterstand.water_m3 === null
                          ? "—"
                          : `${new Intl.NumberFormat(
                              "nl-NL",
                              {
                                maximumFractionDigits: 3,
                              }
                            ).format(
                              meterstand.water_m3
                            )} m³`}
                      </td>

                      <td className="p-4">
                        {meterstand.opgenomen_door ||
                          "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow">
          <div className="mb-5">
            <h2 className="text-xl font-bold">
              Energieverbruik
            </h2>
            <p className="mt-1 text-slate-600">
              Verbruik tussen opeenvolgende meteropnames,
              omgerekend per bewoner per week.
            </p>
          </div>

          <EnergieVerbruikOverzicht
            meterstanden={meterstanden}
          />

          <div className="mt-8 border-t border-slate-200 pt-8">
            <h3 className="text-lg font-bold">
              Verbruiksgrafieken en afwijkingen
            </h3>

            <p className="mt-1 text-slate-600">
              Vergelijking van het verbruik per bewoner per
              week met eerdere meetperiodes.
            </p>

            <div className="mt-5">
              <EnergieVerbruikGrafieken
                meterstanden={meterstanden}
              />
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Taken</h2>
              <p className="mt-1 text-slate-600">
                Openstaande acties, deadlines en afgeronde opvolging.
              </p>
            </div>

            <Link
              href={`/woningen/${woning.id}/taken/nieuw`}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
            >
              Nieuwe taak
            </Link>
          </div>

          {taken.length === 0 ? (
            <p className="rounded-xl bg-slate-100 p-5 text-slate-600">
              Nog geen taken geregistreerd.
            </p>
          ) : (
            <>
              <div className="mb-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">
                    Openstaand
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {
                      taken.filter((taak) =>
                        ["open", "in_behandeling"].includes(
                          taak.status
                        )
                      ).length
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-red-50 p-4">
                  <p className="text-sm text-red-700">
                    Over deadline
                  </p>
                  <p className="mt-1 text-2xl font-bold text-red-900">
                    {
                      taken.filter(
                        (taak) =>
                          ["open", "in_behandeling"].includes(
                            taak.status
                          ) &&
                          taak.deadline !== null &&
                          taak.deadline <
                            new Date()
                              .toISOString()
                              .slice(0, 10)
                      ).length
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-700">
                    Afgerond
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-900">
                    {
                      taken.filter(
                        (taak) => taak.status === "afgerond"
                      ).length
                    }
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px]">
                  <thead className="border-b bg-slate-100">
                    <tr>
                      <th className="p-4 text-left">Taak</th>
                      <th className="p-4 text-left">Prioriteit</th>
                      <th className="p-4 text-left">Deadline</th>
                      <th className="p-4 text-left">Toegewezen</th>
                      <th className="p-4 text-left">Status</th>
                      <th className="p-4 text-left">Actie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taken.map((taak) => {
                      const statusLabels: Record<
                        TaakStatus,
                        string
                      > = {
                        open: "Open",
                        in_behandeling: "In behandeling",
                        afgerond: "Afgerond",
                        geannuleerd: "Geannuleerd",
                      };

                      const prioriteitLabels: Record<
                        TaakPrioriteit,
                        string
                      > = {
                        laag: "Laag",
                        normaal: "Normaal",
                        hoog: "Hoog",
                        spoed: "Spoed",
                      };

                      const statusClass: Record<
                        TaakStatus,
                        string
                      > = {
                        open: "bg-amber-100 text-amber-800",
                        in_behandeling:
                          "bg-blue-100 text-blue-800",
                        afgerond:
                          "bg-emerald-100 text-emerald-800",
                        geannuleerd:
                          "bg-slate-200 text-slate-700",
                      };

                      return (
                        <tr
                          key={taak.id}
                          className="border-b last:border-b-0"
                        >
                          <td className="p-4">
                            <p className="font-medium">
                              {taak.titel}
                            </p>
                            {taak.omschrijving && (
                              <p className="mt-1 max-w-md text-sm text-slate-500">
                                {taak.omschrijving}
                              </p>
                            )}
                          </td>
                          <td className="p-4">
                            {prioriteitLabels[taak.prioriteit]}
                          </td>
                          <td className="p-4">
                            {datum(taak.deadline)}
                          </td>
                          <td className="p-4">
                            {taak.toegewezen_aan ?? "—"}
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                                statusClass[taak.status]
                              }`}
                            >
                              {statusLabels[taak.status]}
                            </span>
                          </td>
                          <td className="p-4">
                            <Link
                              href={`/woningen/${woning.id}/taken/${taak.id}/bewerken`}
                              className="font-medium text-emerald-700 hover:underline"
                            >
                              Bewerken
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Meldingen</h2>
              <p className="mt-1 text-slate-600">
                Schades, onderhoud en overige opvolgpunten.
              </p>
            </div>

            <Link
              href={`/woningen/${woning.id}/meldingen/nieuw`}
              className="rounded-xl bg-amber-700 px-5 py-3 font-medium text-white"
            >
              Nieuwe melding
            </Link>
          </div>

          {meldingen.length === 0 ? (
            <p className="rounded-xl bg-slate-100 p-5 text-slate-600">
              Nog geen meldingen geregistreerd.
            </p>
          ) : (
            <>
              <div className="mb-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">
                    Totaal
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {meldingen.length}
                  </p>
                </div>

                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-sm text-amber-700">
                    Openstaand
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-900">
                    {
                      meldingen.filter(
                        (melding) =>
                          melding.status !== "opgelost"
                      ).length
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-red-50 p-4">
                  <p className="text-sm text-red-700">
                    Hoog of spoed
                  </p>
                  <p className="mt-1 text-2xl font-bold text-red-900">
                    {
                      meldingen.filter(
                        (melding) =>
                          melding.status !== "opgelost" &&
                          (
                            melding.prioriteit === "hoog" ||
                            melding.prioriteit === "spoed"
                          )
                      ).length
                    }
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px]">
                  <thead className="border-b bg-slate-100">
                    <tr>
                      <th className="p-4 text-left">
                        Datum
                      </th>
                      <th className="p-4 text-left">
                        Melding
                      </th>
                      <th className="p-4 text-left">
                        Categorie
                      </th>
                      <th className="p-4 text-left">
                        Prioriteit
                      </th>
                      <th className="p-4 text-left">
                        Verantwoordelijke
                      </th>
                      <th className="p-4 text-left">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {meldingen.map((melding) => {
                      const categorieLabels = {
                        schade: "Schade",
                        onderhoud: "Onderhoud",
                        veiligheid: "Veiligheid",
                        schoonmaak: "Schoonmaak",
                        installatie: "Installatie",
                        overig: "Overig",
                      };

                      const prioriteitLabels = {
                        laag: "Laag",
                        normaal: "Normaal",
                        hoog: "Hoog",
                        spoed: "Spoed",
                      };

                      const statusLabels = {
                        open: "Open",
                        in_behandeling:
                          "In behandeling",
                        opgelost: "Opgelost",
                      };

                      return (
                        <tr
                          key={melding.id}
                          className="border-b border-slate-200 last:border-0"
                        >
                          <td className="p-4">
                            {datum(melding.melddatum)}
                          </td>

                          <td className="p-4">
                            <Link
                              href={`/woningen/${woning.id}/meldingen/${melding.id}`}
                              className="font-semibold text-amber-800 hover:underline"
                            >
                              {melding.titel}
                            </Link>
                          </td>

                          <td className="p-4">
                            {
                              categorieLabels[
                                melding.categorie
                              ]
                            }
                          </td>

                          <td className="p-4">
                            {
                              prioriteitLabels[
                                melding.prioriteit
                              ]
                            }
                          </td>

                          <td className="p-4">
                            {melding.verantwoordelijke ||
                              "—"}
                          </td>

                          <td className="p-4">
                            <span
                              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                                melding.status ===
                                "opgelost"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : melding.status ===
                                      "in_behandeling"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {
                                statusLabels[
                                  melding.status
                                ]
                              }
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Inspecties</h2>
              <p className="mt-1 text-slate-600">
                Inspectiehistorie en openstaande controles.
              </p>
            </div>

            <Link
              href={`/woningen/${woning.id}/inspecties/nieuw`}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
            >
              Nieuwe inspectie
            </Link>
          </div>

          {inspecties.length === 0 ? (
            <p className="rounded-xl bg-slate-100 p-5 text-slate-600">
              Nog geen inspecties geregistreerd.
            </p>
          ) : (
            <>
              <div className="mb-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">
                    Totaal
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {inspecties.length}
                  </p>
                </div>

                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-sm text-amber-700">
                    Open
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-900">
                    {
                      inspecties.filter(
                        (inspectie) =>
                          inspectie.status === "open"
                      ).length
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-red-50 p-4">
                  <p className="text-sm text-red-700">
                    Met schade
                  </p>
                  <p className="mt-1 text-2xl font-bold text-red-900">
                    {
                      inspecties.filter(
                        (inspectie) =>
                          inspectie.schade_aanwezig
                      ).length
                    }
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px]">
                  <thead className="border-b bg-slate-100">
                    <tr>
                      <th className="p-4 text-left">
                        Datum
                      </th>
                      <th className="p-4 text-left">
                        Type
                      </th>
                      <th className="p-4 text-left">
                        Toestand
                      </th>
                      <th className="p-4 text-left">
                        Orde en netheid
                      </th>
                      <th className="p-4 text-left">
                        Schade
                      </th>
                      <th className="p-4 text-left">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {inspecties.map((inspectie) => {
                      const typeLabels = {
                        begininspectie:
                          "Begininspectie",
                        periodiek:
                          "Periodiek",
                        eindinspectie:
                          "Eindinspectie",
                        incident:
                          "Incident",
                      };

                      const toestandLabels = {
                        goed: "Goed",
                        aandacht_nodig:
                          "Aandacht nodig",
                        slecht: "Slecht",
                      };

                      return (
                        <tr
                          key={inspectie.id}
                          className="border-b border-slate-200 last:border-0"
                        >
                          <td className="p-4">
                            <Link
                              href={`/woningen/${woning.id}/inspecties/${inspectie.id}`}
                              className="font-semibold text-emerald-700 hover:underline"
                            >
                              {datum(
                                inspectie.inspectiedatum
                              )}
                            </Link>
                          </td>

                          <td className="p-4">
                            {
                              typeLabels[
                                inspectie.type
                              ]
                            }
                          </td>

                          <td className="p-4">
                            {
                              toestandLabels[
                                inspectie
                                  .algemene_toestand
                              ]
                            }
                          </td>

                          <td className="p-4">
                            {
                              inspectie
                                .orde_netheid_score
                            }{" "}
                            van 5
                          </td>

                          <td className="p-4">
                            {inspectie.schade_aanwezig
                              ? "Ja"
                              : "Nee"}
                          </td>

                          <td className="p-4">
                            <span
                              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                                inspectie.status ===
                                "afgerond"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {inspectie.status ===
                              "afgerond"
                                ? "Afgerond"
                                : "Open"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Kamers</h2>
              <p className="mt-1 text-slate-600">
                Kamerindeling en geregistreerde capaciteit.
              </p>
            </div>

            <Link
              href={`/woningen/${woning.id}/kamers`}
              className="rounded-xl border border-emerald-700 px-5 py-3 font-medium text-emerald-700"
            >
              Kamers beheren
            </Link>
          </div>

          {kamers.length === 0 ? (
            <p className="rounded-xl bg-slate-100 p-5 text-slate-600">
              Nog geen kamers geregistreerd.
            </p>
          ) : (
            <>
              <div className="mb-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">
                    Totaal kamers
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {kamers.length}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">
                    Actieve kamers
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {kamers.filter((kamer) => kamer.actief).length}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-100 p-4">
                  <p className="text-sm text-slate-500">
                    Totale capaciteit
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {kamers
                      .filter((kamer) => kamer.actief)
                      .reduce(
                        (totaal, kamer) =>
                          totaal + kamer.capaciteit,
                        0
                      )}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {kamers.map((kamer) => (
                  <div
                    key={kamer.id}
                    className="rounded-xl border border-slate-200 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{kamer.naam}</p>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          kamer.actief
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {kamer.actief ? "Actief" : "Inactief"}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-slate-600">
                      Verdieping: {kamer.verdieping || "—"}
                    </p>

                    <p className="text-sm text-slate-600">
                      Capaciteit: {kamer.capaciteit}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Bewoners</h2>
              <p className="mt-1 text-slate-600">
                Bewoners en kamerbezetting binnen de actieve verhuurperiode.
              </p>
            </div>

            {actieveVerhuur && (
              <Link
                href={`/woningen/${woning.id}/bewoners/nieuw`}
                className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
              >
                Bewoner toevoegen
              </Link>
            )}
          </div>

          {!actieveVerhuur ? (
            <p className="rounded-xl bg-slate-100 p-5 text-slate-600">
              Start eerst een verhuurperiode om bewoners te registreren.
            </p>
          ) : bewoners.length === 0 ? (
            <p className="rounded-xl bg-slate-100 p-5 text-slate-600">
              Nog geen bewoners geregistreerd.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="border-b bg-slate-100">
                  <tr>
                    <th className="p-4 text-left">Bewoner</th>
                    <th className="p-4 text-left">Kamer</th>
                    <th className="p-4 text-left">Incheckdatum</th>
                    <th className="p-4 text-left">Uitcheckdatum</th>
                    <th className="p-4 text-left">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {bewoners.map((bewoner) => {
                    const bewonersnaam = [
                      bewoner.voornaam,
                      bewoner.tussenvoegsel,
                      bewoner.achternaam,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <tr
                        key={bewoner.id}
                        className="border-b border-slate-200 last:border-0"
                      >
                        <td className="p-4">
                          <Link
                            href={`/woningen/${woning.id}/bewoners/${bewoner.id}`}
                            className="font-semibold text-emerald-700 hover:underline"
                          >
                            {bewonersnaam}
                          </Link>
                        </td>

                        <td className="p-4">
                          {bewoner.kamer?.naam || "Niet toegewezen"}
                        </td>

                        <td className="p-4">
                          {datum(bewoner.incheckdatum)}
                        </td>

                        <td className="p-4">
                          {datum(bewoner.uitcheckdatum)}
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-semibold ${
                              bewoner.status === "actief"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {bewoner.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Huurders</h2>
              <p className="mt-1 text-slate-600">
                Bewoners binnen de actieve verhuurperiode.
              </p>
            </div>

            {actieveVerhuur && (
              <Link
                href={`/woningen/${woning.id}/huurders/nieuw`}
                className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
              >
                Huurder toevoegen
              </Link>
            )}
          </div>

          {!actieveVerhuur ? (
            <p className="rounded-xl bg-slate-100 p-5 text-slate-600">
              Start eerst een verhuurperiode om huurders te registreren.
            </p>
          ) : huurders.length === 0 ? (
            <p className="rounded-xl bg-slate-100 p-5 text-slate-600">
              Nog geen huurders geregistreerd.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {huurders.map((huurder) => {
                const volledigeNaam = [
                  huurder.voornaam,
                  huurder.tussenvoegsel,
                  huurder.achternaam,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <Link
                    key={huurder.id}
                    href={`/woningen/${woning.id}/huurders/${huurder.id}`}
                    className="rounded-xl border border-slate-200 p-5 transition hover:border-emerald-600 hover:shadow"
                  >
                    <p className="font-semibold">{volledigeNaam}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {huurder.telefoon || "Geen telefoonnummer"}
                    </p>
                    <p className="text-sm text-slate-600">
                      {huurder.email || "Geen e-mailadres"}
                    </p>
                  </Link>
                );
              })}
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
