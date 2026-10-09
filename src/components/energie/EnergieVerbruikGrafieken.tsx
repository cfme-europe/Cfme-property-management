import { berekenVerbruiksperiodes } from "@/services/energieverbruik";
import type { Meterstand } from "@/types/meterstand";

type Props = {
  meterstanden: Meterstand[];
};

type Reeks = {
  sleutel:
    | "dagstroom"
    | "nachtstroom"
    | "elektriciteit"
    | "gas"
    | "water";
  titel: string;
  eenheid: string;
};

const reeksen: Reeks[] = [
  {
    sleutel: "dagstroom",
    titel: "Dagstroom per bewoner per week",
    eenheid: "kWh",
  },
  {
    sleutel: "nachtstroom",
    titel: "Nachtstroom per bewoner per week",
    eenheid: "kWh",
  },
  {
    sleutel: "elektriciteit",
    titel: "Elektriciteit totaal per bewoner per week",
    eenheid: "kWh",
  },
  {
    sleutel: "gas",
    titel: "Gas per bewoner per week",
    eenheid: "m³",
  },
  {
    sleutel: "water",
    titel: "Water per bewoner per week",
    eenheid: "m³",
  },
];

function datumKort(waarde: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${waarde}T00:00:00`));
}

function formatGetal(
  waarde: number,
  eenheid: string
): string {
  return `${new Intl.NumberFormat("nl-NL", {
    maximumFractionDigits: 2,
  }).format(waarde)} ${eenheid}`;
}

function procentueleAfwijking(
  huidig: number,
  referentie: number
): number | null {
  if (referentie <= 0) {
    return null;
  }

  return ((huidig - referentie) / referentie) * 100;
}

export default function EnergieVerbruikGrafieken({
  meterstanden,
}: Props) {
  const periodes = berekenVerbruiksperiodes(
    meterstanden
  ).slice(0, 8);

  if (periodes.length === 0) {
    return (
      <p className="rounded-xl bg-slate-100 p-5 text-slate-600">
        Nog onvoldoende gegevens voor grafieken en
        afwijkingsanalyse.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {reeksen.map((reeks) => {
        const gegevens = [...periodes]
          .reverse()
          .map((periode) => ({
            label: `${datumKort(
              periode.van_datum
            )}–${datumKort(periode.tot_datum)}`,
            waarde:
              periode[reeks.sleutel]
                .per_bewoner_per_week,
          }))
          .filter(
            (
              item
            ): item is {
              label: string;
              waarde: number;
            } => item.waarde !== null
          );

        if (gegevens.length === 0) {
          return (
            <section
              key={reeks.sleutel}
              className="rounded-xl border border-slate-200 p-5"
            >
              <h3 className="font-semibold">
                {reeks.titel}
              </h3>

              <p className="mt-3 text-sm text-slate-600">
                Geen complete meetperiodes beschikbaar.
              </p>
            </section>
          );
        }

        const maximum = Math.max(
          ...gegevens.map((item) => item.waarde),
          1
        );
        const schaalMaximum = maximum * 1.1;
        const schaalWaarden = [1, 0.75, 0.5, 0.25, 0].map(
          (factor) => schaalMaximum * factor
        );

        const laatste = gegevens.at(-1);
        const eerdere = gegevens.slice(0, -1);

        const gemiddeldeEerdere =
          eerdere.length > 0
            ? eerdere.reduce(
                (totaal, item) =>
                  totaal + item.waarde,
                0
              ) / eerdere.length
            : null;

        const afwijking =
          laatste && gemiddeldeEerdere !== null
            ? procentueleAfwijking(
                laatste.waarde,
                gemiddeldeEerdere
              )
            : null;

        const opvallend =
          afwijking !== null &&
          Math.abs(afwijking) >= 20;

        return (
          <section
            key={reeks.sleutel}
            className="rounded-xl border border-slate-200 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">
                  {reeks.titel}
                </h3>

                <p className="mt-1 text-sm text-slate-600">
                  Laatste {gegevens.length} berekende
                  periodes.
                </p>
              </div>

              {laatste && afwijking !== null && (
                <div
                  className={`rounded-xl px-4 py-3 text-sm ${
                    opvallend
                      ? "bg-amber-100 text-amber-900"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <p className="font-semibold">
                    Laatste periode
                  </p>

                  <p className="mt-1">
                    {formatGetal(
                      laatste.waarde,
                      reeks.eenheid
                    )}
                  </p>

                  <p className="mt-1">
                    {afwijking >= 0 ? "+" : ""}
                    {new Intl.NumberFormat("nl-NL", {
                      maximumFractionDigits: 1,
                    }).format(afwijking)}
                    % ten opzichte van eerdere periodes
                  </p>
                </div>
              )}
            </div>

            <div
              className="mt-6 overflow-x-auto"
              role="img"
              aria-label={`${reeks.titel}. Staafdiagram met ${gegevens.length} meetperiodes.`}
            >
              <div
                className="min-w-[32rem]"
                style={{
                  minWidth: `${Math.max(
                    512,
                    gegevens.length * 112
                  )}px`,
                }}
              >
                <div className="grid grid-cols-[4.5rem_1fr] gap-3">
                  <div className="flex h-64 flex-col justify-between pb-1 text-right text-xs text-slate-500">
                    {schaalWaarden.map((waarde) => (
                      <span key={waarde}>
                        {new Intl.NumberFormat("nl-NL", {
                          maximumFractionDigits: 1,
                        }).format(waarde)}
                      </span>
                    ))}
                  </div>

                  <div className="relative h-64 border-b border-l border-slate-300">
                    {schaalWaarden.map((waarde, index) => (
                      <div
                        key={waarde}
                        className="absolute inset-x-0 border-t border-slate-200"
                        style={{ top: `${index * 25}%` }}
                      />
                    ))}

                    <div className="absolute inset-0 flex items-end gap-4 px-4">
                      {gegevens.map((item, index) => {
                        const hoogte = Math.max(
                          (item.waarde / schaalMaximum) * 100,
                          3
                        );
                        const isLaatste =
                          index === gegevens.length - 1;

                        return (
                          <div
                            key={item.label}
                            className="relative h-full min-w-20 flex-1"
                          >
                            <span
                              className="absolute inset-x-0 text-center text-xs font-bold text-slate-800"
                              style={{
                                bottom: `calc(${hoogte}% + 0.5rem)`,
                              }}
                            >
                              {new Intl.NumberFormat("nl-NL", {
                                maximumFractionDigits: 2,
                              }).format(item.waarde)}
                            </span>

                            <div
                              className={`absolute inset-x-1 bottom-0 min-h-2 rounded-t-lg shadow-sm ${
                                isLaatste
                                  ? "bg-emerald-700"
                                  : "bg-emerald-500"
                              }`}
                              style={{ height: `${hoogte}%` }}
                              title={`${item.label}: ${formatGetal(
                                item.waarde,
                                reeks.eenheid
                              )}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-[4.5rem_1fr] gap-3">
                  <span className="text-right text-xs font-medium text-slate-500">
                    {reeks.eenheid}
                  </span>

                  <div className="flex gap-4 px-4">
                    {gegevens.map((item) => (
                      <span
                        key={item.label}
                        className="min-w-20 flex-1 whitespace-nowrap text-center text-xs text-slate-600"
                      >
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {opvallend && (
              <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                Afwijking groter dan 20%. Controleer de
                meterstanden, bewonersbezetting en mogelijke
                oorzaken van het afwijkende verbruik.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
