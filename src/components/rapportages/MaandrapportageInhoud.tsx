import {
  bouwZakelijkeRapportageModel,
  getal,
  tekst,
  type JsonObject,
} from "@/lib/rapportages/zakelijke-rapportage";
import type { Maandrapportage } from "@/types/maandrapportage";

type Props = {
  rapportage: Maandrapportage;
};

function datum(waarde: string): string {
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
    timeZone: "Europe/Amsterdam",
  }).format(new Date(waarde));
}

function bedrag(waarde: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(waarde);
}

function getalTekst(
  waarde: number | null,
  decimalen = 1,
): string {
  if (waarde === null) return "—";

  return new Intl.NumberFormat("nl-NL", {
    maximumFractionDigits: decimalen,
  }).format(waarde);
}

function verschilTekst(
  waarde: number | null,
): string {
  if (waarde === null) return "Geen referentie";

  return `${waarde >= 0 ? "+" : ""}${getalTekst(
    waarde,
  )}%`;
}

function risicoklasse(classificatie: string): string {
  if (classificatie === "kritiek") {
    return "bg-red-100 text-red-900";
  }

  if (classificatie === "hoog") {
    return "bg-orange-100 text-orange-900";
  }

  if (classificatie === "middel") {
    return "bg-amber-100 text-amber-900";
  }

  return "bg-emerald-100 text-emerald-900";
}

function signaalklasse(
  signalering: string,
): string {
  if (signalering === "kritiek") {
    return "bg-red-100 text-red-900";
  }

  if (signalering === "waarschuwing") {
    return "bg-amber-100 text-amber-900";
  }

  if (signalering === "normaal") {
    return "bg-emerald-100 text-emerald-900";
  }

  return "bg-slate-100 text-slate-700";
}

function RapportSectie({
  nummer,
  titel,
  omschrijving,
  children,
}: {
  nummer: string;
  titel: string;
  omschrijving?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white">
        <div className="flex items-start gap-4">
          <span className="rounded-lg bg-emerald-500 px-3 py-1 text-sm font-bold text-slate-950">
            {nummer}
          </span>
          <div>
            <h3 className="text-xl font-bold">
              {titel}
            </h3>
            {omschrijving && (
              <p className="mt-1 text-sm text-slate-300">
                {omschrijving}
              </p>
            )}
          </div>
        </div>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function MeldingRij({
  melding,
}: {
  melding: JsonObject;
}) {
  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-bold">
            {tekst(melding, "titel", "Melding")}
          </h4>
          <p className="mt-1 text-sm text-slate-600">
            {tekst(melding, "omschrijving")}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
          {tekst(melding, "status", "onbekend")}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs uppercase text-slate-500">
            Categorie
          </dt>
          <dd className="mt-1 font-medium">
            {tekst(melding, "categorie", "—")}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">
            Prioriteit
          </dt>
          <dd className="mt-1 font-medium">
            {tekst(melding, "prioriteit", "—")}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">
            Melddatum
          </dt>
          <dd className="mt-1 font-medium">
            {datum(tekst(melding, "melddatum"))}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">
            Factuur
          </dt>
          <dd className="mt-1 font-medium">
            {tekst(
              melding,
              "factuur_naar",
              "Nog te bepalen",
            ).replaceAll("_", " ")}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export default function MaandrapportageInhoud({
  rapportage,
}: Props) {
  const data = rapportage.rapport_data;
  const model = bouwZakelijkeRapportageModel(
    data,
  );

  if (!model.gegenereerd_op) {
    return (
      <section className="mt-8 rounded-xl bg-amber-50 p-5 text-amber-900">
        <h2 className="font-semibold">
          Rapportinhoud
        </h2>
        <p className="mt-2">
          De rapportgegevens zijn nog niet samengesteld.
        </p>
      </section>
    );
  }

  const openMeldingen = getal(
    model.samenvatting,
    "meldingen_open",
  );
  const inspecties = getal(
    model.samenvatting,
    "inspecties_aantal",
  );
  const schades = getal(
    model.samenvatting,
    "schademeldingen_aantal",
  );

  return (
    <section className="mt-8 space-y-8">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-7 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Managementsamenvatting
            </p>
            <h2 className="mt-3 text-3xl font-bold">
              Beheerbeeld van de rapportperiode
            </h2>
            <p className="mt-3 text-slate-300">
              Periode {datum(model.huidige_periode.vanaf)}
              {" – "}
              {datum(model.huidige_periode.tot_en_met)}.
              Vergelijking met de direct voorafgaande
              kalendermaand.
            </p>
          </div>

          <div
            className={`min-w-40 rounded-2xl p-5 text-center ${risicoklasse(
              model.risico.classificatie,
            )}`}
          >
            <p className="text-sm font-semibold uppercase">
              Risicoscore
            </p>
            <p className="mt-1 text-4xl font-black">
              {getalTekst(model.risico.score)}
            </p>
            <p className="mt-1 font-bold capitalize">
              {model.risico.classificatie}
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Inspecties", inspecties],
            ["Open meldingen", openMeldingen],
            ["Schademeldingen", schades],
            [
              "Kostenindicatie",
              bedrag(model.kosten.totaal_indicatie),
            ],
          ].map(([label, waarde]) => (
            <div
              key={String(label)}
              className="rounded-2xl bg-white/10 p-4 backdrop-blur"
            >
              <p className="text-sm text-slate-300">
                {label}
              </p>
              <p className="mt-1 text-2xl font-bold">
                {waarde}
              </p>
            </div>
          ))}
        </div>

        {model.risico.factoren.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white/10 p-5">
            <p className="font-bold">
              Belangrijkste risicofactoren
            </p>
            <ul className="mt-3 space-y-2 text-slate-200">
              {model.risico.factoren.map(
                (factor) => (
                  <li key={factor}>• {factor}</li>
                ),
              )}
            </ul>
          </div>
        )}
      </div>

      <RapportSectie
        nummer="01"
        titel="Vorige periode versus nu"
        omschrijving="Feitelijke ontwikkeling van controles, meldingen en afwijkingen."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="border-b bg-slate-100">
              <tr>
                <th className="p-4 text-left">
                  Onderdeel
                </th>
                <th className="p-4 text-right">
                  Vorig
                </th>
                <th className="p-4 text-right">
                  Nu
                </th>
                <th className="p-4 text-right">
                  Verschil
                </th>
                <th className="p-4 text-right">
                  Procentueel
                </th>
              </tr>
            </thead>
            <tbody>
              {model.vergelijking.map((item) => (
                <tr
                  key={item.sleutel}
                  className="border-b last:border-0"
                >
                  <td className="p-4 font-semibold">
                    {item.label}
                  </td>
                  <td className="p-4 text-right">
                    {item.vorig}
                  </td>
                  <td className="p-4 text-right">
                    {item.huidig}
                  </td>
                  <td className="p-4 text-right font-semibold">
                    {item.absoluut >= 0 ? "+" : ""}
                    {item.absoluut}
                  </td>
                  <td className="p-4 text-right">
                    {verschilTekst(
                      item.procentueel,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RapportSectie>

      <RapportSectie
        nummer="02"
        titel="Energie- en verbruiksbewaking"
        omschrijving="Verbruik per persoon per week, afgezet tegen de vorige kalendermaand."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {model.energie.map((item) => (
            <article
              key={item.sleutel}
              className="rounded-2xl border border-slate-200 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold">
                    {item.label}
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {getalTekst(
                      item.persoonsweken,
                    )}{" "}
                    persoonsweken
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${signaalklasse(
                    item.signalering,
                  )}`}
                >
                  {item.signalering.replaceAll(
                    "_",
                    " ",
                  )}
                </span>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-slate-500">
                    Nu p.p./week
                  </dt>
                  <dd className="mt-1 text-xl font-bold">
                    {getalTekst(
                      item.per_persoon_per_week,
                      2,
                    )}{" "}
                    {item.eenheid}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">
                    Vorig p.p./week
                  </dt>
                  <dd className="mt-1 text-xl font-bold">
                    {getalTekst(
                      item.vorige_per_persoon_per_week,
                      2,
                    )}{" "}
                    {item.eenheid}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm">
                Afwijking:{" "}
                <strong>
                  {verschilTekst(
                    item.afwijking_percentage,
                  )}
                </strong>
              </p>
            </article>
          ))}
        </div>

        {model.onvolledige_meetperioden > 0 && (
          <p className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-900">
            {model.onvolledige_meetperioden} meetperiode(n)
            bevatten onvoldoende gegevens voor een volledige
            berekening.
          </p>
        )}
      </RapportSectie>

      <RapportSectie
        nummer="03"
        titel="Woningconditie en inspecties"
        omschrijving="Uitgevoerde controles, netheid, schade en algemene toestand."
      >
        {model.inspecties.length === 0 ? (
          <p className="rounded-xl bg-slate-100 p-4 text-slate-600">
            Geen inspecties in deze rapportperiode.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {model.inspecties.map(
              (inspectie, index) => (
                <article
                  key={`${tekst(
                    inspectie,
                    "id",
                    String(index),
                  )}-${index}`}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex justify-between gap-3">
                    <h4 className="font-bold">
                      Inspectie{" "}
                      {datum(
                        tekst(
                          inspectie,
                          "inspectiedatum",
                        ),
                      )}
                    </h4>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                      {tekst(
                        inspectie,
                        "status",
                        "—",
                      )}
                    </span>
                  </div>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt>Algemene toestand</dt>
                      <dd className="font-semibold">
                        {tekst(
                          inspectie,
                          "algemene_toestand",
                          "—",
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Orde en netheid</dt>
                      <dd className="font-semibold">
                        {tekst(
                          inspectie,
                          "orde_netheid_score",
                          "—",
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Schade aanwezig</dt>
                      <dd className="font-semibold">
                        {tekst(
                          inspectie,
                          "schade_aanwezig",
                          "Nee",
                        )}
                      </dd>
                    </div>
                  </dl>
                </article>
              ),
            )}
          </div>
        )}
      </RapportSectie>

      <RapportSectie
        nummer="04"
        titel="Meldingen, schade en herstel"
        omschrijving="Openstaande en opgeloste meldingen met prioriteit en factuurtoewijzing."
      >
        {model.meldingen.length === 0 ? (
          <p className="rounded-xl bg-slate-100 p-4 text-slate-600">
            Geen meldingen in deze rapportperiode.
          </p>
        ) : (
          <div className="space-y-4">
            {model.meldingen.map(
              (melding, index) => (
                <MeldingRij
                  key={`${tekst(
                    melding,
                    "id",
                    String(index),
                  )}-${index}`}
                  melding={melding}
                />
              ),
            )}
          </div>
        )}
      </RapportSectie>

      <RapportSectie
        nummer="05"
        titel="Financieel overzicht"
        omschrijving="Werkelijke kosten, ramingen en verdeling naar factuurontvanger."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-emerald-50 p-5">
            <p className="text-sm text-emerald-800">
              Werkelijke kosten
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-950">
              {bedrag(model.kosten.werkelijk)}
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 p-5">
            <p className="text-sm text-amber-800">
              Geschatte kosten
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-950">
              {bedrag(model.kosten.geschat)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-950 p-5 text-white">
            <p className="text-sm text-slate-300">
              Totale indicatie
            </p>
            <p className="mt-1 text-2xl font-bold">
              {bedrag(
                model.kosten.totaal_indicatie,
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead className="border-b bg-slate-100">
              <tr>
                <th className="p-4 text-left">
                  Factuurontvanger
                </th>
                <th className="p-4 text-right">
                  Bedrag
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(
                model.kosten.per_factuurontvanger,
              ).length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="p-4 text-slate-600"
                  >
                    Nog geen kosten toegewezen.
                  </td>
                </tr>
              ) : (
                Object.entries(
                  model.kosten.per_factuurontvanger,
                ).map(([ontvanger, waarde]) => (
                  <tr
                    key={ontvanger}
                    className="border-b last:border-0"
                  >
                    <td className="p-4 capitalize">
                      {ontvanger.replaceAll("_", " ")}
                    </td>
                    <td className="p-4 text-right font-semibold">
                      {bedrag(waarde)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </RapportSectie>

      <RapportSectie
        nummer="06"
        titel="Acties en besluiten"
        omschrijving="Concrete opvolging op basis van risico, energie en openstaande werkzaamheden."
      >
        <ol className="space-y-3">
          {model.acties.map((actie, index) => (
            <li
              key={`${actie}-${index}`}
              className="flex gap-4 rounded-xl bg-slate-100 p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 font-bold text-white">
                {index + 1}
              </span>
              <span className="pt-1">{actie}</span>
            </li>
          ))}
        </ol>

        {model.opmerkingen && (
          <div className="mt-6 rounded-xl border border-slate-200 p-5">
            <p className="font-bold">
              Aanvullende opmerkingen
            </p>
            <p className="mt-2 whitespace-pre-wrap text-slate-700">
              {model.opmerkingen}
            </p>
          </div>
        )}
      </RapportSectie>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 pt-5 text-sm text-slate-500">
        <span>
          Laatst samengesteld op{" "}
          {datumTijd(model.gegenereerd_op)}
        </span>
        <span>
          CFME Control · Vertrouwelijk
        </span>
      </footer>
    </section>
  );
}
