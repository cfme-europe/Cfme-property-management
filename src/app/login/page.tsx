import LoginForm from "@/components/auth/LoginForm";
import { veiligeVolgendeRoute } from "@/lib/auth/navigatie";

export const metadata = {
  title: "Inloggen | CFME Control",
};

type Props = {
  searchParams: Promise<{
    volgende?: string;
  }>;
};

export default async function LoginPage({
  searchParams,
}: Props) {
  const parameters = await searchParams;

  const volgende =
    veiligeVolgendeRoute(
      parameters.volgende
    );

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
          Complete Facility Management Europe
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          CFME Control
        </h1>

        <p className="mt-3 text-slate-600">
          Log in om het vastgoedbeheer te openen.
        </p>

        <LoginForm volgende={volgende} />
      </section>
    </main>
  );
}
