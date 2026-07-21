"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rapportageSamenstellen } from "@/app/woningen/[id]/rapportages/actions";
import type { Maandrapportage } from "@/types/maandrapportage";

type Props = {
  rapportage: Maandrapportage;
};

export default function RapportageGenererenButton({
  rapportage,
}: Props) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function genereren() {
    setBezig(true);
    setFout("");

    try {
      await rapportageSamenstellen(
        rapportage.id
      );

      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Rapportgegevens genereren mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <div>
      {fout && (
        <p className="mb-3 max-w-md text-sm text-red-700">
          {fout}
        </p>
      )}

      <button
        type="button"
        disabled={bezig}
        onClick={genereren}
        className="rounded-xl border border-emerald-700 px-5 py-3 font-medium text-emerald-700 disabled:opacity-50"
      >
        {bezig
          ? "Rapport samenstellen..."
          : "Rapport samenstellen"}
      </button>
    </div>
  );
}
