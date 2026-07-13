'use client';

import { useState } from 'react';

export default function NieuweWoningPage() {
  const [adres, setAdres] = useState('');
  const [postcode, setPostcode] = useState('');
  const [plaats, setPlaats] = useState('');

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();

    const response = await fetch('/api/woningen', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        adres,
        postcode,
        plaats,
      }),
    });

    if (response.ok) {
      alert('Woning succesvol opgeslagen!');
      setAdres('');
      setPostcode('');
      setPlaats('');
    } else {
      alert('Er is iets fout gegaan.');
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">
  Nieuwe woning toevoegen
</h1>
        <p className="mt-2 text-slate-600">
          Vul hieronder de woninggegevens in.
        </p>

        <form onSubmit={opslaan} className="mt-8 grid gap-5">

          <label className="grid gap-2">
            <span className="font-medium text-slate-900">Adres</span>
            <input
              value={adres}
              onChange={(e) => setAdres(e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-500"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-medium text-slate-900">Postcode</span>
            <input
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-500"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-medium text-slate-900">Plaats</span>
            <input
              value={plaats}
              onChange={(e) => setPlaats(e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-500"
            />
          </label>

          <button
            type="submit"
            className="rounded-xl bg-emerald-700 px-4 py-3 font-medium text-white"
          >
            Woning opslaan
          </button>

        </form>
      </div>
    </main>
  );
}