import type {
  JsonWaarde,
  Maandrapportage,
} from "@/types/maandrapportage";

type Props = {
  rapportage: Maandrapportage;
};

function objectWaarde(
  waarde: JsonWaarde | undefined
): Record<string, JsonWaarde> | null {
  if (
    waarde === null ||
    Array.isArray(waarde) ||
    typeof waarde !== "object"
  ) {
    return null;
  }

  return waarde;
}

function getal(
  object: Record<string, JsonWaarde> | null,
  sleutel: string
): number {
  const waarde = object?.[sleutel];
  return typeof waarde === "number" ? waarde : 0;
}

function tekst(
  object: Record<string, JsonWaarde> | null,
  sleutel: string
): string | null {
  const waarde = object?.[sleutel];
  return typeof waarde === "string"
    ? waarde
    : null;
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

export default function MaandrapportageInhoud({
  rapportage,
}: Props) {
  const data = rapportage.rapport_data;
  const samenvatting = objectWaarde(
    data.samenvatting
  );
  const gegenereerdOp = tekst(
    data,
    "gegenereerd_op"
  );

  if (!samenvatting || !gegenereerdOp) {
    return (
      <section className="mt-8 rounded-xl bg-amber-50 p-5 text-amber-900">
        <h2 className="font-semibold">
          Rapportinhoud
        </h2>

        <p className="mt-2">
          De rapportgegevens zijn nog niet
          samengesteld.
        </p>
      </section>
    );
  }

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

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-sm text-slate-500">
            Bewoners
          </p>
          <p className="mt-1 text-2xl font-bold">
            {getal(
              samenvatting,
              "bewoners_aantal"
            )}
          </p>
        </div>

        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">
            Inspecties
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">
            {getal(
              samenvatting,
              "inspecties_aantal"
            )}
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 p-4">
          <p className="text-sm text-amber-700">
            Open meldingen
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-900">
            {getal(
              samenvatting,
              "meldingen_open"
            )}
          </p>
        </div>

        <div className="rounded-xl bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Schademeldingen
          </p>
          <p className="mt-1 text-2xl font-bold text-red-900">
            {getal(
              samenvatting,
              "schademeldingen_aantal"
            )}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-sm text-slate-500">
            Inspecties met schade
          </p>
          <p className="mt-1 text-2xl font-bold">
            {getal(
              samenvatting,
              "inspecties_met_schade"
            )}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-sm text-slate-500">
            Opgeloste meldingen
          </p>
          <p className="mt-1 text-2xl font-bold">
            {getal(
              samenvatting,
              "meldingen_opgelost"
            )}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-sm text-slate-500">
            Meteropnames
          </p>
          <p className="mt-1 text-2xl font-bold">
            {getal(
              samenvatting,
              "meteropnames_aantal"
            )}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-sm text-slate-500">
            Verbruiksperiodes
          </p>
          <p className="mt-1 text-2xl font-bold">
            {getal(
              samenvatting,
              "verbruiksperiodes_aantal"
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
