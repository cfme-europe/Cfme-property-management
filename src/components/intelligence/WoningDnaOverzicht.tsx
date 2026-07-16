import type {
  WoningDnaRisiconiveau,
  WoningDnaSnapshot,
} from "@/types/intelligence";

type Props = {
  snapshot: WoningDnaSnapshot | null;
};

const risicoOpmaak: Record<
  WoningDnaRisiconiveau,
  {
    label: string;
    kaart: string;
    badge: string;
  }
> = {
  laag: {
    label: "Laag",
    kaart: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-200 text-emerald-900",
  },
  middel: {
    label: "Middel",
    kaart: "border-amber-200 bg-amber-50",
    badge: "bg-amber-200 text-amber-900",
  },
  hoog: {
    label: "Hoog",
    kaart: "border-orange-200 bg-orange-50",
    badge: "bg-orange-200 text-orange-900",
  },
  kritiek: {
    label: "Kritiek",
    kaart: "border-red-200 bg-red-50",
    badge: "bg-red-200 text-red-900",
  },
};

function datum(waarde: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${waarde}T00:00:00`));
}

function getal(
  waarde: number | null,
  achtervoegsel = ""
): string {
  if (waarde === null) {
    return "Onvoldoende gegevens";
  }

  const resultaat = new Intl.NumberFormat("nl-NL", {
    maximumFractionDigits: 1,
  }).format(waarde);

  return achtervoegsel
    ? `${resultaat}${achtervoegsel}`
    : resultaat;
}

export default function WoningDnaOverzicht({
  snapshot,
}: Props) {
  if (!snapshot) {
    return (
      <section className="mb-8 rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold">
          Woning-DNA
        </h2>

        <p className="mt-1 text-slate-600">
          Samengestelde interne analyse van inspecties,
          meldingen, taken en controles.
        </p>

        <p className="mt-5 rounded-xl bg-slate-100 p-5 text-slate-600">
          Voor deze woning is nog geen Woning-DNA berekend.
        </p>
      </section>
    );
  }

  const risico =
    risicoOpmaak[snapshot.risiconiveau];

  return (
    <section className="mb-8 rounded-2xl bg-white p-6 shadow">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">
            Interne Intelligence
          </p>

          <h2 className="mt-1 text-xl font-bold">
            Woning-DNA
          </h2>

          <p className="mt-1 text-slate-600">
            Analyse op basis van de laatste 180 dagen.
            Interpretaties zijn geen vastgestelde feiten.
          </p>
        </div>

        <div
          className={`rounded-xl border px-5 py-4 ${risico.kaart}`}
        >
          <p className="text-sm font-medium">
            Risicoscore
          </p>

          <div className="mt-2 flex items-center gap-3">
            <p className="text-3xl font-bold">
              {snapshot.risicoscore}
            </p>

            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${risico.badge}`}
            >
              {risico.label}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-sm text-slate-500">
            Inspecties
          </p>
          <p className="mt-1 text-2xl font-bold">
            {snapshot.inspecties_aantal}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {snapshot.inspecties_met_schade} met schade
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-sm text-slate-500">
            Orde en netheid
          </p>
          <p className="mt-1 text-2xl font-bold">
            {getal(
              snapshot.gemiddelde_orde_netheid,
              "/5"
            )}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-sm text-slate-500">
            Open meldingen
          </p>
          <p className="mt-1 text-2xl font-bold">
            {snapshot.meldingen_open}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {snapshot.meldingen_hoog_spoed} hoog of spoed
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-sm text-slate-500">
            Open taken
          </p>
          <p className="mt-1 text-2xl font-bold">
            {snapshot.taken_open}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {snapshot.taken_over_deadline} over deadline
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="font-semibold text-emerald-900">
            Sterke punten
          </h3>

          {snapshot.sterke_punten.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-800">
              Nog geen sterke punten vastgesteld.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-emerald-900">
              {snapshot.sterke_punten.map((punt) => (
                <li key={punt}>
                  • {punt}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-semibold text-amber-900">
            Aandachtspunten
          </h3>

          {snapshot.aandachtspunten.length === 0 ? (
            <p className="mt-3 text-sm text-amber-800">
              Geen actuele aandachtspunten berekend.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-amber-900">
              {snapshot.aandachtspunten.map((punt) => (
                <li key={punt}>
                  • {punt}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="mt-5 text-xs text-slate-500">
        Peildatum {datum(snapshot.peildatum)} · Gemiddelde
        controletijd:{" "}
        {snapshot.gemiddelde_controletijd_minuten === null
          ? "onvoldoende gegevens"
          : `${getal(
              snapshot.gemiddelde_controletijd_minuten
            )} minuten`}
      </p>
    </section>
  );
}
