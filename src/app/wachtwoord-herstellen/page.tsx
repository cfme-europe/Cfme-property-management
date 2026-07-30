import NieuwWachtwoordForm from "@/components/auth/NieuwWachtwoordForm";

export const metadata = {
  title: "Nieuw wachtwoord | CFME Control",
};

export default function WachtwoordHerstellenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
          Complete Facility Management Europe
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          Nieuw wachtwoord instellen
        </h1>

        <p className="mt-3 text-slate-600">
          Kies een nieuw wachtwoord van minimaal twaalf tekens.
        </p>

        <NieuwWachtwoordForm />
      </section>
    </main>
  );
}
