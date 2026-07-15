"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { verhuisBewoner } from "@/services/bewoners";
import type { Kamer } from "@/types/kamer";

type Props = {
  bewonerId: number;
  verhuurperiodeId: number;
  huidigeKamerId: number | null;
  kamers: Kamer[];
  naam: string;
};

export default function BewonerVerhuizenButton({
  bewonerId,
  verhuurperiodeId,
  huidigeKamerId,
  kamers,
  naam,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [nieuweKamerId, setNieuweKamerId] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const beschikbareKamers = useMemo(
    () =>
      kamers
        .filter(
          (kamer) =>
            kamer.actief &&
            kamer.id !== huidigeKamerId
        )
        .sort((a, b) => a.naam.localeCompare(b.naam)),
    [kamers, huidigeKamerId]
  );

  function sluiten() {
    if (bezig) return;

    setOpen(false);
    setNieuweKamerId("");
    setFout("");
  }

  async function verhuizen() {
    const gekozenKamerId = Number(nieuweKamerId);

    if (!Number.isInteger(gekozenKamerId) || gekozenKamerId <= 0) {
      setFout("Selecteer eerst een nieuwe kamer.");
      return;
    }

    setBezig(true);
    setFout("");

    try {
      await verhuisBewoner(
        bewonerId,
        verhuurperiodeId,
        gekozenKamerId
      );

      setOpen(false);
      setNieuweKamerId("");
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Bewoner verhuizen mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFout("");
          setOpen(true);
        }}
        disabled={beschikbareKamers.length === 0}
        className="rounded-xl bg-amber-600 px-5 py-3 font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Verhuizen
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bewoner-verhuizen-titel"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2
              id="bewoner-verhuizen-titel"
              className="text-xl font-bold text-slate-900"
            >
              Bewoner verhuizen
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Selecteer de nieuwe kamer voor {naam}.
            </p>

            <label
              htmlFor="nieuwe-kamer"
              className="mt-6 block text-sm font-medium text-slate-700"
            >
              Nieuwe kamer
            </label>

            <select
              id="nieuwe-kamer"
              value={nieuweKamerId}
              onChange={(event) => {
                setNieuweKamerId(event.target.value);
                setFout("");
              }}
              disabled={bezig}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
            >
              <option value="">Selecteer een kamer</option>

              {beschikbareKamers.map((kamer) => (
                <option key={kamer.id} value={kamer.id}>
                  {kamer.naam} — capaciteit {kamer.capaciteit}
                </option>
              ))}
            </select>

            {fout && (
              <p
                className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
                role="alert"
              >
                {fout}
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={sluiten}
                disabled={bezig}
                className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700 disabled:opacity-50"
              >
                Annuleren
              </button>

              <button
                type="button"
                onClick={verhuizen}
                disabled={bezig || !nieuweKamerId}
                className="rounded-xl bg-amber-600 px-5 py-3 font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bezig ? "Verhuizen..." : "Verhuizen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
