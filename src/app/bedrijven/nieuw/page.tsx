import Link from "next/link";
import BedrijfForm from "@/components/bedrijven/BedrijfForm";

export default function NieuwBedrijfPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/bedrijven"
          className="mb-6 inline-block font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar bedrijven
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold">Nieuw bedrijf</h1>
          <p className="mt-2 text-slate-600">
            Registreer een nieuwe klant van CFME.
          </p>

          <div className="mt-8">
            <BedrijfForm />
          </div>
        </div>
      </div>
    </main>
  );
}
