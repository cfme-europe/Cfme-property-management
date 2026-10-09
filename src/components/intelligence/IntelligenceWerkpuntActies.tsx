"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { handelIntelligenceWerkpuntAf } from "@/services/intelligence";
import type { IntelligenceWerkpuntAfhandelstatus } from "@/types/intelligence";

type Props = {
  werkpuntId: number;
};

export default function IntelligenceWerkpuntActies({
  werkpuntId,
}: Props) {
  const router = useRouter();
  const [notitie, setNotitie] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function afhandelen(
    status: IntelligenceWerkpuntAfhandelstatus,
  ): Promise<void> {
    setBezig(true);
    setFout("");

    try {
      await handelIntelligenceWerkpuntAf(
        werkpuntId,
        status,
        notitie,
      );
      setNotitie("");
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Werkpunt afhandelen mislukt.",
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <details className="mt-4 rounded-lg bg-slate-50 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">
        Werkpunt afhandelen
      </summary>

      <label className="mt-3 block text-sm font-medium text-slate-700">
        Wat is ermee gedaan? <span aria-hidden="true">*</span>
        <textarea
          value={notitie}
          onChange={(event) => setNotitie(event.target.value)}
          maxLength={2000}
          required
          rows={3}
          disabled={bezig}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-violet-600"
          placeholder="Bijvoorbeeld: taak gecontroleerd en uitgevoerd, of reden waarom dit punt niet relevant is."
        />
      </label>

      {fout && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {fout}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={bezig}
          onClick={() => afhandelen("opgevolgd")}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {bezig ? "Bezig…" : "Gereed / opgevolgd"}
        </button>

        <button
          type="button"
          disabled={bezig}
          onClick={() => afhandelen("genegeerd")}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50"
        >
          Niet relevant
        </button>
      </div>
    </details>
  );
}
