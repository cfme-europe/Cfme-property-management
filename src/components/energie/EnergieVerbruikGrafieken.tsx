import { berekenVerbruiksperiodes } from "@/services/energieverbruik";
import type { Meterstand } from "@/types/meterstand";

type Props = {
  meterstanden: Meterstand[];
};

type Reeks = {
  sleutel: "elektriciteit" | "gas" | "water";
  titel: string;
  eenheid: string;
};

const reeksen: Reeks[] = [
  {
    sleutel: "elektriciteit",
    titel: "Elektriciteit per bewoner per week",
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

            <div className="mt-6 flex h-64 items-end gap-3 overflow-x-auto border-b border-l border-slate-300 px-4 pt-4">
              {gegevens.map((item) => {
                const hoogte = Math.max(
                  (item.waarde / maximum) * 100,
                  2
                );

                return (
                  <div
                    key={item.label}
                    className="flex min-w-20 flex-1 flex-col items-center justify-end"
                  >
                    <span className="mb-2 text-xs font-semibold text-slate-700">
                      {new Intl.NumberFormat("nl-NL", {
                        maximumFractionDigits: 2,
                      }).format(item.waarde)}
                    </span>

                    <div
                      className="w-full rounded-t-lg bg-emerald-700"
                      style={{
                        height: `${hoogte}%`,
                      }}
                      title={`${item.label}: ${formatGetal(
                        item.waarde,
                        reeks.eenheid
                      )}`}
                    />

                    <span className="mt-2 whitespace-nowrap pb-3 text-xs text-slate-500">
                      {item.label}
                    </span>
                  </div>
                );
              })}
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
