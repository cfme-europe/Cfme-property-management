import Link from "next/link";
import { notFound } from "next/navigation";
import MeldingVerwijderenButton from "@/components/meldingen/MeldingVerwijderenButton";
import { getMeldingById } from "@/services/meldingen-server";
import { getWoningById } from "@/services/woningen-server";
import type {
  FactuurOntvanger,
  MeldingCategorie,
  MeldingPrioriteit,
  MeldingStatus,
} from "@/types/melding";

export const dynamic = "force-dynamic";

function datum(waarde: string | null): string {
  if (!waarde) return "—";

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${waarde}T00:00:00`));
}

function categorieLabel(
  categorie: MeldingCategorie
): string {
  const labels: Record<MeldingCategorie, string> = {
    schade: "Schade",
    onderhoud: "Onderhoud",
    veiligheid: "Veiligheid",
    schoonmaak: "Schoonmaak",
    installatie: "Installatie",
    overig: "Overig",
  };

  return labels[categorie];
}

function prioriteitLabel(
  prioriteit: MeldingPrioriteit
): string {
  const labels: Record<MeldingPrioriteit, string> = {
    laag: "Laag",
    normaal: "Normaal",
    hoog: "Hoog",
    spoed: "Spoed",
  };

  return labels[prioriteit];
}

function statusLabel(status: MeldingStatus): string {
  const labels: Record<MeldingStatus, string> = {
    open: "Open",
    in_behandeling: "In behandeling",
    opgelost: "Opgelost",
  };

  return labels[status];
}

function factuurLabel(
  ontvanger: FactuurOntvanger | null
): string {
  if (!ontvanger) return "Niet van toepassing";

  const labels: Record<FactuurOntvanger, string> = {
    cfme: "CFME",
    hurend_bedrijf: "Hurend bedrijf",
    eigenaar: "Eigenaar",
    nog_te_bepalen: "Nog te bepalen",
  };

  return labels[ontvanger];
}

export default async function MeldingDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
    meldingId: string;
  }>;
}) {
  const { id, meldingId } = await params;
  const woningId = Number(id);
  const meldingNummer = Number(meldingId);

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0 ||
    !Number.isInteger(meldingNummer) ||
    meldingNummer <= 0
  ) {
    notFound();
  }

  const [woning, melding] = await Promise.all([
    getWoningById(woningId),
    getMeldingById(meldingNummer),
  ]);

  if (
    !woning ||
    !melding ||
    melding.woning_id !== woningId
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
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
                Meldingsdossier
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                {melding.titel}
              </h1>

              <p className="mt-2 text-slate-600">
                {woning.adres}, {woning.postcode}{" "}
                {woning.plaats}
              </p>
            </div>

            <Link
              href={`/woningen/${woning.id}/meldingen/${melding.id}/bewerken`}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
            >
              Bewerken
            </Link>
          </div>

          <dl className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm text-slate-500">
                Melddatum
              </dt>
              <dd className="mt-1 font-semibold">
                {datum(melding.melddatum)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Status
              </dt>
              <dd className="mt-1 font-semibold">
                {statusLabel(melding.status)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Prioriteit
              </dt>
              <dd className="mt-1 font-semibold">
                {prioriteitLabel(melding.prioriteit)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Categorie
              </dt>
              <dd className="mt-1 font-semibold">
                {categorieLabel(melding.categorie)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Verantwoordelijke
              </dt>
              <dd className="mt-1 font-semibold">
                {melding.verantwoordelijke || "—"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Factuur naar
              </dt>
              <dd className="mt-1 font-semibold">
                {factuurLabel(melding.factuur_naar)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Oplosdatum
              </dt>
              <dd className="mt-1 font-semibold">
                {datum(melding.oplosdatum)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Extern referentienummer
              </dt>
              <dd className="mt-1 font-semibold">
                {melding.extern_referentienummer || "—"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Gekoppelde inspectie
              </dt>
              <dd className="mt-1 font-semibold">
                {melding.inspectie_id
                  ? `Inspectie ${melding.inspectie_id}`
                  : "Niet gekoppeld"}
              </dd>
            </div>
          </dl>

          <section className="mt-8">
            <h2 className="text-xl font-bold">
              Omschrijving
            </h2>

            <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-100 p-5">
              {melding.omschrijving}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold">
              Oplossing
            </h2>

            <p className="mt-4 whitespace-pre-wrap rounded-xl bg-emerald-50 p-5">
              {melding.oplossing ||
                "Nog geen oplossing geregistreerd."}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold">
              Interne opmerkingen
            </h2>

            <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-100 p-5">
              {melding.opmerkingen ||
                "Geen opmerkingen."}
            </p>
          </section>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <MeldingVerwijderenButton
              woningId={woning.id}
              meldingId={melding.id}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
