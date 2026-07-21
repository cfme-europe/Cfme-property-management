import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { createClient } from "@/lib/supabase/server";
import type {
  JsonWaarde,
  Maandrapportage,
} from "@/types/maandrapportage";
import type { Woning } from "@/types/woning";

export const dynamic = "force-dynamic";

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

function veiligeBestandsnaam(waarde: string): string {
  return waarde
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function leesbareWaarde(
  waarde: JsonWaarde
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
  void request;

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

  const { data: exportRegistratie, error: startFout } =
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

  if (startFout || !exportRegistratie) {
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

    const data =
      rapportage.rapport_data;
    const template =
      alsObject(data.template);

    const blokken =
      Array.isArray(template?.blokken)
        ? template.blokken
        : [];

    for (const blokWaarde of blokken) {
      const blok =
        alsObject(blokWaarde);

      if (!blok) {
        continue;
      }

      const titel =
        typeof blok.titel === "string"
          ? blok.titel
          : "Rapportonderdeel";

      const bloktype =
        typeof blok.bloktype === "string"
          ? blok.bloktype
          : "";

      sectie(titel);

      const inhoud = data[bloktype];

      if (Array.isArray(inhoud)) {
        if (inhoud.length === 0) {
          schrijf(
            "Geen gegevens beschikbaar."
          );
          continue;
        }

        inhoud.forEach(
          (item, index) => {
            const object =
              alsObject(item);

            schrijf(
              `${index + 1}.`,
              { vet: true }
            );

            if (!object) {
              schrijf(
                leesbareWaarde(item),
                { inspringen: 4 }
              );
              return;
            }

            Object.entries(object)
              .filter(
                ([, waarde]) =>
                  waarde !== null &&
                  typeof waarde !== "object"
              )
              .forEach(
                ([sleutel, waarde]) => {
                  schrijf(
                    `${sleutel.replaceAll(
                      "_",
                      " "
                    )}: ${leesbareWaarde(
                      waarde
                    )}`,
                    {
                      inspringen: 4,
                      grootte: 9,
                    }
                  );
                }
              );
          }
        );

        continue;
      }

      const object =
        alsObject(inhoud);

      if (object) {
        Object.entries(object)
          .forEach(
            ([sleutel, waarde]) => {
              schrijf(
                `${sleutel.replaceAll(
                  "_",
                  " "
                )}: ${leesbareWaarde(
                  waarde
                )}`,
                { grootte: 9 }
              );
            }
          );

        continue;
      }

      if (
        typeof inhoud === "string" &&
        inhoud
      ) {
        schrijf(inhoud);
      } else {
        schrijf(
          "Geen gegevens beschikbaar."
        );
      }
    }

    const pdf =
      document.output("arraybuffer");

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

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/octet-stream",
        "Content-Disposition":
          `attachment; filename="${bestandsnaam}"`,
        "Cache-Control":
          "no-store, private",
      },
    });
  } catch (error) {
    const melding =
      error instanceof Error
        ? error.message
        : "PDF genereren mislukt.";

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

    return NextResponse.json(
      { fout: melding },
      { status: 500 }
    );
  }
}
