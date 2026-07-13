export default function NieuwBedrijfPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold">Nieuw bedrijf</h1>

        <p className="mt-3 text-slate-600">
          Formulier wordt in de volgende stap aangesloten op Supabase.
        </p>

        <form className="mt-8 space-y-6">
          <input
            className="w-full rounded-lg border p-3"
            placeholder="Bedrijfsnaam"
          />

          <input
            className="w-full rounded-lg border p-3"
            placeholder="Contactpersoon"
          />

          <input
            className="w-full rounded-lg border p-3"
            placeholder="Plaats"
          />

          <button
            type="submit"
            className="rounded-xl bg-emerald-700 px-6 py-3 text-white"
          >
            Opslaan
          </button>
        </form>
      </div>
    </main>
  );
}
