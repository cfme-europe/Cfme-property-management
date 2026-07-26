"use client";

import { useState } from "react";
import {
  bouwZakelijkeRapportageModel,
  type JsonObject,
} from "@/lib/rapportages/zakelijke-rapportage";
import {
  markeerRapportexportMislukt,
  startRapportexport,
  voltooiRapportexport,
} from "@/services/rapportexports-client";
import type { Maandrapportage } from "@/types/maandrapportage";

type Props = {
  rapportage: Maandrapportage;
  adres: string;
};

function veiligeBestandsnaam(
  waarde: string,
): string {
  return waarde
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function objectRijen(
  objecten: JsonObject[],
): Array<Array<string | number | boolean>> {
  if (objecten.length === 0) {
    return [["Geen gegevens beschikbaar"]];
  }

  const kolommen = Array.from(
    new Set(
      objecten.flatMap((object) =>
        Object.keys(object),
      ),
    ),
  );

  return [
    kolommen,
    ...objecten.map((object) =>
      kolommen.map((kolom) => {
        const waarde = object[kolom];

        if (
          typeof waarde === "string" ||
          typeof waarde === "number" ||
          typeof waarde === "boolean"
        ) {
          return waarde;
        }

        return waarde === null
          ? ""
          : JSON.stringify(waarde);
      }),
    ),
  ];
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
          "Stel eerst de rapportgegevens samen.",
        );
      }

      const bestandsnaam =
        [
          "cfme-maandrapportage",
          veiligeBestandsnaam(adres),
          rapportage.rapportjaar,
          String(
            rapportage.rapportmaand,
          ).padStart(2, "0"),
        ].join("-") + ".xlsx";

      const registratie =
        await startRapportexport({
          maandrapportage_id: rapportage.id,
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
            rapportdataversie:
              rapportage.rapport_data.versie ?? null,
          },
        });

      exportId = registratie.id;

      const { Workbook } =
        await import("exceljs");

      const werkmap = new Workbook();
      werkmap.creator = "CFME Control";
      werkmap.created = new Date();

      const model = bouwZakelijkeRapportageModel(
        rapportage.rapport_data,
      );

      function werkblad(
        naam: string,
        rijen: Array<
          Array<string | number | boolean>
        >,
      ) {
        const blad = werkmap.addWorksheet(naam);
        blad.addRows(rijen);

        if (rijen.length > 0) {
          blad.getRow(1).font = {
            bold: true,
          };
          blad.views = [
            {
              state: "frozen",
              ySplit: 1,
            },
          ];
        }

        const breedte = Math.max(
          ...rijen.map((rij) => rij.length),
          1,
        );

        blad.columns = Array.from(
          { length: breedte },
          () => ({ width: 26 }),
        );

        return blad;
      }

      werkblad("Management", [
        ["Veld", "Waarde"],
        ["Rapporttitel", rapportage.titel],
        ["Adres", adres],
        [
          "Periode",
          `${model.huidige_periode.vanaf} t/m ${model.huidige_periode.tot_en_met}`,
        ],
        ["Risicoscore", model.risico.score],
        [
          "Risicoclassificatie",
          model.risico.classificatie,
        ],
        [
          "Werkelijke kosten",
          model.kosten.werkelijk,
        ],
        [
          "Geschatte kosten",
          model.kosten.geschat,
        ],
        [
          "Totale indicatie",
          model.kosten.totaal_indicatie,
        ],
        [
          "Kosten definitief",
          model.kosten.definitief,
        ],
      ]);

      werkblad("Vergelijking", [
        [
          "Onderdeel",
          "Vorige periode",
          "Huidige periode",
          "Verschil",
          "Verschil %",
        ],
        ...model.vergelijking.map((item) => [
          item.label,
          item.vorig,
          item.huidig,
          item.absoluut,
          item.procentueel ?? "",
        ]),
      ]);

      werkblad("Energie", [
        [
          "Soort",
          "Eenheid",
          "Totaal",
          "Persoonsweken",
          "Nu p.p./week",
          "Vorig p.p./week",
          "Afwijking %",
          "Signalering",
        ],
        ...model.energie.map((item) => [
          item.label,
          item.eenheid,
          item.totaal ?? "",
          item.persoonsweken,
          item.per_persoon_per_week ?? "",
          item.vorige_per_persoon_per_week ?? "",
          item.afwijking_percentage ?? "",
          item.signalering,
        ]),
      ]);

      werkblad("Kosten", [
        ["Factuurontvanger", "Bedrag"],
        ...Object.entries(
          model.kosten.per_factuurontvanger,
        ).map(([ontvanger, waarde]) => [
          ontvanger,
          waarde,
        ]),
      ]);

      werkblad("Acties", [
        ["Nummer", "Actie"],
        ...model.acties.map((actie, index) => [
          index + 1,
          actie,
        ]),
      ]);

      werkblad(
        "Inspecties",
        objectRijen(model.inspecties),
      );
      werkblad(
        "Meldingen",
        objectRijen(model.meldingen),
      );
      werkblad(
        "Meterstanden",
        objectRijen(model.meterstanden),
      );

      const buffer =
        await werkmap.xlsx.writeBuffer();

      await voltooiRapportexport(exportId);

      const blob = new Blob(
        [new Uint8Array(buffer)],
        {
          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = bestandsnaam;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(
        () => URL.revokeObjectURL(url),
        1000,
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
            melding,
          );
        } catch {
          // De oorspronkelijke fout blijft leidend.
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
