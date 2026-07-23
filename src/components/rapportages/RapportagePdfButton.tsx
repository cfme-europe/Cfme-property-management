"use client";

import { useState } from "react";
import type {
  Maandrapportage,
} from "@/types/maandrapportage";

type Props = {
  rapportage: Maandrapportage;
  adres: string;
  postcode: string;
  plaats: string;
};

export default function RapportagePdfButton({
  rapportage,
}: Props) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function downloaden() {
    setBezig(true);
    setFout("");

    try {
      const response = await fetch(
        `/woningen/${rapportage.woning_id}/rapportages/${rapportage.id}/pdf`,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const resultaat = await response
          .json()
          .catch(() => null);

        throw new Error(
          resultaat?.fout ??
            "PDF downloaden mislukt."
        );
      }

      const blob = await response.blob();
      const disposition =
        response.headers.get(
          "Content-Disposition"
        );

      const bestandsnaam =
        disposition?.match(
          /filename="([^"]+)"/
        )?.[1] ??
        `maandrapportage-${rapportage.id}.pdf`;

      const url = URL.createObjectURL(blob);
      const link =
        document.createElement("a");

      link.href = url;
      link.download = bestandsnaam;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(
        () => URL.revokeObjectURL(url),
        1000
      );
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "PDF downloaden mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <div>
      {fout && (
        <p className="mb-2 max-w-md text-sm text-red-700">
          {fout}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <a
          href={`/woningen/${rapportage.woning_id}/rapportages/${rapportage.id}/pdf?preview=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-slate-900 px-5 py-3 font-medium text-slate-900"
        >
          PDF bekijken
        </a>

        <button
          type="button"
          disabled={bezig}
          onClick={downloaden}
        className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white disabled:opacity-50"
      >
        {bezig
          ? "PDF downloaden..."
          : "PDF downloaden"}
        </button>
      </div>
    </div>
  );
}
