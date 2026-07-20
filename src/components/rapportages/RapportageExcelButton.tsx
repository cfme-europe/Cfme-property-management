"use client";

import { useState } from "react";
import {
  markeerRapportexportMislukt,
  startRapportexport,
  voltooiRapportexport,
} from "@/services/rapportexports-client";
import type {
  JsonWaarde,
  Maandrapportage,
} from "@/types/maandrapportage";

type Props = {
  rapportage: Maandrapportage;
  adres: string;
};

type JsonObject = Record<string, JsonWaarde>;

function alsObject(
  waarde: JsonWaarde | undefined
): JsonObject | null {
  if (
    waarde === null ||
    Array.isArray(waarde) ||
    typeof waarde !== "object"
  ) {
    return null;
  }

  return waarde;
}

function alsObjecten(
  waarde: JsonWaarde | undefined
): JsonObject[] {
  if (!Array.isArray(waarde)) {
    return [];
  }

  return waarde
    .map(alsObject)
    .filter(
      (waarde): waarde is JsonObject =>
        waarde !== null
    );
}

function veiligeBestandsnaam(waarde: string): string {
  return waarde
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function werkbladRijen(
  waarde: JsonWaarde | undefined
): JsonObject[] {
  const objecten = alsObjecten(waarde);

  if (objecten.length > 0) {
    return objecten;
  }

  const object = alsObject(waarde);

  return object ? [object] : [];
}

export default function RapportageExcelButton({
  rapportage,
  adres,
}: Props) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function excelMaken() {
    setBezig(true);
    setFout("");

    let exportId: number | null = null;

    try {
      if (!rapportage.rapport_data.gegenereerd_op) {
        throw new Error(
          "Stel eerst de rapportgegevens samen."
        );
      }

      const bestandsnaam = [
        "cfme-maandrapportage",
        veiligeBestandsnaam(adres),
        rapportage.rapportjaar,
        String(
          rapportage.rapportmaand
        ).padStart(2, "0"),
      ].join("-") + ".xlsx";

      const exportRegistratie =
        await startRapportexport({
          maandrapportage_id: rapportage.id,
          templateversie_id:
            rapportage.templateversie_id,
          exportformaat: "xlsx",
          bestandsnaam,
          mime_type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          metadata: {
            rapportjaar: rapportage.rapportjaar,
            rapportmaand:
              rapportage.rapportmaand,
          },
        });

      exportId = exportRegistratie.id;

      const XLSX = await import("xlsx");
      const werkmap = XLSX.utils.book_new();
      const data = rapportage.rapport_data;

      const overzicht = [
        {
          veld: "Rapporttitel",
          waarde: rapportage.titel,
        },
        {
          veld: "Rapportjaar",
          waarde: rapportage.rapportjaar,
        },
        {
          veld: "Rapportmaand",
          waarde: rapportage.rapportmaand,
        },
        {
          veld: "Status",
          waarde: rapportage.status,
        },
        {
          veld: "Templateversie",
          waarde: rapportage.templateversie_id,
        },
        {
          veld: "Gegenereerd op",
          waarde:
            typeof data.gegenereerd_op === "string"
              ? data.gegenereerd_op
              : "",
        },
      ];

      XLSX.utils.book_append_sheet(
        werkmap,
        XLSX.utils.json_to_sheet(overzicht),
        "Overzicht"
      );

      const template = alsObject(data.template);
      const blokken = Array.isArray(template?.blokken)
        ? template.blokken
        : [];

      for (const blokWaarde of blokken) {
        const blok = alsObject(blokWaarde);

        if (!blok) {
          continue;
        }

        const bloktype =
          typeof blok.bloktype === "string"
            ? blok.bloktype
            : "";

        const titel =
          typeof blok.titel === "string"
            ? blok.titel
            : bloktype;

        const rijen =
          bloktype === "opmerkingen"
            ? [
                {
                  opmerkingen:
                    typeof data.opmerkingen ===
                    "string"
                      ? data.opmerkingen
                      : rapportage.opmerkingen ?? "",
                },
              ]
            : werkbladRijen(data[bloktype]);

        const werkblad =
          rijen.length > 0
            ? XLSX.utils.json_to_sheet(rijen)
            : XLSX.utils.aoa_to_sheet([
                ["Geen gegevens beschikbaar"],
              ]);

        XLSX.utils.book_append_sheet(
          werkmap,
          werkblad,
          titel
            .replace(/[\\/?*[\]:]/g, " ")
            .slice(0, 31) || "Rapportblok"
        );
      }

      XLSX.writeFile(werkmap, bestandsnaam);

      await voltooiRapportexport(exportId);
    } catch (error) {
      const melding =
        error instanceof Error
          ? error.message
          : "Excel-export mislukt.";

      if (exportId !== null) {
        try {
          await markeerRapportexportMislukt(
            exportId,
            melding
          );
        } catch {
          // De oorspronkelijke exportfout blijft leidend.
        }
      }

      setFout(melding);
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
        onClick={excelMaken}
        className="rounded-xl bg-blue-700 px-5 py-3 font-medium text-white disabled:opacity-50"
      >
        {bezig
          ? "Excel genereren..."
          : "Excel exporteren"}
      </button>
    </div>
  );
}
