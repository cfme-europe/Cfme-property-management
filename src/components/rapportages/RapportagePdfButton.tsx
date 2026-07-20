"use client";

import { useState } from "react";
import type {
  JsonWaarde,
  Maandrapportage,
} from "@/types/maandrapportage";

type Props = {
  rapportage: Maandrapportage;
  adres: string;
  postcode: string;
  plaats: string;
};

type JsonObject = Record<string, JsonWaarde>;

type TemplateblokSnapshot = {
  code: string;
  bloktype: string;
  titel: string;
  volgorde: number;
  verplicht: boolean;
};

const maanden = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

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
      (item): item is JsonObject => item !== null
    );
}

function tekst(
  object: JsonObject,
  sleutel: string,
  standaard = "—"
): string {
  const waarde = object[sleutel];

  if (
    typeof waarde === "string" ||
    typeof waarde === "number"
  ) {
    return String(waarde);
  }

  if (typeof waarde === "boolean") {
    return waarde ? "Ja" : "Nee";
  }

  return standaard;
}

function nummer(
  waarde: JsonWaarde | undefined,
  eenheid = ""
): string {
  if (typeof waarde !== "number") {
    return "—";
  }

  const resultaat = new Intl.NumberFormat("nl-NL", {
    maximumFractionDigits: 2,
  }).format(waarde);

  return eenheid
    ? `${resultaat} ${eenheid}`
    : resultaat;
}

function datum(waarde: string): string {
  if (!waarde || waarde === "—") {
    return "—";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${waarde}T00:00:00`));
}

function veiligeBestandsnaam(waarde: string): string {
  return waarde
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function templateblokken(
  data: JsonObject
): TemplateblokSnapshot[] {
  const template = alsObject(data.template);
  const blokken = template?.blokken;

  if (!Array.isArray(blokken)) {
    return [
      {
        code: "samenvatting",
        bloktype: "samenvatting",
        titel: "Samenvatting",
        volgorde: 1,
        verplicht: true,
      },
      {
        code: "bewoners",
        bloktype: "bewoners",
        titel: "Bewoners",
        volgorde: 2,
        verplicht: false,
      },
      {
        code: "inspecties",
        bloktype: "inspecties",
        titel: "Inspecties",
        volgorde: 3,
        verplicht: false,
      },
      {
        code: "meldingen",
        bloktype: "meldingen",
        titel: "Meldingen",
        volgorde: 4,
        verplicht: false,
      },
      {
        code: "meterstanden",
        bloktype: "meterstanden",
        titel: "Meterstanden",
        volgorde: 5,
        verplicht: false,
      },
      {
        code: "energieverbruik",
        bloktype: "energieverbruik",
        titel: "Energieverbruik per bewoner per week",
        volgorde: 6,
        verplicht: false,
      },
      {
        code: "opmerkingen",
        bloktype: "opmerkingen",
        titel: "Aanvullende opmerkingen",
        volgorde: 7,
        verplicht: false,
      },
    ];
  }

  return blokken
    .map(alsObject)
    .filter(
      (blok): blok is JsonObject =>
        blok !== null
    )
    .map((blok) => ({
      code: tekst(blok, "code", ""),
      bloktype: tekst(blok, "bloktype", ""),
      titel: tekst(blok, "titel", "Rapportblok"),
      volgorde: Number(blok.volgorde ?? 0),
      verplicht: blok.verplicht === true,
    }))
    .sort((a, b) => a.volgorde - b.volgorde);
}

export default function RapportagePdfButton({
  rapportage,
  adres,
  postcode,
  plaats,
}: Props) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function pdfMaken() {
    const bestaandVenster = window.open("", "_blank");

    setBezig(true);
    setFout("");

    try {
      const { jsPDF } = await import("jspdf");

      const document = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const data = rapportage.rapport_data;

      if (!data.gegenereerd_op) {
        throw new Error(
          "Stel eerst de rapportgegevens samen."
        );
      }

      const blokken = templateblokken(data);
      const paginaBreedte =
        document.internal.pageSize.getWidth();
      const paginaHoogte =
        document.internal.pageSize.getHeight();
      const marge = 16;
      const inhoudBreedte =
        paginaBreedte - marge * 2;

      let y = 18;

      function voettekst() {
        const pagina = document.getNumberOfPages();

        document.setFont("helvetica", "normal");
        document.setFontSize(8);
        document.setTextColor(100, 116, 139);

        document.text(
          "CFME Control — maandrapportage",
          marge,
          paginaHoogte - 9
        );

        document.text(
          `Pagina ${pagina}`,
          paginaBreedte - marge,
          paginaHoogte - 9,
          { align: "right" }
        );
      }

      function nieuwePagina() {
        voettekst();
        document.addPage();
        y = 18;
      }

      function controleerRuimte(
        benodigdeHoogte: number
      ) {
        if (
          y + benodigdeHoogte >
          paginaHoogte - 18
        ) {
          nieuwePagina();
        }
      }

      function regel(
        waarde: string,
        opties?: {
          grootte?: number;
          vet?: boolean;
          inspringen?: number;
          ruimteNa?: number;
        }
      ) {
        const grootte = opties?.grootte ?? 10;
        const inspringen = opties?.inspringen ?? 0;
        const ruimteNa = opties?.ruimteNa ?? 2;

        document.setFont(
          "helvetica",
          opties?.vet ? "bold" : "normal"
        );
        document.setFontSize(grootte);
        document.setTextColor(15, 23, 42);

        const regels = document.splitTextToSize(
          waarde,
          inhoudBreedte - inspringen
        ) as string[];

        const hoogte =
          regels.length * (grootte * 0.42) +
          ruimteNa;

        controleerRuimte(hoogte);

        document.text(
          regels,
          marge + inspringen,
          y
        );

        y += hoogte;
      }

      function sectieTitel(
        titel: string,
        verplicht: boolean
      ) {
        controleerRuimte(15);
        y += 4;

        document.setFillColor(5, 150, 105);
        document.roundedRect(
          marge,
          y - 5,
          inhoudBreedte,
          10,
          2,
          2,
          "F"
        );

        document.setFont("helvetica", "bold");
        document.setFontSize(12);
        document.setTextColor(255, 255, 255);
        document.text(
          verplicht ? `${titel} *` : titel,
          marge + 4,
          y + 1.5
        );

        y += 10;
      }

      function gegevensRij(
        label: string,
        waarde: string
      ) {
        controleerRuimte(8);

        document.setFont("helvetica", "bold");
        document.setFontSize(9);
        document.setTextColor(71, 85, 105);
        document.text(label, marge, y);

        document.setFont("helvetica", "normal");
        document.setTextColor(15, 23, 42);

        const regels = document.splitTextToSize(
          waarde,
          inhoudBreedte - 52
        ) as string[];

        document.text(regels, marge + 52, y);
        y += Math.max(6, regels.length * 4.2);
      }

      function toonSamenvatting() {
        const samenvatting =
          alsObject(data.samenvatting) ?? {};

        const waarden = [
          ["Bewoners", "bewoners_aantal"],
          ["Inspecties", "inspecties_aantal"],
          ["Open meldingen", "meldingen_open"],
          ["Schademeldingen", "schademeldingen_aantal"],
          ["Inspecties met schade", "inspecties_met_schade"],
          ["Opgeloste meldingen", "meldingen_opgelost"],
          ["Meteropnames", "meteropnames_aantal"],
          ["Verbruiksperiodes", "verbruiksperiodes_aantal"],
        ];

        waarden.forEach(([label, sleutel]) => {
          gegevensRij(
            label,
            nummer(samenvatting[sleutel])
          );
        });
      }

      function toonBewoners() {
        const bewoners = alsObjecten(data.bewoners);

        if (bewoners.length === 0) {
          regel("Geen bewoners geregistreerd.");
          return;
        }

        bewoners.forEach((bewoner, index) => {
          regel(
            `${index + 1}. ${tekst(
              bewoner,
              "naam"
            )}`,
            { vet: true }
          );

          regel(
            [
              `Kamer: ${tekst(bewoner, "kamer")}`,
              `Incheckdatum: ${datum(
                tekst(bewoner, "incheckdatum")
              )}`,
              `Uitcheckdatum: ${datum(
                tekst(bewoner, "uitcheckdatum")
              )}`,
              `Status: ${tekst(bewoner, "status")}`,
            ].join(" | "),
            {
              grootte: 9,
              inspringen: 4,
              ruimteNa: 4,
            }
          );
        });
      }

      function toonInspecties() {
        const inspecties =
          alsObjecten(data.inspecties);

        if (inspecties.length === 0) {
          regel(
            "Geen inspecties uitgevoerd in deze periode."
          );
          return;
        }

        inspecties.forEach((inspectie, index) => {
          regel(
            `${index + 1}. ${datum(
              tekst(inspectie, "inspectiedatum")
            )} — ${tekst(inspectie, "type")}`,
            { vet: true }
          );

          regel(
            [
              `Algemene toestand: ${tekst(
                inspectie,
                "algemene_toestand"
              )}`,
              `Orde en netheid: ${tekst(
                inspectie,
                "orde_netheid_score"
              )}/5`,
              `Schade: ${tekst(
                inspectie,
                "schade_aanwezig"
              )}`,
            ].join(" | "),
            {
              grootte: 9,
              inspringen: 4,
            }
          );

          regel(
            `Schadeomschrijving: ${tekst(
              inspectie,
              "schade_omschrijving"
            )}`,
            {
              grootte: 9,
              inspringen: 4,
            }
          );

          regel(
            `Opmerkingen: ${tekst(
              inspectie,
              "opmerkingen",
              "Geen opmerkingen"
            )}`,
            {
              grootte: 9,
              inspringen: 4,
              ruimteNa: 4,
            }
          );
        });
      }

      function toonMeldingen() {
        const meldingen = alsObjecten(data.meldingen);

        if (meldingen.length === 0) {
          regel(
            "Geen meldingen in deze rapportperiode."
          );
          return;
        }

        meldingen.forEach((melding, index) => {
          regel(
            `${index + 1}. ${tekst(
              melding,
              "titel"
            )}`,
            { vet: true }
          );

          regel(
            [
              `Datum: ${datum(
                tekst(melding, "melddatum")
              )}`,
              `Categorie: ${tekst(
                melding,
                "categorie"
              )}`,
              `Prioriteit: ${tekst(
                melding,
                "prioriteit"
              )}`,
              `Status: ${tekst(
                melding,
                "status"
              )}`,
            ].join(" | "),
            {
              grootte: 9,
              inspringen: 4,
            }
          );

          regel(
            `Omschrijving: ${tekst(
              melding,
              "omschrijving"
            )}`,
            {
              grootte: 9,
              inspringen: 4,
            }
          );

          regel(
            [
              `Oplossing: ${tekst(
                melding,
                "oplossing",
                "Nog niet opgelost"
              )}`,
              `Factuur naar: ${tekst(
                melding,
                "factuur_naar",
                "Nog te bepalen"
              )}`,
            ].join(" | "),
            {
              grootte: 9,
              inspringen: 4,
              ruimteNa: 4,
            }
          );
        });
      }

      function toonMeterstanden() {
        const meterstanden =
          alsObjecten(data.meterstanden);

        if (meterstanden.length === 0) {
          regel(
            "Geen meteropnames in deze rapportperiode."
          );
          return;
        }

        meterstanden.forEach(
          (meterstand, index) => {
            regel(
              `${index + 1}. ${datum(
                tekst(meterstand, "opnamedatum")
              )}`,
              { vet: true }
            );

            regel(
              [
                `Bewoners: ${tekst(
                  meterstand,
                  "bewoners_aantal"
                )}`,
                `Elektriciteit: ${nummer(
                  meterstand.elektriciteit_kwh,
                  "kWh"
                )}`,
                `Gas: ${nummer(
                  meterstand.gas_m3,
                  "m³"
                )}`,
                `Water: ${nummer(
                  meterstand.water_m3,
                  "m³"
                )}`,
              ].join(" | "),
              {
                grootte: 9,
                inspringen: 4,
                ruimteNa: 4,
              }
            );
          }
        );
      }

      function toonEnergieverbruik() {
        const energieverbruik =
          alsObjecten(data.energieverbruik);

        if (energieverbruik.length === 0) {
          regel(
            "Geen volledige verbruiksperiode beschikbaar."
          );
          return;
        }

        energieverbruik.forEach(
          (verbruik, index) => {
            regel(
              `${index + 1}. ${datum(
                tekst(verbruik, "van_datum")
              )} – ${datum(
                tekst(verbruik, "tot_datum")
              )}`,
              { vet: true }
            );

            regel(
              [
                `Elektriciteit: ${nummer(
                  verbruik.elektriciteit_per_bewoner_per_week,
                  "kWh"
                )}`,
                `Gas: ${nummer(
                  verbruik.gas_per_bewoner_per_week,
                  "m³"
                )}`,
                `Water: ${nummer(
                  verbruik.water_per_bewoner_per_week,
                  "m³"
                )}`,
              ].join(" | "),
              {
                grootte: 9,
                inspringen: 4,
                ruimteNa: 4,
              }
            );
          }
        );
      }

      function toonVrijeTekst(
        blok: TemplateblokSnapshot
      ) {
        const waarde = data[blok.code];

        if (typeof waarde === "string" && waarde) {
          regel(waarde);
          return;
        }

        regel("Geen inhoud beschikbaar.");
      }

      document.setFillColor(6, 78, 59);
      document.rect(
        0,
        0,
        paginaBreedte,
        48,
        "F"
      );

      document.setFont("helvetica", "bold");
      document.setFontSize(22);
      document.setTextColor(255, 255, 255);
      document.text("CFME Control", marge, 18);

      document.setFontSize(15);
      document.text(rapportage.titel, marge, 29);

      document.setFont("helvetica", "normal");
      document.setFontSize(10);
      document.text(
        `${adres}, ${postcode} ${plaats}`,
        marge,
        38
      );

      y = 58;

      gegevensRij(
        "Rapportperiode",
        `${maanden[rapportage.rapportmaand - 1]} ${
          rapportage.rapportjaar
        }`
      );
      gegevensRij(
        "Ontvanger",
        rapportage.ontvanger_naam ?? "—"
      );
      gegevensRij(
        "E-mailadres",
        rapportage.ontvanger_email ?? "—"
      );
      gegevensRij("Status", rapportage.status);

      for (const blok of blokken) {
        sectieTitel(blok.titel, blok.verplicht);

        switch (blok.bloktype) {
          case "samenvatting":
            toonSamenvatting();
            break;
          case "bewoners":
            toonBewoners();
            break;
          case "inspecties":
            toonInspecties();
            break;
          case "meldingen":
            toonMeldingen();
            break;
          case "meterstanden":
            toonMeterstanden();
            break;
          case "energieverbruik":
            toonEnergieverbruik();
            break;
          case "opmerkingen":
            regel(
              typeof data.opmerkingen === "string"
                ? data.opmerkingen
                : rapportage.opmerkingen ??
                    "Geen aanvullende opmerkingen."
            );
            break;
          default:
            toonVrijeTekst(blok);
        }
      }

      voettekst();

      const bestandsnaam = [
        "cfme-maandrapportage",
        veiligeBestandsnaam(adres),
        rapportage.rapportjaar,
        String(
          rapportage.rapportmaand
        ).padStart(2, "0"),
      ].join("-");

      const pdfUrl = document.output("bloburl");

      if (bestaandVenster) {
        bestaandVenster.location.href =
          pdfUrl.toString();
      } else {
        const link =
          window.document.createElement("a");

        link.href = pdfUrl.toString();
        link.download = `${bestandsnaam}.pdf`;
        link.click();
      }
    } catch (error) {
      bestaandVenster?.close();

      setFout(
        error instanceof Error
          ? error.message
          : "PDF genereren mislukt."
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
        onClick={pdfMaken}
        className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white disabled:opacity-50"
      >
        {bezig
          ? "PDF genereren..."
          : "PDF openen"}
      </button>
    </div>
  );
}
