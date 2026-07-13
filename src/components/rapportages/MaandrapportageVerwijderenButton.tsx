"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMaandrapportage } from "@/services/maandrapportages";

type Props = {
  woningId: number;
  rapportageId: number;
};

export default function MaandrapportageVerwijderenButton({
  woningId,
  rapportageId,
}: Props) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function verwijderen() {
    const bevestigd = window.confirm(
      "Weet je zeker dat je deze maandrapportage wilt verwijderen?"
    );

    if (!bevestigd) return;

    setBezig(true);
    setFout("");

    try {
      await deleteMaandrapportage(
        rapportageId,
        woningId
      );

      router.push(`/woningen/${woningId}`);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Maandrapportage verwijderen mislukt."
      );
      setBezig(false);
    }
  }

  return (
    <div>
      {fout && (
        <p className="mb-3 text-sm text-red-700">
          {fout}
        </p>
      )}

      <button
        type="button"
        disabled={bezig}
        onClick={verwijderen}
        className="rounded-xl bg-red-700 px-5 py-3 font-medium text-white disabled:opacity-50"
      >
        {bezig
          ? "Verwijderen..."
          : "Rapportage verwijderen"}
      </button>
    </div>
  );
}
