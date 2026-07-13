"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteInspectie } from "@/services/inspecties";

type Props = {
  woningId: number;
  inspectieId: number;
};

export default function InspectieVerwijderenButton({
  woningId,
  inspectieId,
}: Props) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function verwijderen() {
    const bevestigd = window.confirm(
      "Weet je zeker dat je deze inspectie wilt verwijderen?"
    );

    if (!bevestigd) return;

    setBezig(true);
    setFout("");

    try {
      await deleteInspectie(inspectieId, woningId);
      router.push(`/woningen/${woningId}`);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Inspectie verwijderen mislukt."
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
          : "Inspectie verwijderen"}
      </button>
    </div>
  );
}
