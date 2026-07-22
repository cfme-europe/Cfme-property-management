"use client";

import { useState } from "react";
import {
  markeerRapportexportMislukt,
  startRapportexport,
  voltooiRapportexport,
} from "@/services/rapportexports-client";
import {
  objectenNaarMatrix,
  uniekeWerkbladNaam,
  type ExcelObject,
} from "@/lib/rapportages/excel";
import type {
  JsonWaarde,
  Maandrapportage,
} from "@/types/maandrapportage";

type Props = {
  rapportage: Maandrapportage;
  adres: string;
};

function alsObject(
  waarde: JsonWaarde | undefined
): ExcelObject | null {
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
): ExcelObject[] {
  if (!Array.isArray(waarde)) {
    return [];
  }

  return waarde
    .map(alsObject)
    .filter(
      (waarde): waarde is ExcelObject =>
        waarde !== null
    );
}

function veiligeBestandsnaam(
  waarde: string
): string {
  return waarde
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function werkbladRijen(
  waarde: JsonWaarde | undefined
): ExcelObject[] {
  const objecten = alsObjecten(waarde);

  if (objecten.length > 0) {
    return objecten;
  }

  const object = alsObject(waarde);

  return object ? [object] : [];
}

function voegMatrixToe(
  werkblad: {
    addRows:
      (
        rijen: (
          string |
          number |
          boolean
        )[][]
      ) => void;
    getRow:
      (nummer: number) => {
        font: {
          bold?: boolean;
        };
      };
    columns:
      Array<{
        width?: number;
      }>;
  },
  matrix: (
    string |
    number |
    boolean
  )[][]
): void {
  werkblad.addRows(matrix);

  if (matrix.length > 0) {
    werkblad.getRow(1).font = {
      bold: true,
    };
  }

  const kolomaantal = Math.max(
    ...matrix.map((rij) => rij.length),
    1
  );

  werkblad.columns =
    Array.from(
      {
        length: kolomaantal,
      },
      () => ({
        width: 24,
      })
    );
}

export default function RapportageExcelButton({
  rapportage,
  adres,
}: Props) {
  const [bezig, setBezig] =
    useState(false);
  const [fout, setFout] =
    useState("");

  async function excelMaken() {
    setBezig(true);
    setFout("");

    let exportId: number | null = null;

    try {
      if (
        !rapportage.rapport_data
          .gegenereerd_op
      ) {
        throw new Error(
          "Stel eerst de rapportgegevens samen."
        );
      }

      const bestandsnaam =
        [
          "cfme-maandrapportage",
          veiligeBestandsnaam(adres),
          rapportage.rapportjaar,
          String(
            rapportage.rapportmaand
          ).padStart(2, "0"),
        ].join("-") + ".xlsx";

      const exportRegistratie =
        await startRapportexport({
          maandrapportage_id:
            rapportage.id,
          templateversie_id:
            rapportage.templateversie_id,
          exportformaat: "xlsx",
          bestandsnaam,
          mime_type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          metadata: {
            rapportjaar:
              rapportage.rapportjaar,
            rapportmaand:
              rapportage.rapportmaand,
          },
        });

      exportId = exportRegistratie.id;

      const { Workbook } =
        await import("exceljs");

      const werkmap = new Workbook();
      werkmap.creator = "CFME Control";
      werkmap.created = new Date();

      const gebruikteNamen =
        new Set<string>();

      const overzichtWerkblad =
        werkmap.addWorksheet(
          uniekeWerkbladNaam(
            "Overzicht",
            gebruikteNamen
          )
        );

      voegMatrixToe(
        overzichtWerkblad,
        [
          ["Veld", "Waarde"],
          [
            "Rapporttitel",
            rapportage.titel,
          ],
          [
            "Rapportjaar",
            rapportage.rapportjaar,
          ],
          [
            "Rapportmaand",
            rapportage.rapportmaand,
          ],
          [
            "Status",
            rapportage.status,
          ],
          [
            "Templateversie",
            rapportage.templateversie_id ??
              "",
          ],
          [
            "Gegenereerd op",
            typeof rapportage
              .rapport_data
              .gegenereerd_op ===
              "string"
              ? rapportage
                  .rapport_data
                  .gegenereerd_op
              : "",
          ],
        ]
      );

      const data =
        rapportage.rapport_data;
      const template =
        alsObject(data.template);
      const blokken =
        Array.isArray(
          template?.blokken
        )
          ? template.blokken
          : [];

      for (
        const blokWaarde of blokken
      ) {
        const blok =
          alsObject(blokWaarde);

        if (!blok) {
          continue;
        }

        const bloktype =
          typeof blok.bloktype ===
          "string"
            ? blok.bloktype
            : "";

        const titel =
          typeof blok.titel ===
          "string"
            ? blok.titel
            : bloktype;

        const rijen =
          bloktype === "opmerkingen"
            ? [
                {
                  opmerkingen:
                    typeof data
                      .opmerkingen ===
                    "string"
                      ? data.opmerkingen
                      : rapportage
                          .opmerkingen ??
                        "",
                },
              ]
            : werkbladRijen(
                data[bloktype]
              );

        const werkblad =
          werkmap.addWorksheet(
            uniekeWerkbladNaam(
              titel || "Rapportblok",
              gebruikteNamen
            )
          );

        voegMatrixToe(
          werkblad,
          objectenNaarMatrix(rijen)
        );
      }

      const buffer =
        await werkmap.xlsx.writeBuffer();

      const blob = new Blob(
        [new Uint8Array(buffer)],
        {
          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
      );

      const downloadUrl =
        URL.createObjectURL(blob);
      const link =
        document.createElement("a");

      link.href = downloadUrl;
      link.download = bestandsnaam;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(
        downloadUrl
      );

      await voltooiRapportexport(
        exportId
      );
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
