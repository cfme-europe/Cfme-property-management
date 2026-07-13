"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteHuurder } from "@/services/huurders";

type Props = {
  woningId: number;
  huurderId: number;
  verhuurperiodeId: number;
  naam: string;
};

export default function HuurderVerwijderenButton({
  woningId,
  huurderId,
  verhuurperiodeId,
  naam,
}: Props) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function verwijderen() {
    const bevestigd = window.confirm(
      `Weet je zeker dat je ${naam} wilt verwijderen?`
    );

    if (!bevestigd) return;

    setBezig(true);
    setFout("");

    try {
      await deleteHuurder(huurderId, verhuurperiodeId);
      router.push(`/woningen/${woningId}`);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Huurder verwijderen mislukt."
      );
      setBezig(false);
    }
  }

  return (
    <div>
      {fout && <p className="mb-3 text-sm text-red-700">{fout}</p>}

      <button
        type="button"
        disabled={bezig}
        onClick={verwijderen}
        className="rounded-xl bg-red-700 px-5 py-3 font-medium text-white disabled:opacity-50"
      >
        {bezig ? "Verwijderen..." : "Huurder verwijderen"}
      </button>
    </div>
  );
}
