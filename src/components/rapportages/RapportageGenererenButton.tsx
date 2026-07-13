"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { genereerMaandrapportageData } from "@/services/rapportagegenerator";
import { updateMaandrapportage } from "@/services/maandrapportages";
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
      const rapportData =
        await genereerMaandrapportageData(
          rapportage
        );

      await updateMaandrapportage(
        rapportage.id,
        {
          woning_id: rapportage.woning_id,
          verhuurperiode_id:
            rapportage.verhuurperiode_id,
          rapportjaar: rapportage.rapportjaar,
          rapportmaand:
            rapportage.rapportmaand,
          titel: rapportage.titel,
          status: rapportage.status,
          ontvanger_naam:
            rapportage.ontvanger_naam,
          ontvanger_email:
            rapportage.ontvanger_email,
          opmerkingen: rapportage.opmerkingen,
          rapport_data: rapportData,
        }
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
