import Link from "next/link";
import Rayonbeheer from "@/components/planning/Rayonbeheer";
import {
  getActieveProfielen,
  getRayons,
} from "@/services/planning";

export const dynamic = "force-dynamic";

export default async function RayonbeheerPage() {
  const [rayons, profielen] =
    await Promise.all([
      getRayons(),
      getActieveProfielen(),
    ]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/woningen"
          className="font-medium text-blue-700 hover:underline"
        >
          ← Terug naar woningen
        </Link>

        <header className="my-6 rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Operationele planning
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Rayons beheren
          </h1>

          <p className="mt-2 text-slate-600">
            Beheer rayonindeling, standaardcontroleurs en controlefrequenties.
          </p>
        </header>

        <Rayonbeheer
          rayons={rayons}
          profielen={profielen}
        />
      </div>
    </main>
  );
}
