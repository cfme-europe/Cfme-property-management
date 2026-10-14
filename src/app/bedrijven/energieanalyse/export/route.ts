import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import {
  bouwAnoniemeEnergieDataset,
  bouwEnergieMaandAnalyse,
  decodeerEnergieAnoniemeSelectie,
  ENERGIE_ANONIEME_SELECTIE_COOKIE,
  leesEnergieMaandSelectie,
  maximumEnergieMaandwaarde,
  waardeEnergieMaand,
  type EnergieMaandParameters,
} from "@/lib/energie/maand-analyse";
import { ENERGIE_REKENREGELS } from "@/lib/energie/rekenregels";
import { beoordeelMaatregel } from "@/lib/energie/resultaten";
import {
  bouwEnergiePortfolioAnalyse,
  type Energiedrager,
} from "@/lib/energie/portfolio-analyse";
import {
  getEnergieAnalyseBrondata,
  getEnergieUitbreiding,
  type EnergieMaatregel,
  energieClient,
} from "@/services/energieanalyse-server";

export const dynamic = "force-dynamic";

const productLabel: Record<string, string> = {
  elektriciteit: "Elektriciteit totaal",
  dagstroom: "Dagstroom",
  nachtstroom: "Nachtstroom",
  gas: "Gas",
  water: "Water",
};
const kleuren = [
  [15, 118, 110],
  [37, 99, 235],
  [124, 58, 237],
  [194, 65, 12],
  [190, 18, 60],
  [77, 124, 15],
  [3, 105, 161],
  [162, 28, 175],
  [180, 83, 9],
  [67, 56, 202],
  [4, 120, 87],
  [159, 18, 57],
] as const;

function readParameters(params: URLSearchParams): EnergieMaandParameters {
  const result: EnergieMaandParameters = {};
  params.forEach((value, key) => {
    const existing = result[key];
    result[key] =
      existing === undefined
        ? value
        : Array.isArray(existing)
          ? [...existing, value]
          : [existing, value];
  });
  return result;
}

function formatted(value: number | null, digits = 2) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("nl-NL", {
        maximumFractionDigits: digits,
      }).format(value);
}

function currency(value: number | null, code: string | null) {
  if (value === null || !code) return null;
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 2,
  }).format(value);
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("nl-NL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function filename(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 64);
}

function selectedMeasures(
  measures: EnergieMaatregel[],
  woningId: number,
  product: string,
) {
  const superseded = new Set(measures.map((measure) => measure.voorganger_id));
  return measures.filter(
    (measure) =>
      !superseded.has(measure.id) &&
      measure.woning_id === woningId &&
      measure.product === product &&
      measure.klant_goedgekeurd,
  );
}

function getMeasureResult(
  measure: EnergieMaatregel,
  bron: Awaited<ReturnType<typeof getEnergieAnalyseBrondata>>,
): string {
  if (!measure.controle_vanaf || !measure.controle_tot)
    return "Nameting nog niet geregistreerd.";
  const analyse = (from: string, to: string) =>
    bouwEnergiePortfolioAnalyse(bron, {
      niveau: "woning",
      woningId: measure.woning_id,
      drager: measure.product as Energiedrager,
      vanaf: from,
      totEnMet: to,
      archief: true,
    }).rijen[0];
  const result = beoordeelMaatregel(
    analyse(measure.referentie_vanaf, measure.referentie_tot),
    analyse(measure.controle_vanaf, measure.controle_tot),
    { vanaf: measure.referentie_vanaf, tot: measure.referentie_tot },
    { vanaf: measure.controle_vanaf, tot: measure.controle_tot },
  );
  return result.verschil_per_persoon_per_week === null
    ? `Nameting niet vergelijkbaar: ${result.redenen.join("; ")}.`
    : `Gemeten verschil ${formatted(result.verschil_per_persoon_per_week)} ${
        ["elektriciteit", "dagstroom", "nachtstroom"].includes(measure.product)
          ? "kWh"
          : "m³"
      } per persoon/week. ${result.conclusie}`;
}

function addMeasuresPage(
  document: jsPDF,
  title: string,
  measures: Array<{ measure: EnergieMaatregel; result: string }>,
) {
  if (!measures.length) return;
  document.addPage();
  const pageWidth = document.internal.pageSize.getWidth();
  let y = 18;
  document.setTextColor(4, 120, 87);
  document.setFont("helvetica", "bold");
  document.setFontSize(9);
  document.text("CFME CONTROL", 15, y);
  y += 9;
  document.setTextColor(15, 23, 42);
  document.setFontSize(15);
  document.text("Aandachtspunten, maatregelen en nameting", 15, y);
  y += 8;
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.text(title, 15, y);
  y += 9;
  for (const { measure, result } of measures) {
    const lines = document.splitTextToSize(
      `${measure.titel} · ${measure.status}${measure.uitvoerdatum ? ` · ${measure.uitvoerdatum}` : ""}`,
      pageWidth - 30,
    ) as string[];
    if (y + lines.length * 5 + 8 > 282) {
      document.addPage();
      y = 18;
    }
    document.setTextColor(15, 23, 42);
    document.setFont("helvetica", "bold");
    document.text(lines, 15, y);
    y += lines.length * 5 + 5;
    if (measure.klant_toelichting.trim()) {
      const customerNote = document.splitTextToSize(
        measure.klant_toelichting,
        pageWidth - 30,
      ) as string[];
      document.setFont("helvetica", "normal");
      document.setFontSize(8);
      document.setTextColor(51, 65, 85);
      document.text(customerNote, 15, y);
      y += customerNote.length * 4 + 4;
    }
    const wrapped = document.splitTextToSize(result, pageWidth - 30) as string[];
    document.setFont("helvetica", "normal");
    document.setFontSize(8);
    document.setTextColor(71, 85, 105);
    document.text(wrapped, 15, y);
    y += wrapped.length * 4 + 4;
  }
  document.setFont("helvetica", "normal");
  document.setFontSize(7);
  document.setTextColor(71, 85, 105);
  document.text(
    "Een benchmarkafwijking is geen bewezen besparing; lagere kosten kunnen mede door tariefwijzigingen ontstaan.",
    15,
    286,
  );
}

async function maakEnergiePdf(parameters: EnergieMaandParameters) {
  try {
    await energieClient();
  } catch {
    return NextResponse.json(
      { fout: "Aanmelden en toegangscontrole zijn vereist voor deze export." },
      { status: 401 },
    );
  }
  const [bron, uitbreiding] = await Promise.all([
    getEnergieAnalyseBrondata(),
    getEnergieUitbreiding(),
  ]);
  bron.meterconfiguraties = uitbreiding.configuraties;
  let parsed: ReturnType<typeof leesEnergieMaandSelectie>;
  try {
    parsed = leesEnergieMaandSelectie(parameters, bron);
  } catch (cause) {
    return NextResponse.json(
      {
        fout:
          cause instanceof Error
            ? cause.message
            : "Ongeldige selectie voor energie-export.",
      },
      { status: 400 },
    );
  }
  if (parsed.weergave !== "klant" && parsed.weergave !== "anoniem")
    return NextResponse.json(
      { fout: "Alleen klant- en anonieme weergaven kunnen als PDF worden geëxporteerd." },
      { status: 400 },
    );
    const analyse = bouwEnergieMaandAnalyse(
      bron,
      uitbreiding.tarieven,
      parsed.selectie,
    );
    const anonymous = parsed.weergave === "anoniem";
    const anonymized = anonymous ? bouwAnoniemeEnergieDataset(analyse) : null;
    const company =
      anonymous
        ? null
        : bron.bedrijven.find(
            (item) => item.id === analyse.selectie.bedrijfIds[0],
          );
    const document = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = document.internal.pageSize.getWidth();
    const pageHeight = document.internal.pageSize.getHeight();
    const margin = 15;
    const barWidth = 74;
    const selectedMonths = analyse.selectie.maanden;
    const measureLabel =
      analyse.selectie.maat === "verbruik" ? "Verbruik" : "Kosten";
    const aggregationLabel =
      analyse.selectie.aggregatie === "persoon"
        ? "Per persoon/week"
        : "Totaal pand per maand";
    const referenceLabel = monthLabel(analyse.selectie.referentiemaand);
    const reportScope =
      `${selectedMonths.map(monthLabel).join(" · ")} · ` +
      `${productLabel[analyse.selectie.drager]} · ${measureLabel} · ` +
      `${aggregationLabel} · Gesorteerd op ${referenceLabel} · geselecteerde selectie`;
    const maximum = maximumEnergieMaandwaarde(
      analyse.woningen,
      analyse.selectie.maat,
      analyse.selectie.aggregatie,
    );
    const customerName = company?.naam ?? "Geselecteerde portefeuille";
    const safeReportName = anonymous
      ? "cfme-anonieme-energiepresentatie"
      : `cfme-energie-${filename(customerName) || "klant"}`;

    document.setProperties({
      title: anonymous
        ? "CFME anonieme energiepresentatie"
        : `CFME energieanalyse - ${customerName}`,
      subject: `${reportScope} · rekenregels ${ENERGIE_REKENREGELS}`,
      author: "CFME Control",
      keywords: `CFME, energie, ${ENERGIE_REKENREGELS}`,
    });

    const buildings = anonymous
      ? anonymized!.woningen.map((home, index) => ({
          label: `${home.klant} · ${home.pand}`,
          months: analyse.woningen[index].maanden,
          sourceId: undefined,
        }))
      : analyse.woningen.map((home) => ({
          label: home.adres,
          months: home.maanden,
          sourceId: home.id,
        }));

    buildings.forEach((home, index) => {
      if (index > 0) document.addPage();
      let y = 15;
      document.setFont("helvetica", "normal");
      document.setFontSize(6);
      const selectedPeriodLabel = document.splitTextToSize(
        reportScope,
        pageWidth - margin * 2,
      ) as string[];
      const headerHeight = Math.max(
        39,
        32 + selectedPeriodLabel.length * 3.2 + 7,
      );
      document.setFillColor(15, 23, 42);
      document.rect(0, 0, pageWidth, headerHeight, "F");
      document.setFont("helvetica", "bold");
      document.setFontSize(8);
      document.setTextColor(110, 231, 183);
      document.text("CFME CONTROL", margin, y);
      y += 9;
      document.setFontSize(16);
      document.setTextColor(255, 255, 255);
      document.text(
        anonymous ? "Anonieme energiepresentatie" : "Energieanalyse voor de klant",
        margin,
        y,
      );
      y += 8;
      document.setFont("helvetica", "normal");
      document.setFontSize(7);
      document.setTextColor(226, 232, 240);
      document.text(selectedPeriodLabel, margin, y);

      y = headerHeight + 8;
      document.setFont("helvetica", "bold");
      document.setFontSize(12);
      document.setTextColor(15, 23, 42);
      document.text(
        document.splitTextToSize(home.label, pageWidth - margin * 2).slice(0, 2),
        margin,
        y,
      );
      y += 8;

      const sourceId = home.sourceId;
      const measures = anonymous || sourceId === undefined
        ? []
        : selectedMeasures(
            uitbreiding.maatregelen,
            sourceId,
            analyse.selectie.drager,
          ).map((measure) => ({
            measure,
            result: getMeasureResult(measure, bron),
          }));
      const footerReserve = 10;
      const rowHeight = Math.max(
        5.2,
        Math.min(9, (pageHeight - y - 17 - footerReserve) / selectedMonths.length),
      );
      for (const monthName of selectedMonths) {
        const month = home.months.find((entry) => entry.maand === monthName);
        if (!month) continue;
        const value = waardeEnergieMaand(
          month,
          analyse.selectie.maat,
          analyse.selectie.aggregatie,
        );
        const full = month.status === "volledig" && value !== null;
        const unit =
          analyse.selectie.maat === "kosten"
            ? `${month.kosten.valuta ?? "kosten"}${
                analyse.selectie.aggregatie === "persoon"
                  ? " per persoon/week"
                  : " maandtotaal"
              }`
            : analyse.selectie.aggregatie === "persoon"
              ? `${analyse.eenheid} per persoon/week`
              : `${analyse.eenheid} maandtotaal`;
        const state =
          month.status === "geen"
            ? monthName > new Date().toISOString().slice(0, 7)
              ? "Nog geen meetgegevens"
              : "Geen gegevens"
            : month.status === "gedeeltelijk"
              ? `Onvolledig · ${
                  month.periodes.length
                    ? `${month.periodes[0].vanaf}–${month.periodes.at(-1)!.tot}`
                    : ""
                }`
              : value === null && analyse.selectie.maat === "kosten"
                ? "Kosten onbekend"
                : value === null
                  ? "Bewoning onbekend"
                  : `${analyse.selectie.maat === "kosten"
                      ? currency(value, month.kosten.valuta) ?? "Kosten onbekend"
                      : formatted(value)} ${unit}`;
        const color = kleuren[Number(monthName.slice(5)) - 1];
        document.setFont("helvetica", "normal");
        document.setFontSize(Math.max(6, Math.min(8, rowHeight - 0.5)));
        document.setTextColor(51, 65, 85);
        document.text(monthLabel(monthName), margin, y);
        document.setFillColor(241, 245, 249);
        document.roundedRect(margin + 36, y - 2.3, barWidth, 2.2, 1, 1, "F");
        if (full && maximum > 0) {
          document.setFillColor(color[0], color[1], color[2]);
          document.roundedRect(
            margin + 36,
            y - 2.3,
            Math.max(0.2, (barWidth * value!) / maximum),
            2.2,
            1,
            1,
            "F",
          );
        } else if (month.status === "gedeeltelijk") {
          document.setDrawColor(color[0], color[1], color[2]);
          document.setLineDashPattern([1, 1], 0);
          document.line(margin + 36, y - 1.2, margin + 36 + barWidth, y - 1.2);
          document.setLineDashPattern([], 0);
        }
        document.setTextColor(15, 23, 42);
        document.setFont("helvetica", "bold");
        document.setFontSize(Math.max(6, Math.min(8, rowHeight - 0.5)));
        document.text(state, pageWidth - margin, y, { align: "right" });
        if (analyse.selectie.maat === "kosten") {
          document.setFont("helvetica", "normal");
          document.setFontSize(6);
          document.setTextColor(71, 85, 105);
          document.text(
            `${formatted(month.verbruik)} ${analyse.eenheid} verbruik`,
            margin + 36,
            y + 2.8,
          );
        }
        y += rowHeight;
      }

      y = pageHeight - 14;
      document.setFont("helvetica", "normal");
      document.setFontSize(7);
      document.setTextColor(71, 85, 105);
      document.text(
        `Aangemaakt ${new Date().toISOString().slice(0, 10)} · Rekenregels ${ENERGIE_REKENREGELS}`,
        margin,
        y,
      );
      if (anonymous) {
        document.text("Geselecteerde panden en maanden; geen volledige portefeuille.", margin, y + 4);
      } else if (measures.length) {
        addMeasuresPage(document, home.label, measures);
      }
    });

    const bytes = document.output("arraybuffer");
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeReportName}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
}

export async function GET(request: Request) {
  return maakEnergiePdf(
    readParameters(new URL(request.url).searchParams),
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || !URL.canParse(origin) || new URL(origin).host !== host)
    return NextResponse.json(
      { fout: "De PDF-export moet vanaf deze ingelogde toepassing worden gestart." },
      { status: 403 },
    );

  let form: FormData;
  try {
    form = await request.formData();
  } catch (cause) {
    return NextResponse.json(
      {
        fout:
          cause instanceof Error
            ? `PDF-selectie kon niet worden gelezen: ${cause.message}`
            : "PDF-selectie kon niet worden gelezen.",
      },
      { status: 400 },
    );
  }
  const parameters: EnergieMaandParameters = {};
  for (const [key, value] of form.entries()) {
    if (typeof value !== "string") continue;
    const existing = parameters[key];
    parameters[key] =
      existing === undefined
        ? value
        : Array.isArray(existing)
          ? [...existing, value]
          : [existing, value];
  }
  if (parameters.weergave === "anoniem") {
    const cookieValue = request.cookies.get(
      ENERGIE_ANONIEME_SELECTIE_COOKIE,
    )?.value;
    if (!cookieValue)
      return NextResponse.json(
        { fout: "De previewsessie is verlopen. Selecteer de panden opnieuw." },
        { status: 400 },
      );
    try {
      Object.assign(
        parameters,
        decodeerEnergieAnoniemeSelectie(cookieValue),
      );
    } catch (cause) {
      return NextResponse.json(
        {
          fout:
            cause instanceof Error
              ? cause.message
              : "De anonieme selectie kon niet worden gelezen.",
        },
        { status: 400 },
      );
    }
  }
  return maakEnergiePdf(parameters);
}
