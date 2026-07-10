export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
          Complete Facility Management Europe
        </p>

        <h1 className="mt-2 text-4xl font-bold">CFME Control</h1>

        <p className="mt-2 text-slate-600">
          Property & Facility Management
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Woningen" value="20" />
          <Card title="Open meldingen" value="0" />
          <Card title="Inspecties" value="0" />
          <Card title="Keuringen" value="0" />
        </section>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Snelle acties</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a href="/woningen/nieuw" className="rounded-xl bg-emerald-700 px-4 py-3 text-left font-medium text-white">Woning toevoegen</a>
            <Button text="Inspectie starten" />
            <Button text="Melding toevoegen" />
            <Button text="Meterstanden invoeren" />
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function Button({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="rounded-xl bg-emerald-700 px-4 py-3 text-left font-medium text-white"
    >
      {text}
    </button>
  );
}