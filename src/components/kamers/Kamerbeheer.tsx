"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createKamer,
  deleteKamer,
  updateKamer,
} from "@/services/kamers";
import type { Kamer, KamerInvoer } from "@/types/kamer";

type Props = {
  woningId: number;
  kamers: Kamer[];
};

export default function Kamerbeheer({ woningId, kamers }: Props) {
  const router = useRouter();

  const [geselecteerdeKamer, setGeselecteerdeKamer] =
    useState<Kamer | null>(null);
  const [naam, setNaam] = useState("");
  const [verdieping, setVerdieping] = useState("");
  const [capaciteit, setCapaciteit] = useState("1");
  const [actief, setActief] = useState(true);
  const [opmerkingen, setOpmerkingen] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const invoerClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600";

  function formulierLegen() {
    setGeselecteerdeKamer(null);
    setNaam("");
    setVerdieping("");
    setCapaciteit("1");
    setActief(true);
    setOpmerkingen("");
    setFout("");
  }

  function kamerBewerken(kamer: Kamer) {
    setGeselecteerdeKamer(kamer);
    setNaam(kamer.naam);
    setVerdieping(kamer.verdieping ?? "");
    setCapaciteit(String(kamer.capaciteit));
    setActief(kamer.actief);
    setOpmerkingen(kamer.opmerkingen ?? "");
    setFout("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function opslaan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBezig(true);
    setFout("");

    const invoer: KamerInvoer = {
      woning_id: woningId,
      naam,
      verdieping,
      capaciteit: Number(capaciteit),
      actief,
      opmerkingen,
    };

    try {
      if (geselecteerdeKamer) {
        await updateKamer(geselecteerdeKamer.id, invoer);
      } else {
        await createKamer(invoer);
      }

      formulierLegen();
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Kamer opslaan mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  async function verwijderen(kamer: Kamer) {
    const bevestigd = window.confirm(
      `Weet je zeker dat je kamer "${kamer.naam}" wilt verwijderen?`
    );

    if (!bevestigd) return;

    setBezig(true);
    setFout("");

    try {
      await deleteKamer(kamer.id, woningId);

      if (geselecteerdeKamer?.id === kamer.id) {
        formulierLegen();
      }

      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Kamer verwijderen mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={opslaan}
        className="rounded-2xl bg-white p-6 shadow"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Kamerbeheer
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            {geselecteerdeKamer
              ? "Kamer bewerken"
              : "Nieuwe kamer toevoegen"}
          </h2>
        </div>

        {fout && (
          <div className="mt-5 rounded-xl bg-red-100 p-4 text-red-800">
            {fout}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label>
            <span className="mb-1 block text-sm font-medium">
              Kamernaam *
            </span>

            <input
              required
              value={naam}
              onChange={(event) => setNaam(event.target.value)}
              className={invoerClass}
              placeholder="Bijvoorbeeld Kamer 1"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Verdieping
            </span>

            <input
              value={verdieping}
              onChange={(event) => setVerdieping(event.target.value)}
              className={invoerClass}
              placeholder="Bijvoorbeeld eerste verdieping"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Capaciteit *
            </span>

            <input
              required
              type="number"
              min="1"
              step="1"
              value={capaciteit}
              onChange={(event) => setCapaciteit(event.target.value)}
              className={invoerClass}
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium">
            Opmerkingen
          </span>

          <textarea
            rows={4}
            value={opmerkingen}
            onChange={(event) => setOpmerkingen(event.target.value)}
            className={invoerClass}
          />
        </label>

        <label className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            checked={actief}
            onChange={(event) => setActief(event.target.checked)}
            className="h-5 w-5"
          />

          <span className="font-medium">Kamer is actief</span>
        </label>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            disabled={bezig}
            className="rounded-xl bg-emerald-700 px-6 py-3 font-medium text-white disabled:opacity-50"
          >
            {bezig
              ? "Opslaan..."
              : geselecteerdeKamer
                ? "Wijzigingen opslaan"
                : "Kamer toevoegen"}
          </button>

          {geselecteerdeKamer && (
            <button
              type="button"
              onClick={formulierLegen}
              className="rounded-xl border border-slate-300 px-6 py-3 font-medium"
            >
              Annuleren
            </button>
          )}
        </div>
      </form>

      <section className="rounded-2xl bg-white p-6 shadow">
        <div>
          <h2 className="text-xl font-bold">Geregistreerde kamers</h2>

          <p className="mt-1 text-slate-600">
            Beheer de kamers en maximale bezetting van deze woning.
          </p>
        </div>

        {kamers.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-100 p-5 text-slate-600">
            Nog geen kamers geregistreerd.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="border-b bg-slate-100">
                <tr>
                  <th className="p-4 text-left">Kamer</th>
                  <th className="p-4 text-left">Verdieping</th>
                  <th className="p-4 text-left">Capaciteit</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-right">Acties</th>
                </tr>
              </thead>

              <tbody>
                {kamers.map((kamer) => (
                  <tr
                    key={kamer.id}
                    className="border-b border-slate-200 last:border-0"
                  >
                    <td className="p-4">
                      <p className="font-semibold">{kamer.naam}</p>

                      {kamer.opmerkingen && (
                        <p className="mt-1 max-w-md text-sm text-slate-600">
                          {kamer.opmerkingen}
                        </p>
                      )}
                    </td>

                    <td className="p-4">
                      {kamer.verdieping || "—"}
                    </td>

                    <td className="p-4">{kamer.capaciteit}</td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          kamer.actief
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {kamer.actief ? "Actief" : "Inactief"}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => kamerBewerken(kamer)}
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
                        >
                          Bewerken
                        </button>

                        <button
                          type="button"
                          disabled={bezig}
                          onClick={() => verwijderen(kamer)}
                          className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          Verwijderen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
