"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { beeindigVerhuurperiode } from "@/services/verhuurperiodes";

type Props = {
  woningId: number;
  verhuurperiodeId: number;
  startdatum: string;
};

export default function VerhuurperiodeBeeindigenForm({
  woningId,
  verhuurperiodeId,
  startdatum,
}: Props) {
  const router = useRouter();

  const [opzegdatum, setOpzegdatum] = useState("");
  const [werkelijkeEinddatum, setWerkelijkeEinddatum] = useState("");
  const [opleverdatum, setOpleverdatum] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function opslaan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBezig(true);
    setFout("");

    try {
      await beeindigVerhuurperiode({
        verhuurperiode_id: verhuurperiodeId,
        woning_id: woningId,
        opzegdatum,
        werkelijke_einddatum: werkelijkeEinddatum,
        opleverdatum,
      });

      router.push(`/woningen/${woningId}`);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Verhuurperiode beëindigen mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  const invoerClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600";

  return (
    <form onSubmit={opslaan} className="space-y-6">
      {fout && (
        <div className="rounded-xl bg-red-100 p-4 text-red-800">
          {fout}
        </div>
      )}

      <div className="rounded-xl bg-amber-50 p-4 text-amber-900">
        Na bevestiging wordt deze verhuurperiode definitief als beëindigd
        geregistreerd. Daarna kan voor de woning een nieuwe verhuurperiode
        worden gestart.
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label>
          <span className="mb-1 block text-sm font-medium">
            Opzegdatum *
          </span>
          <input
            required
            min={startdatum}
            type="date"
            value={opzegdatum}
            onChange={(event) => setOpzegdatum(event.target.value)}
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Werkelijke einddatum *
          </span>
          <input
            required
            min={opzegdatum || startdatum}
            type="date"
            value={werkelijkeEinddatum}
            onChange={(event) =>
              setWerkelijkeEinddatum(event.target.value)
            }
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Opleverdatum *
          </span>
          <input
            required
            min={werkelijkeEinddatum || opzegdatum || startdatum}
            type="date"
            value={opleverdatum}
            onChange={(event) => setOpleverdatum(event.target.value)}
            className={invoerClass}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          disabled={bezig}
          className="rounded-xl bg-red-700 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {bezig ? "Beëindigen..." : "Verhuurperiode beëindigen"}
        </button>

        <button
          type="button"
          onClick={() => router.push(`/woningen/${woningId}`)}
          className="rounded-xl border border-slate-300 px-6 py-3 font-medium"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
