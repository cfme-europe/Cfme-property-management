import WachtwoordVergetenForm from "@/components/auth/WachtwoordVergetenForm";

export const metadata = {
  title: "Wachtwoord herstellen | CFME Control",
};

export default function WachtwoordVergetenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
          Complete Facility Management Europe
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          Wachtwoord herstellen
        </h1>

        <p className="mt-3 text-slate-600">
          Vul je e-mailadres in. Je ontvangt een veilige link waarmee je een nieuw wachtwoord kunt instellen.
        </p>

        <WachtwoordVergetenForm />

        <a
          href="/login"
          className="mt-6 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-600"
        >
          Terug naar inloggen
        </a>
      </section>
    </main>
  );
}
