import { berekenVerbruiksperiodes } from "@/services/energieverbruik";
import type { Meterstand } from "@/types/meterstand";

type Props = {
  meterstanden: Meterstand[];
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
  eenheid: string
): string {
  if (waarde === null) {
    return "—";
  }

  return `${new Intl.NumberFormat("nl-NL", {
    maximumFractionDigits: 2,
  }).format(waarde)} ${eenheid}`;
}

export default function EnergieVerbruikOverzicht({
  meterstanden,
}: Props) {
  const periodes =
    berekenVerbruiksperiodes(meterstanden);

  if (meterstanden.length < 2) {
    return (
      <p className="rounded-xl bg-slate-100 p-5 text-slate-600">
        Minimaal twee meteropnames zijn nodig om
        verbruik te berekenen.
      </p>
    );
  }

  if (periodes.length === 0) {
    return (
      <p className="rounded-xl bg-amber-50 p-5 text-amber-900">
        Verbruik kon niet worden berekend. Controleer
        of opeenvolgende meterstanden volledig zijn en
        niet lager worden.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <p className="mb-4 text-sm text-slate-600">
        Intervallen volgen dezelfde meetvalidatie en tijdsevenredige berekening
        als de energieanalyse. Persoonsnormen zijn hier niet beschikbaar,
        omdat de volledige bewonersregistratie niet is geladen.
      </p>
      <table className="w-full min-w-[1450px]">
        <thead className="border-b bg-slate-100">
          <tr>
            <th className="p-4 text-left">
              Periode (eind exclusief)
            </th>
            <th className="p-4 text-left">
              Dagen
            </th>
            <th className="p-4 text-left">
              Bewonersnorm
            </th>
            <th className="p-4 text-left">
              Dagstroom totaal
            </th>
            <th className="p-4 text-left">
              Dagstroom per week
            </th>
            <th className="p-4 text-left">
              Nachtstroom totaal
            </th>
            <th className="p-4 text-left">
              Nachtstroom per week
            </th>
            <th className="p-4 text-left">
              Elektriciteit totaal
            </th>
            <th className="p-4 text-left">
              Elektriciteit per week
            </th>
            <th className="p-4 text-left">
              Gas totaal
            </th>
            <th className="p-4 text-left">
              Gas per week
            </th>
            <th className="p-4 text-left">
              Water totaal
            </th>
            <th className="p-4 text-left">
              Water per week
            </th>
          </tr>
        </thead>

        <tbody>
          {periodes.map((periode) => (
            <tr
              key={`${periode.van_datum}-${periode.tot_datum}`}
              className="border-b border-slate-200 last:border-0"
            >
              <td className="p-4 font-medium">
                {datum(periode.van_datum)}
                {" – "}
                {datum(periode.tot_datum)}
              </td>

              <td className="p-4">
                {periode.aantal_dagen}
              </td>

              <td className="p-4">
                {periode.gemiddeld_bewoners_aantal === null
                  ? "—"
                  : new Intl.NumberFormat("nl-NL", {
                      maximumFractionDigits: 1,
                    }).format(periode.gemiddeld_bewoners_aantal)}
              </td>

              <td className="p-4">
                {getal(
                  periode.dagstroom.totaal,
                  "kWh"
                )}
              </td>

              <td className="p-4 font-semibold text-emerald-800">
                {getal(
                  periode.dagstroom.per_week,
                  "kWh"
                )}
              </td>

              <td className="p-4">
                {getal(
                  periode.nachtstroom.totaal,
                  "kWh"
                )}
              </td>

              <td className="p-4 font-semibold text-emerald-800">
                {getal(
                  periode.nachtstroom.per_week,
                  "kWh"
                )}
              </td>

              <td className="p-4">
                {getal(
                  periode.elektriciteit.totaal,
                  "kWh"
                )}
              </td>

              <td className="p-4 font-semibold text-emerald-800">
                {getal(
                  periode.elektriciteit.per_week,
                  "kWh"
                )}
              </td>

              <td className="p-4">
                {getal(
                  periode.gas.totaal,
                  "m³"
                )}
              </td>

              <td className="p-4 font-semibold text-emerald-800">
                {getal(
                  periode.gas.per_week,
                  "m³"
                )}
              </td>

              <td className="p-4">
                {getal(
                  periode.water.totaal,
                  "m³"
                )}
              </td>

              <td className="p-4 font-semibold text-emerald-800">
                {getal(
                  periode.water.per_week,
                  "m³"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
