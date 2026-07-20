import Link from "next/link";
import { notFound } from "next/navigation";
import CertificeringForm from "@/components/certificeringen/CertificeringForm";
import { getCertificeringById } from "@/services/certificeringen";
import { getWoningById } from "@/services/woningen-server";

type Props = {
  params: Promise<{
    id: string;
    certificeringId: string;
  }>;
};

export default async function CertificeringBewerkenPage({
  params,
}: Props) {
  const { id, certificeringId } = await params;
  const woningId = Number(id);
  const certificeringNummer = Number(
    certificeringId
  );

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0 ||
    !Number.isInteger(certificeringNummer) ||
    certificeringNummer <= 0
  ) {
    notFound();
  }

  const [woning, certificering] =
    await Promise.all([
      getWoningById(woningId),
      getCertificeringById(certificeringNummer),
    ]);

  if (
    !woning ||
    !certificering ||
    certificering.woning_id !== woning.id
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/woningen/${woning.id}`}
          className="text-emerald-700 hover:underline"
        >
          ← Terug naar woning
        </Link>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Compliance
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Certificering bewerken
          </h1>

          <p className="mt-2 text-slate-600">
            {woning.adres}, {woning.postcode}{" "}
            {woning.plaats}
          </p>

          <div className="mt-8">
            <CertificeringForm
              woningId={woning.id}
              certificering={certificering}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
