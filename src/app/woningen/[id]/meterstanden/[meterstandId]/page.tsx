import Link from "next/link";
import { notFound } from "next/navigation";
import { getMeterstandById, getMeterstandCorrecties } from "@/services/meterstanden-server";
import { getWoningById } from "@/services/woningen-server";

export const dynamic = "force-dynamic";

function datum(waarde: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${waarde}T00:00:00`));
}

function stand(
  waarde: number | null,
  eenheid: string
): string {
  if (waarde === null) return "Niet opgenomen";

  return `${new Intl.NumberFormat("nl-NL", {
    maximumFractionDigits: 3,
  }).format(waarde)} ${eenheid}`;
}

export default async function MeterstandDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
    meterstandId: string;
  }>;
}) {
  const { id, meterstandId } = await params;
  const woningId = Number(id);
  const meterstandNummer = Number(meterstandId);

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0 ||
    !Number.isInteger(meterstandNummer) ||
    meterstandNummer <= 0
  ) {
    notFound();
  }

  const [woning, meterstand, correcties] = await Promise.all([
    getWoningById(woningId),
    getMeterstandById(meterstandNummer),
    getMeterstandCorrecties(meterstandNummer),
  ]);

  if (
    !woning ||
    !meterstand ||
    meterstand.woning_id !== woningId
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/woningen/${woning.id}`}
          className="mb-6 inline-block font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar woning
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Meteropname
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                {datum(meterstand.opnamedatum)}
              </h1>

              <p className="mt-2 text-slate-600">
                {woning.adres}, {woning.postcode}{" "}
                {woning.plaats}
              </p>
            </div>

            <Link
              href={`/woningen/${woning.id}/meterstanden/${meterstand.id}/bewerken`}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
            >
              Bewerken
            </Link>
          </div>

          <dl className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm text-slate-500">
                Aantal bewoners
              </dt>
              <dd className="mt-1 font-semibold">
                {meterstand.bewoners_aantal}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Dagstroom
              </dt>
              <dd className="mt-1 font-semibold">
                {stand(
                  meterstand.dagstroom_kwh,
                  "kWh"
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Nachtstroom
              </dt>
              <dd className="mt-1 font-semibold">
                {stand(
                  meterstand.nachtstroom_kwh,
                  "kWh"
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Gas
              </dt>
              <dd className="mt-1 font-semibold">
                {stand(meterstand.gas_m3, "m³")}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Water
              </dt>
              <dd className="mt-1 font-semibold">
                {stand(meterstand.water_m3, "m³")}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Opgenomen door
              </dt>
              <dd className="mt-1 font-semibold">
                {meterstand.opgenomen_door || "—"}
              </dd>
            </div>
          </dl>


          {Object.keys(meterstand.meteruitzonderingen ?? {}).length > 0 && (
            <section className="mt-8 rounded-xl border border-sky-200 bg-sky-50 p-5">
              <h2 className="text-xl font-bold">Uitzonderingen bij opname</h2>
              <div className="mt-4 space-y-3">
                {Object.entries(meterstand.meteruitzonderingen ?? {}).map(([meter, uitzondering]) => (
                  <div key={meter} className="rounded-lg bg-white p-4">
                    <p className="font-semibold">{meter.replaceAll("_", " ")}</p>
                    <p className="mt-1">{uitzondering.status.replaceAll("_", " ")}: {uitzondering.reden}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {correcties.length > 0 && (
            <section className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-5">
              <h2 className="text-xl font-bold">Correctiehistorie</h2>
              <p className="mt-1 text-sm text-amber-900">Oorspronkelijke waarden blijven aantoonbaar bewaard.</p>
              <div className="mt-4 space-y-3">
                {correcties.map((correctie) => (
                  <div key={correctie.id} className="rounded-lg bg-white p-4">
                    <p className="font-semibold">{new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(correctie.created_at))}</p>
                    <p className="mt-1">{correctie.reden}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-xl font-bold">
              Opmerkingen
            </h2>

            <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-100 p-5">
              {meterstand.opmerkingen ||
                "Geen opmerkingen."}
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
