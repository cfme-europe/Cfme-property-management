"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateKamer } from "@/services/kamers";
import type { Kamer, KamerInvoer } from "@/types/kamer";

type Props = {
  woningId: number;
  kamers: Kamer[];
};

export default function Kamerbeheer({ woningId, kamers }: Props) {
  const router = useRouter();
  const [geselecteerdeKamer, setGeselecteerdeKamer] =
    useState<Kamer | null>(null);
  const [capaciteit, setCapaciteit] = useState("1");
  const [opmerkingen, setOpmerkingen] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  function kamerBewerken(kamer: Kamer) {
    setGeselecteerdeKamer(kamer);
    setCapaciteit(String(kamer.capaciteit));
    setOpmerkingen(kamer.opmerkingen ?? "");
    setFout("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function formulierSluiten() {
    setGeselecteerdeKamer(null);
    setCapaciteit("1");
    setOpmerkingen("");
    setFout("");
  }

  async function opslaan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!geselecteerdeKamer) {
      return;
    }

    setBezig(true);
    setFout("");

    const invoer: KamerInvoer = {
      woning_id: woningId,
      naam: geselecteerdeKamer.naam,
      verdieping: geselecteerdeKamer.verdieping,
      capaciteit: Number(capaciteit),
      actief: geselecteerdeKamer.actief,
      opmerkingen,
    };

    try {
      await updateKamer(geselecteerdeKamer.id, invoer);
      formulierSluiten();
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Kamer wijzigen mislukt.",
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-emerald-50 p-6 shadow">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
          Bezetting en capaciteit
        </p>
        <h2 className="mt-2 text-2xl font-bold">
          Bewonerskamers uit de fysieke woningroute
        </h2>
        <p className="mt-3 max-w-3xl text-slate-700">
          Slaapkamers worden aangemaakt en benoemd via de begeleide
          woningconfiguratie. Hier beheer je uitsluitend capaciteit en
          aanvullende opmerkingen. Historische kamers blijven zichtbaar.
        </p>
      </section>

      {geselecteerdeKamer && (
        <form
          onSubmit={opslaan}
          className="rounded-2xl bg-white p-6 shadow"
        >
          <h3 className="text-xl font-bold">
            {geselecteerdeKamer.naam}
          </h3>
          <p className="mt-1 text-slate-600">
            {geselecteerdeKamer.verdieping || "Geen verdieping vastgelegd"}
          </p>

          {fout && (
            <div className="mt-5 rounded-xl bg-red-100 p-4 text-red-800">
              {fout}
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-medium">
                Capaciteit
              </span>
              <input
                required
                type="number"
                min="1"
                step="1"
                value={capaciteit}
                onChange={(event) => setCapaciteit(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium">
                Opmerkingen
              </span>
              <input
                value={opmerkingen}
                onChange={(event) => setOpmerkingen(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              disabled={bezig}
              className="rounded-xl bg-emerald-700 px-6 py-3 font-medium text-white disabled:opacity-50"
            >
              {bezig ? "Opslaan..." : "Capaciteit opslaan"}
            </button>
            <button
              type="button"
              onClick={formulierSluiten}
              className="rounded-xl border px-6 py-3 font-medium"
            >
              Annuleren
            </button>
          </div>
        </form>
      )}

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold">Geregistreerde bewonerskamers</h2>

        {kamers.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-100 p-5 text-slate-600">
            Configureer eerst slaapkamers via de woningroute.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {kamers.map((kamer) => (
              <article
                key={kamer.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5"
              >
                <div>
                  <h3 className="font-bold">{kamer.naam}</h3>
                  <p className="text-sm text-slate-600">
                    {kamer.verdieping || "Geen verdieping"} · capaciteit{" "}
                    {kamer.capaciteit} ·{" "}
                    {kamer.actief ? "actief" : "historisch/inactief"}
                  </p>
                  {kamer.opmerkingen && (
                    <p className="mt-1 text-sm text-slate-600">
                      {kamer.opmerkingen}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => kamerBewerken(kamer)}
                  className="rounded-xl border px-5 py-3 font-medium"
                >
                  Capaciteit beheren
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
