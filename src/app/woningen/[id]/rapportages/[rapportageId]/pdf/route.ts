import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { createClient } from "@/lib/supabase/server";
import type {
  Maandrapportage,
} from "@/types/maandrapportage";
import type { Woning } from "@/types/woning";
import {
  bouwZakelijkeRapportageModel,
  zakelijkLabel,
} from "@/lib/rapportages/zakelijke-rapportage";

export const dynamic = "force-dynamic";

function veiligeBestandsnaam(waarde: string): string {
  return waarde
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function leesbareWaarde(
  waarde: unknown
): string {
  if (waarde === null) {
    return "—";
  }

  if (
    typeof waarde === "string" ||
    typeof waarde === "number"
  ) {
    return String(waarde);
  }

  if (typeof waarde === "boolean") {
    return waarde ? "Ja" : "Nee";
  }

  return JSON.stringify(waarde);
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string;
      rapportageId: string;
    }>;
  }
) {
  const preview = new URL(request.url).searchParams.get("preview") === "1";

  const { id, rapportageId } =
    await context.params;

  const woningId = Number(id);
  const rapportageNummer =
    Number(rapportageId);

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0 ||
    !Number.isInteger(rapportageNummer) ||
    rapportageNummer <= 0
  ) {
    return NextResponse.json(
      { fout: "Ongeldige rapportage." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const [
    woningResultaat,
    rapportageResultaat,
  ] = await Promise.all([
    supabase
      .from("woningen")
      .select("*")
      .eq("id", woningId)
      .maybeSingle(),
    supabase
      .from("maandrapportages")
      .select("*")
      .eq("id", rapportageNummer)
      .maybeSingle(),
  ]);

  if (woningResultaat.error) {
    throw new Error(
      `Woning ophalen mislukt: ${woningResultaat.error.message}`
    );
  }

  if (rapportageResultaat.error) {
    throw new Error(
      `Maandrapportage ophalen mislukt: ${rapportageResultaat.error.message}`
    );
  }

  const woning =
    woningResultaat.data as Woning | null;
  const rapportage =
    rapportageResultaat.data as Maandrapportage | null;

  if (
    !woning ||
    !rapportage ||
    rapportage.woning_id !== woningId
  ) {
    return NextResponse.json(
      { fout: "Rapportage niet gevonden." },
      { status: 404 }
    );
  }

  if (!rapportage.rapport_data.gegenereerd_op) {
    return NextResponse.json(
      {
        fout:
          "Stel eerst de rapportgegevens samen.",
      },
      { status: 409 }
    );
  }

  const {
    data: { user },
    error: gebruikerFout,
  } = await supabase.auth.getUser();

  if (gebruikerFout || !user) {
    return NextResponse.json(
      { fout: "Niet aangemeld." },
      { status: 401 }
    );
  }

  const bestandsnaam = [
    "cfme-maandrapportage",
    veiligeBestandsnaam(woning.adres),
    rapportage.rapportjaar,
    String(
      rapportage.rapportmaand
    ).padStart(2, "0"),
  ].join("-") + ".pdf";

  let exportRegistratie: { id: number } | null = null;

  if (!preview) {
    const { data, error: startFout } =
      await supabase
        .from("rapportexports")
        .insert({
          maandrapportage_id: rapportage.id,
          templateversie_id:
            rapportage.templateversie_id,
          exportformaat: "pdf",
          status: "aangemaakt",
          bestandsnaam,
          mime_type: "application/pdf",
          gegenereerd_door: user.id,
          metadata: {
            rapportjaar: rapportage.rapportjaar,
            rapportmaand:
              rapportage.rapportmaand,
          },
        })
        .select("id")
        .single();

    if (startFout || !data) {
      return NextResponse.json(
        {
          fout:
            `Exportregistratie starten mislukt: ${
              startFout?.message ??
              "onbekende fout"
            }`,
        },
        { status: 500 }
      );
    }

    exportRegistratie = data as { id: number };
  }

  try {
    const document = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const breedte =
      document.internal.pageSize.getWidth();
    const hoogte =
      document.internal.pageSize.getHeight();
    const marge = 16;
    const tekstBreedte =
      breedte - marge * 2;

    let y = 18;

    function nieuwePagina() {
      document.addPage();
      y = 18;
    }

    function controleerRuimte(
      benodigd: number
    ) {
      if (y + benodigd > hoogte - 18) {
        nieuwePagina();
      }
    }

    function schrijf(
      tekst: string,
      opties?: {
        grootte?: number;
        vet?: boolean;
        inspringen?: number;
        ruimteNa?: number;
      }
    ) {
      const grootte =
        opties?.grootte ?? 10;
      const inspringen =
        opties?.inspringen ?? 0;
      const ruimteNa =
        opties?.ruimteNa ?? 3;

      document.setFont(
        "helvetica",
        opties?.vet ? "bold" : "normal"
      );
      document.setFontSize(grootte);
      document.setTextColor(15, 23, 42);

      const regels =
        document.splitTextToSize(
          tekst,
          tekstBreedte - inspringen
        ) as string[];

      const regelHoogte =
        grootte * 0.45;
      const benodigd =
        regels.length * regelHoogte +
        ruimteNa;

      controleerRuimte(benodigd);

      document.text(
        regels,
        marge + inspringen,
        y
      );

      y += benodigd;
    }

    function sectie(titel: string) {
      controleerRuimte(16);
      y += 4;

      document.setFillColor(5, 150, 105);
      document.roundedRect(
        marge,
        y - 5,
        tekstBreedte,
        10,
        2,
        2,
        "F"
      );

      document.setFont(
        "helvetica",
        "bold"
      );
      document.setFontSize(12);
      document.setTextColor(
        255,
        255,
        255
      );
      document.text(
        titel,
        marge + 4,
        y + 1.5
      );

      y += 11;
    }

    document.setFillColor(6, 78, 59);
    document.rect(
      0,
      0,
      breedte,
      48,
      "F"
    );

    document.setFont(
      "helvetica",
      "bold"
    );
    document.setFontSize(22);
    document.setTextColor(
      255,
      255,
      255
    );
    document.text(
      "CFME Control",
      marge,
      18
    );

    document.setFontSize(15);
    document.text(
      rapportage.titel,
      marge,
      29
    );

    document.setFont(
      "helvetica",
      "normal"
    );
    document.setFontSize(10);
    document.text(
      `${woning.adres}, ${woning.postcode} ${woning.plaats}`,
      marge,
      38
    );

    y = 58;

    schrijf(
      `Rapportperiode: ${rapportage.rapportmaand}-${rapportage.rapportjaar}`,
      { vet: true }
    );
    schrijf(
      `Ontvanger: ${
        rapportage.ontvanger_naam ?? "—"
      }`
    );
    schrijf(
      `E-mailadres: ${
        rapportage.ontvanger_email ?? "—"
      }`
    );
    schrijf(
      `Status: ${rapportage.status}`
    );

    const model =
      bouwZakelijkeRapportageModel(
        rapportage.rapport_data,
      );

    function euro(waarde: number): string {
      return new Intl.NumberFormat("nl-NL", {
        style: "currency",
        currency: "EUR",
      }).format(waarde);
    }

    function getalTekst(
      waarde: number | null,
      decimalen = 1,
    ): string {
      if (waarde === null) return "—";

      return new Intl.NumberFormat("nl-NL", {
        maximumFractionDigits: decimalen,
      }).format(waarde);
    }

    sectie("Managementsamenvatting");
    schrijf(
      `Risicoscore: ${getalTekst(
        model.risico.score,
      )} (${zakelijkLabel(
        model.risico.classificatie,
      )})`,
      { vet: true, grootte: 12 },
    );
    schrijf(
      `Rapportperiode: ${model.huidige_periode.vanaf} tot en met ${model.huidige_periode.tot_en_met}.`,
    );
    schrijf(
      `Totale kostenindicatie: ${euro(
        model.kosten.totaal_indicatie,
      )}.`,
    );

    if (model.risico.factoren.length > 0) {
      schrijf("Belangrijkste risicofactoren:", {
        vet: true,
      });

      model.risico.factoren.forEach(
        (factor) => schrijf(`• ${factor}`, {
          inspringen: 4,
          grootte: 9,
        }),
      );
    }

    sectie("Vorige periode versus nu");

    model.vergelijking.forEach((item) => {
      schrijf(
        `${item.label}: vorig ${item.vorig}, nu ${item.huidig}, verschil ${
          item.absoluut >= 0 ? "+" : ""
        }${item.absoluut}${
          item.procentueel === null
            ? ""
            : ` (${item.procentueel >= 0 ? "+" : ""}${getalTekst(
                item.procentueel,
              )}%)`
        }.`,
        { grootte: 9 },
      );
    });

    sectie("Energie en verbruik");

    model.energie.forEach((item) => {
      schrijf(
        `${item.label}: ${getalTekst(
          item.per_persoon_per_week,
          2,
        )} ${item.eenheid} per persoon per week; vorig ${getalTekst(
          item.vorige_per_persoon_per_week,
          2,
        )} ${item.eenheid}; afwijking ${
          item.afwijking_percentage === null
            ? "niet berekenbaar"
            : `${item.afwijking_percentage >= 0 ? "+" : ""}${getalTekst(
                item.afwijking_percentage,
              )}%`
        }; signalering ${zakelijkLabel(
          item.signalering,
        )}.`,
        { grootte: 9 },
      );
    });

    sectie("Woningconditie en inspecties");

    if (model.inspecties.length === 0) {
      schrijf("Geen inspecties in deze rapportperiode.");
    } else {
      model.inspecties.forEach(
        (inspectie, index) => {
          schrijf(
            `${index + 1}. Inspectie ${
              typeof inspectie.inspectiedatum === "string"
                ? inspectie.inspectiedatum
                : "zonder datum"
            }`,
            { vet: true },
          );
          schrijf(
            `Algemene toestand: ${leesbareWaarde(
              inspectie.algemene_toestand ?? null,
            )}; orde en netheid: ${leesbareWaarde(
              inspectie.orde_netheid_score ?? null,
            )}; schade aanwezig: ${leesbareWaarde(
              inspectie.schade_aanwezig ?? false,
            )}.`,
            { inspringen: 4, grootte: 9 },
          );
        },
      );
    }

    sectie("Meldingen, schade en herstel");

    if (model.meldingen.length === 0) {
      schrijf("Geen meldingen in deze rapportperiode.");
    } else {
      model.meldingen.forEach(
        (melding, index) => {
          schrijf(
            `${index + 1}. ${
              typeof melding.titel === "string"
                ? melding.titel
                : "Melding"
            }`,
            { vet: true },
          );
          schrijf(
            `Status: ${zakelijkLabel(
              String(
                melding.status ?? "onbekend",
              ),
            )}; prioriteit: ${zakelijkLabel(
              String(
                melding.prioriteit ?? "onbekend",
              ),
            )}; factuur: ${zakelijkLabel(
              String(
                melding.factuur_naar ??
                  "nog_te_bepalen",
              ),
            )}.`,
            { inspringen: 4, grootte: 9 },
          );

          if (
            typeof melding.omschrijving === "string"
          ) {
            schrijf(melding.omschrijving, {
              inspringen: 4,
              grootte: 9,
            });
          }
        },
      );
    }

    sectie("Financieel overzicht");
    schrijf(
      `Werkelijke kosten: ${euro(
        model.kosten.werkelijk,
      )}.`,
    );
    schrijf(
      `Geschatte kosten: ${euro(
        model.kosten.geschat,
      )}.`,
    );
    schrijf(
      `Totale indicatie: ${euro(
        model.kosten.totaal_indicatie,
      )}.`,
      { vet: true },
    );

    Object.entries(
      model.kosten.per_factuurontvanger,
    ).forEach(([ontvanger, waarde]) => {
      schrijf(
        `${zakelijkLabel(ontvanger)}: ${euro(
          waarde,
        )}.`,
        { inspringen: 4, grootte: 9 },
      );
    });

    sectie("Acties en besluiten");

    model.acties.forEach((actie, index) => {
      schrijf(`${index + 1}. ${actie}`, {
        grootte: 9,
      });
    });

    if (model.opmerkingen) {
      sectie("Aanvullende opmerkingen");
      schrijf(model.opmerkingen);
    }

    const paginaAantal =
      document.getNumberOfPages();

    for (
      let pagina = 1;
      pagina <= paginaAantal;
      pagina += 1
    ) {
      document.setPage(pagina);
      document.setFont("helvetica", "normal");
      document.setFontSize(8);
      document.setTextColor(100, 116, 139);
      document.text(
        `CFME Control · Vertrouwelijk · Pagina ${pagina} van ${paginaAantal}`,
        breedte / 2,
        hoogte - 8,
        { align: "center" },
      );
    }

    const pdf =
      document.output("arraybuffer");

    if (exportRegistratie) {
      const afgerondOp =
        new Date().toISOString();

      const { error: afrondFout } =
        await supabase
          .from("rapportexports")
          .update({
            status: "gereed",
            gegenereerd_at: afgerondOp,
            foutmelding: null,
          })
          .eq(
            "id",
            exportRegistratie.id
          );

      if (afrondFout) {
        throw new Error(
          `Exportregistratie afronden mislukt: ${afrondFout.message}`
        );
      }
    }

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          `${preview ? "inline" : "attachment"}; filename="${bestandsnaam}"`,
        "Cache-Control":
          "no-store, private",
      },
    });
  } catch (error) {
    const melding =
      error instanceof Error
        ? error.message
        : "PDF genereren mislukt.";

    if (exportRegistratie) {
      await supabase
        .from("rapportexports")
        .update({
          status: "mislukt",
          foutmelding: melding,
          gegenereerd_at: null,
        })
        .eq(
          "id",
          exportRegistratie.id
        );
    }

    return NextResponse.json(
      { fout: melding },
      { status: 500 }
    );
  }
}
