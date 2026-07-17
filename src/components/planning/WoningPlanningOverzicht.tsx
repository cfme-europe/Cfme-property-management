import Link from "next/link";
import type { ActieveWoningplanning } from "@/types/planning";

type Props = {
  woningId: number;
  planning: ActieveWoningplanning | null;
};

function datum(waarde: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${waarde}T00:00:00`));
}

export default function WoningPlanningOverzicht({
  woningId,
  planning,
}: Props) {
  return (
    <section className="mb-8 rounded-2xl bg-white p-6 shadow">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Operationele planning
          </p>

          <h2 className="mt-1 text-xl font-bold">
            Rayon en standaardcontrole
          </h2>

          <p className="mt-1 text-slate-600">
            Vaste rayonindeling, controleur en controlefrequentie.
          </p>
        </div>

        <Link
          href={`/woningen/${woningId}/planning`}
          className="rounded-xl border border-blue-700 px-5 py-3 font-medium text-blue-700 hover:bg-blue-50"
        >
          Planning beheren
        </Link>
      </div>

      {!planning ? (
        <p className="mt-5 rounded-xl bg-amber-50 p-5 text-amber-900">
          Deze woning heeft nog geen actieve rayontoewijzing.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-100 p-4">
            <p className="text-sm text-slate-500">Rayon</p>
            <p className="mt-1 text-lg font-bold">
              {planning.rayon_naam}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {planning.rayon_code}
            </p>
          </div>

          <div className="rounded-xl bg-slate-100 p-4">
            <p className="text-sm text-slate-500">
              Standaardcontroleur
            </p>
            <p className="mt-1 text-lg font-bold">
              {planning.controleur_naam ||
                planning.controleur_email ||
                "Niet toegewezen"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-100 p-4">
            <p className="text-sm text-slate-500">
              Controlefrequentie
            </p>
            <p className="mt-1 text-lg font-bold">
              Iedere {planning.controlefrequentie_dagen} dagen
            </p>
          </div>

          <div className="rounded-xl bg-slate-100 p-4">
            <p className="text-sm text-slate-500">
              Geldig vanaf
            </p>
            <p className="mt-1 text-lg font-bold">
              {datum(planning.geldig_vanaf)}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
