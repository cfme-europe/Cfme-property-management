export default function NieuweWoningPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">Nieuwe woning toevoegen</h1>
        <p className="mt-2 text-slate-600">
          Vul hieronder de woninggegevens in.
        </p>

        <form className="mt-8 grid gap-5">
          <label className="grid gap-2">
            <span className="font-medium">Adres</span>
            <input className="rounded-xl border border-slate-300 px-4 py-3" />
          </label>

          <label className="grid gap-2">
            <span className="font-medium">Postcode</span>
            <input className="rounded-xl border border-slate-300 px-4 py-3" />
          </label>

          <label className="grid gap-2">
            <span className="font-medium">Plaats</span>
            <input className="rounded-xl border border-slate-300 px-4 py-3" />
          </label>

          <button
            className="rounded-xl bg-emerald-700 px-4 py-3 font-medium text-white"
            type="submit"
          >
            Woning opslaan
          </button>
        </form>
      </div>
    </main>
  );
}
