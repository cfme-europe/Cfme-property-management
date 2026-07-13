"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setBedrijfActief } from "@/services/bedrijven";

type Props = {
  bedrijfId: number;
  actief: boolean;
};

export default function BedrijfStatusButton({
  bedrijfId,
  actief,
}: Props) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function wijzigStatus() {
    const nieuweStatus = !actief;

    const bevestigd = window.confirm(
      nieuweStatus
        ? "Dit bedrijf opnieuw activeren?"
        : "Dit bedrijf archiveren? De historie blijft behouden."
    );

    if (!bevestigd) return;

    setBezig(true);
    setFout("");

    try {
      await setBedrijfActief(bedrijfId, nieuweStatus);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Status wijzigen mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={bezig}
        onClick={wijzigStatus}
        className={`rounded-xl px-5 py-3 font-medium text-white disabled:opacity-50 ${
          actief ? "bg-red-700" : "bg-emerald-700"
        }`}
      >
        {bezig
          ? "Bezig..."
          : actief
            ? "Bedrijf archiveren"
            : "Bedrijf activeren"}
      </button>

      {fout && (
        <p className="mt-2 text-sm text-red-700">{fout}</p>
      )}
    </div>
  );
}
