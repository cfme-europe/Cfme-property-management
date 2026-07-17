import type {
  ControlebriefingMetWerkpunten,
  IntelligenceWerkpuntPrioriteit,
  WoningDnaRisiconiveau,
} from "@/types/intelligence";

type Props = {
  gegevens: ControlebriefingMetWerkpunten | null;
};

const risicoOpmaak: Record<
  WoningDnaRisiconiveau,
  { label: string; kaart: string; badge: string }
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

const prioriteitOpmaak: Record<
  IntelligenceWerkpuntPrioriteit,
  string
> = {
  laag: "bg-slate-200 text-slate-800",
  normaal: "bg-blue-100 text-blue-800",
  hoog: "bg-orange-100 text-orange-900",
  spoed: "bg-red-100 text-red-900",
};

function datum(waarde: string | null): string {
  if (!waarde) return "—";

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${waarde}T00:00:00`));
}

export default function ControlebriefingOverzicht({
  gegevens,
}: Props) {
  if (!gegevens) {
    return (
      <section className="mb-8 rounded-2xl border border-violet-200 bg-white p-6 shadow">
        <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">
          Uitsluitend intern
        </p>

        <h2 className="mt-1 text-xl font-bold">
          Controlebriefing
        </h2>

        <p className="mt-1 text-slate-600">
          Interne voorbereiding voor controles. Niet geschikt
          voor automatische opname in klantdocumenten.
        </p>

        <p className="mt-5 rounded-xl bg-slate-100 p-5 text-slate-600">
          Voor deze woning is nog geen actieve controlebriefing
          beschikbaar.
        </p>
      </section>
    );
  }

  const { briefing, werkpunten } = gegevens;
  const risico = risicoOpmaak[briefing.risiconiveau];

  return (
    <section className="mb-8 rounded-2xl border border-violet-200 bg-white p-6 shadow">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">
            Uitsluitend intern
          </p>

          <h2 className="mt-1 text-xl font-bold">
            Controlebriefing
          </h2>

          <p className="mt-1 text-slate-600">
            Voorbereidende interpretatie op basis van
            geregistreerde bronnen. Geen vastgestelde feiten.
          </p>
        </div>

        <div
          className={`rounded-xl border px-5 py-4 ${risico.kaart}`}
        >
          <p className="text-sm font-medium">Risicoscore</p>

          <div className="mt-2 flex items-center gap-3">
            <p className="text-3xl font-bold">
              {briefing.risicoscore}
            </p>

            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${risico.badge}`}
            >
              {risico.label}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl bg-slate-100 p-5">
          <h3 className="font-semibold">Samenvatting</h3>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            {briefing.samenvatting}
          </p>
        </div>

        <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
          <h3 className="font-semibold text-violet-950">
            Intern advies
          </h3>
          <p className="mt-3 text-sm leading-6 text-violet-900">
            {briefing.advies || "Geen aanvullend advies."}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">
            Actieve interne werkpunten
          </h3>

          <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-800">
            {werkpunten.length}
          </span>
        </div>

        {werkpunten.length === 0 ? (
          <p className="mt-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
            Geen actieve interne werkpunten.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {werkpunten.map((werkpunt) => (
              <article
                key={werkpunt.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {werkpunt.titel}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {werkpunt.omschrijving}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${prioriteitOpmaak[werkpunt.prioriteit]}`}
                  >
                    {werkpunt.prioriteit}
                  </span>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Bron: {werkpunt.bron_type}
                  {werkpunt.bron_id
                    ? ` #${werkpunt.bron_id}`
                    : ""}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      <p className="mt-5 text-xs text-slate-500">
        Peildatum {datum(briefing.peildatum)} · Geldig tot{" "}
        {datum(briefing.geldig_tot)} · Briefing #{briefing.id}
      </p>
    </section>
  );
}
