import type {
  JsonWaarde,
  Maandrapportage,
} from "@/types/maandrapportage";

type Props = {
  rapportage: Maandrapportage;
};

type JsonObject = Record<string, JsonWaarde>;

type TemplateblokSnapshot = {
  code: string;
  bloktype: string;
  titel: string;
  volgorde: number;
  verplicht: boolean;
};

function alsObject(
  waarde: JsonWaarde | undefined
): JsonObject | null {
  if (
    waarde === null ||
    Array.isArray(waarde) ||
    typeof waarde !== "object"
  ) {
    return null;
  }

  return waarde;
}

function alsObjecten(
  waarde: JsonWaarde | undefined
): JsonObject[] {
  if (!Array.isArray(waarde)) {
    return [];
  }

  return waarde
    .map(alsObject)
    .filter(
      (object): object is JsonObject =>
        object !== null
    );
}

function tekst(
  object: JsonObject,
  sleutel: string,
  standaard = "—"
): string {
  const waarde = object[sleutel];

  if (
    typeof waarde === "string" ||
    typeof waarde === "number"
  ) {
    return String(waarde);
  }

  if (typeof waarde === "boolean") {
    return waarde ? "Ja" : "Nee";
  }

  return standaard;
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

function templateblokken(
  data: JsonObject
): TemplateblokSnapshot[] {
  const template = alsObject(data.template);
  const blokken = template?.blokken;

  if (!Array.isArray(blokken)) {
    return [
      {
        code: "samenvatting",
        bloktype: "samenvatting",
        titel: "Samenvatting",
        volgorde: 1,
        verplicht: true,
      },
    ];
  }

  return blokken
    .map(alsObject)
    .filter(
      (blok): blok is JsonObject =>
        blok !== null
    )
    .map((blok) => ({
      code: tekst(blok, "code", ""),
      bloktype: tekst(blok, "bloktype", ""),
      titel: tekst(blok, "titel", "Rapportblok"),
      volgorde: Number(blok.volgorde ?? 0),
      verplicht: blok.verplicht === true,
    }))
    .sort((a, b) => a.volgorde - b.volgorde);
}

function Samenvatting({
  data,
}: {
  data: JsonObject;
}) {
  const samenvatting =
    alsObject(data.samenvatting) ?? {};

  const kaarten = [
    ["Bewoners", "bewoners_aantal"],
    ["Inspecties", "inspecties_aantal"],
    ["Open meldingen", "meldingen_open"],
    ["Schademeldingen", "schademeldingen_aantal"],
    ["Inspecties met schade", "inspecties_met_schade"],
    ["Opgeloste meldingen", "meldingen_opgelost"],
    ["Meteropnames", "meteropnames_aantal"],
    ["Verbruiksperiodes", "verbruiksperiodes_aantal"],
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kaarten.map(([label, sleutel]) => (
        <div
          key={sleutel}
          className="rounded-xl bg-slate-100 p-4"
        >
          <p className="text-sm text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold">
            {tekst(samenvatting, sleutel, "0")}
          </p>
        </div>
      ))}
    </div>
  );
}

function Lijstblok({
  data,
  sleutel,
}: {
  data: JsonObject;
  sleutel: string;
}) {
  const rijen = alsObjecten(data[sleutel]);

  if (rijen.length === 0) {
    return (
      <p className="rounded-xl bg-slate-100 p-4 text-slate-600">
        Geen gegevens beschikbaar.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rijen.map((rij, index) => (
        <article
          key={`${sleutel}-${index}`}
          className="rounded-xl border border-slate-200 p-4"
        >
          <dl className="grid gap-3 md:grid-cols-2">
            {Object.entries(rij).map(
              ([naam, waarde]) => (
                <div key={naam}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {naam.replaceAll("_", " ")}
                  </dt>
                  <dd className="mt-1 break-words">
                    {typeof waarde === "object" &&
                    waarde !== null
                      ? JSON.stringify(waarde)
                      : String(waarde ?? "—")}
                  </dd>
                </div>
              )
            )}
          </dl>
        </article>
      ))}
    </div>
  );
}

export default function MaandrapportageInhoud({
  rapportage,
}: Props) {
  const data = rapportage.rapport_data;
  const gegenereerdOp =
    typeof data.gegenereerd_op === "string"
      ? data.gegenereerd_op
      : null;

  if (!gegenereerdOp) {
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

  const blokken = templateblokken(data);

  return (
    <section className="mt-8">
      <div>
        <h2 className="text-xl font-bold">
          Rapportinhoud
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Laatst samengesteld op{" "}
          {datumTijd(gegenereerdOp)}.
        </p>
      </div>

      <div className="mt-6 space-y-8">
        {blokken.map((blok) => (
          <section key={`${blok.code}-${blok.volgorde}`}>
            <h3 className="mb-4 text-lg font-bold">
              {blok.titel}
              {blok.verplicht && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  Verplicht
                </span>
              )}
            </h3>

            {blok.bloktype === "samenvatting" ? (
              <Samenvatting data={data} />
            ) : blok.bloktype === "opmerkingen" ? (
              <p className="whitespace-pre-wrap rounded-xl bg-slate-100 p-4">
                {typeof data.opmerkingen === "string"
                  ? data.opmerkingen
                  : "Geen aanvullende opmerkingen."}
              </p>
            ) : (
              <Lijstblok
                data={data}
                sleutel={blok.bloktype}
              />
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
