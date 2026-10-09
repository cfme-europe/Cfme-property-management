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
import { bouwRapportageEindvorm } from "@/lib/rapportages/rapportage-eindvorm";
import {
  bouwKlantwaardeRapportage,
  isKlantwaardeRapportage,
} from "@/lib/rapportages/klantwaarde-rapportage";
import {
  alleKlantversieOnderdelen,
  leesKlantversieOnderdelen,
  type KlantversieOnderdeel,
} from "@/lib/rapportages/klantversie-onderdelen";

export const dynamic = "force-dynamic";

function tekenKlantwaardePdf(
  document: jsPDF,
  rapportage: Maandrapportage,
  woning: Woning,
  onderdelen: ReadonlySet<KlantversieOnderdeel>,
) {
  const waarde = bouwKlantwaardeRapportage(
    rapportage.rapport_data,
  );
  const breedte = document.internal.pageSize.getWidth();
  const marge = 16;
  const inhoud = breedte - marge * 2;
  const toon = (onderdeel: KlantversieOnderdeel) =>
    onderdelen.has(onderdeel);
  const heeftTweedePagina = toon("reparaties");
  const totaalPaginas = heeftTweedePagina ? 2 : 1;

  function kop(pagina: number) {
    document.setTextColor(4, 120, 87);
    document.setFont("helvetica", "bold");
    document.setFontSize(8);
    document.text("CFME CONTROL", marge, 13);
    document.setTextColor(15, 23, 42);
    document.setFontSize(18);
    document.text("Managementrapportage klant", marge, 24);
    document.setFont("helvetica", "normal");
    document.setTextColor(71, 85, 105);
    document.setFontSize(8);
    document.text(
      `${woning.adres} · ${rapportage.rapportmaand}-${rapportage.rapportjaar}`,
      marge,
      32,
    );
    document.setFillColor(15, 23, 42);
    document.roundedRect(breedte - marge - 31, 10, 31, 10, 5, 5, "F");
    document.setTextColor(255, 255, 255);
    document.setFont("helvetica", "bold");
    document.setFontSize(7);
    document.text(`Pagina ${pagina} van ${totaalPaginas}`, breedte - marge - 15.5, 16.4, {
      align: "center",
    });
    document.setDrawColor(110, 231, 183);
    document.line(marge, 39, breedte - marge, 39);
  }

  function kaart(
    x: number,
    y: number,
    kaartBreedte: number,
    label: string,
    getal: string,
  ) {
    document.setFillColor(255, 255, 255);
    document.setDrawColor(226, 232, 240);
    document.roundedRect(x, y, kaartBreedte, 30, 2, 2, "FD");
    document.setTextColor(100, 116, 139);
    document.setFontSize(7);
    document.setFont("helvetica", "bold");
    document.text(label.toUpperCase(), x + 4, y + 9);
    document.setTextColor(4, 120, 87);
    document.setFontSize(17);
    document.text(getal, x + 4, y + 23);
  }

  function sectieKader(
    x: number,
    y: number,
    kaderBreedte: number,
    hoogte: number,
    gevuld = false,
  ) {
    if (gevuld) {
      document.setFillColor(236, 253, 245);
    } else {
      document.setFillColor(255, 255, 255);
    }
    document.setDrawColor(226, 232, 240);
    document.roundedRect(x, y, kaderBreedte, hoogte, 3, 3, "FD");
  }

  function kleineTitel(tekst: string, x: number, y: number) {
    document.setTextColor(15, 23, 42);
    document.setFont("helvetica", "bold");
    document.setFontSize(11);
    document.text(tekst, x, y);
  }

  function percentageBreedte(
    waarde: number | null,
    maximum: number,
    beschikbareBreedte: number,
  ) {
    return Math.max(
      0,
      Math.min(beschikbareBreedte, ((waarde ?? 0) / maximum) * beschikbareBreedte),
    );
  }

  function labelRechts(tekst: string, x: number, y: number) {
    document.setTextColor(71, 85, 105);
    document.setFont("helvetica", "normal");
    document.setFontSize(7);
    document.text(tekst, x, y, {
      align: "right",
    });
  }

  function titel(tekst: string, y: number) {
    document.setTextColor(15, 23, 42);
    document.setFont("helvetica", "bold");
    document.setFontSize(15);
    document.text(tekst, marge, y);
  }

  function regels(
    tekst: string,
    x: number,
    y: number,
    maxBreedte: number,
    grootte = 9,
    maxRegels = 3,
  ) {
    document.setTextColor(51, 65, 85);
    document.setFont("helvetica", "normal");
    document.setFontSize(grootte);
    const gesplitst = document.splitTextToSize(
      tekst,
      maxBreedte,
    ) as string[];
    document.text(gesplitst.slice(0, maxRegels), x, y);
  }

  kop(1);
  document.setFillColor(15, 23, 42);
  document.roundedRect(marge, 51, inhoud, 37, 3, 3, "F");
  document.setTextColor(110, 231, 183);
  document.setFont("helvetica", "bold");
  document.setFontSize(10);
  document.text("CFME-MEERWAARDE IN EEN OOGOPSLAG", marge + 6, 63);
  document.setTextColor(255, 255, 255);
  document.setFontSize(17);
  document.text("Zichtbaar, opgevolgd en opgelost", marge + 6, 77);

  const kaarten: string[][] = [];
  if (toon("inspecties")) {
    kaarten.push(["Inspecties", String(waarde.inspecties)]);
  }
  if (toon("reparaties")) {
    kaarten.push(["Opgelost", String(waarde.opgelost)]);
  }
  if (toon("opvolging")) {
    kaarten.push([
      "Gem. oplostijd",
      waarde.gemiddelde_oplostijd_dagen === null
        ? "-"
        : `${waarde.gemiddelde_oplostijd_dagen} d`,
    ]);
  }
  if (toon("aandachtspunten")) {
    kaarten.push(["Nog open", String(waarde.open_einde_periode)]);
  }
  const kaartBreedte = (inhoud - Math.max(kaarten.length - 1, 0) * 3) /
    Math.max(kaarten.length, 1);
  kaarten.forEach(([label, getal], index) => {
    const x = marge + index * (kaartBreedte + 3);
    kaart(x, 96, kaartBreedte, label, getal);
  });

  const informatieY = kaarten.length > 0 ? 137 : 96;
  const tweeKolommen = toon("meerwaarde") && toon("opvolging");
  const kolomBreedte = tweeKolommen ? (inhoud - 5) / 2 : inhoud;

  if (toon("meerwaarde")) {
    sectieKader(marge, informatieY, kolomBreedte, 63, true);
    kleineTitel("Wat CFME deze maand bereikte", marge + 6, informatieY + 11);
    waarde.meerwaarde.slice(0, 4).forEach((regel, index) => {
      document.setFillColor(4, 120, 87);
      document.circle(marge + 7, informatieY + 22 + index * 10, 1.2, "F");
      regels(
        regel,
        marge + 11,
        informatieY + 24 + index * 10,
        kolomBreedte - 17,
        7.5,
        1,
      );
    });
  }

  if (toon("opvolging")) {
    const opvolgingX = tweeKolommen ? marge + kolomBreedte + 5 : marge;
    sectieKader(opvolgingX, informatieY, kolomBreedte, 63);
    kleineTitel("Opvolging", opvolgingX + 6, informatieY + 11);
    const percentage = waarde.oplossingspercentage === null
      ? "-"
      : `${waarde.oplossingspercentage}%`;
    const regelsOpvolging = [
      ["Nieuwe meldingen", String(waarde.ontvangen)],
      ["Opgelost in de maand", String(waarde.opgelost)],
      ["Dezelfde dag opgelost", String(waarde.dezelfde_dag_opgelost)],
      ["Oplossingspercentage", percentage],
    ];
    regelsOpvolging.forEach(([label, getal], index) => {
      const y = informatieY + 23 + index * 9;
      regels(label, opvolgingX + 6, y, kolomBreedte - 25, 7.5, 1);
      document.setTextColor(index === 3 ? 4 : 15, index === 3 ? 120 : 23, index === 3 ? 87 : 42);
      document.setFont("helvetica", "bold");
      document.setFontSize(8);
      document.text(getal, opvolgingX + kolomBreedte - 6, y, { align: "right" });
    });
  }

  let vervolgY = (toon("meerwaarde") || toon("opvolging"))
    ? informatieY + 71
    : informatieY;

  if (toon("aandachtspunten")) {
    document.setFillColor(255, 251, 235);
    document.setDrawColor(253, 230, 138);
    document.roundedRect(marge, vervolgY, inhoud, 25, 3, 3, "FD");
    kleineTitel("Openstaande aandachtspunten", marge + 6, vervolgY + 10);
    regels(
      waarde.open_einde_periode === 0
        ? "Aan het einde van deze rapportmaand stonden geen problemen meer open."
        : `${waarde.open_einde_periode} probleem${waarde.open_einde_periode === 1 ? "" : "en"} vraagt nog aantoonbare opvolging.`,
      marge + 6,
      vervolgY + 19,
      inhoud - 12,
      7.5,
      1,
    );
    vervolgY += 33;
  }

  if (toon("energie")) {
    tekenEnergie(vervolgY);
  }

  if (!heeftTweedePagina) return;

  document.addPage();
  kop(2);
  const paginaTweeY = 55;

  if (toon("reparaties")) {
    titel("Probleem - actie - oplossing", paginaTweeY);
  regels(
    "Herleidbare voorbeelden uit de rapportmaand. De doorlooptijd loopt van melddatum tot geregistreerde oplossing.",
      marge, paginaTweeY + 9, inhoud, 9, 2,
  );

  if (waarde.oplossingen.length === 0) {
    regels(
      "Geen afgeronde problemen in deze rapportmaand.",
      marge,
        paginaTweeY + 29,
      inhoud,
      10,
      2,
    );
  } else {
    waarde.oplossingen.slice(0, 4).forEach((item, index) => {
        const y = paginaTweeY + 25 + index * 25;
      document.setDrawColor(203, 213, 225);
      document.line(marge, y - 5, breedte - marge, y - 5);
      document.setTextColor(15, 23, 42);
      document.setFont("helvetica", "bold");
      document.setFontSize(9);
      document.text(item.titel.slice(0, 48), marge, y);
      document.setTextColor(4, 120, 87);
      document.text(
        `${item.doorlooptijd_dagen} dag${item.doorlooptijd_dagen === 1 ? "" : "en"}`,
        breedte - marge,
        y,
        { align: "right" },
      );
      regels(item.oplossing, marge, y + 6, inhoud - 35, 8, 2);
      regels(
        `${item.melddatum} > ${item.oplosdatum}`,
        breedte - marge - 33,
        y + 6,
        33,
        7,
        1,
      );
    });
  }
  }

  function tekenEnergie(yStart: number) {
    sectieKader(marge, yStart, inhoud, 68);
    kleineTitel("Energieverbruik versus vorige periode", marge + 6, yStart + 11);
    regels(
      "Verbruik per persoon per week; hierdoor blijft de kostenontwikkeling meetbaar en vergelijkbaar.",
      marge + 6, yStart + 19, inhoud - 12, 7, 1,
    );
    waarde.energie.forEach((item, index) => {
      const y = yStart + 29 + index * 12;
      const huidig = item.huidig === null ? "-" : item.huidig.toFixed(2);
      const vorig = item.vorig === null ? "-" : item.vorig.toFixed(2);
      const maximum = Math.max(item.huidig ?? 0, item.vorig ?? 0, 1);
      const balkX = marge + 43;
      const balkBreedte = inhoud - 92;

      document.setTextColor(15, 23, 42);
      document.setFont("helvetica", "bold");
      document.setFontSize(7.5);
      document.text(item.label, marge + 6, y + 3);

      document.setFillColor(241, 245, 249);
      document.roundedRect(balkX, y - 1, balkBreedte, 3, 1.5, 1.5, "F");
      document.setFillColor(203, 213, 225);
      document.roundedRect(
        balkX,
        y - 1,
        percentageBreedte(item.vorig, maximum, balkBreedte),
        3,
        1.5,
        1.5,
        "F",
      );
      document.setFillColor(209, 250, 229);
      document.roundedRect(balkX, y + 4, balkBreedte, 3, 1.5, 1.5, "F");
      document.setFillColor(5, 150, 105);
      document.roundedRect(
        balkX,
        y + 4,
        percentageBreedte(item.huidig, maximum, balkBreedte),
        3,
        1.5,
        1.5,
        "F",
      );
      labelRechts(
        `${vorig} > ${huidig} ${item.eenheid}`,
        breedte - marge - 25,
        y + 3,
      );
      const verschil = item.verschil_percentage === null
        ? "-"
        : `${item.verschil_percentage >= 0 ? "+" : ""}${item.verschil_percentage}%`;
      document.setFillColor(
        item.verschil_percentage !== null && item.verschil_percentage > 0
          ? 254
          : 209,
        item.verschil_percentage !== null && item.verschil_percentage > 0
          ? 243
          : 250,
        item.verschil_percentage !== null && item.verschil_percentage > 0
          ? 199
          : 229,
      );
      document.roundedRect(breedte - marge - 21, y - 2, 17, 9, 4.5, 4.5, "F");
      document.setTextColor(
        item.verschil_percentage !== null && item.verschil_percentage > 0
          ? 146
          : 6,
        item.verschil_percentage !== null && item.verschil_percentage > 0
          ? 64
          : 95,
        item.verschil_percentage !== null && item.verschil_percentage > 0
          ? 14
          : 70,
      );
      document.setFont("helvetica", "bold");
      document.setFontSize(7);
      document.text(verschil, breedte - marge - 12.5, y + 3.5, { align: "center" });
    });
  }

  if (toon("meerwaarde") || toon("opvolging") || toon("reparaties")) {
  document.setFillColor(15, 23, 42);
  document.roundedRect(marge, 248, inhoud, 29, 3, 3, "F");
  document.setTextColor(255, 255, 255);
  document.setFont("helvetica", "bold");
  document.setFontSize(11);
  document.text("Conclusie voor de klant", marge + 6, 259);
  document.setFont("helvetica", "normal");
  document.setFontSize(8);
  const conclusie = document.splitTextToSize(
    `CFME maakte ${waarde.ontvangen} nieuwe meldingen zichtbaar, rondde ${waarde.opgelost} problemen aantoonbaar af en bewaakte de resterende werkvoorraad.`,
    inhoud - 12,
  ) as string[];
  document.text(conclusie.slice(0, 2), marge + 6, 267);
  }
}

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
  const zoekparameters = new URL(request.url).searchParams;
  const preview = zoekparameters.get("preview") === "1";
  const klantversie = zoekparameters.get("variant") === "klantwaarde";
  const onderdelen = leesKlantversieOnderdelen(
    zoekparameters.get("onderdelen"),
  );

  if (klantversie && onderdelen.size === 0) {
    return NextResponse.json(
      { fout: "Selecteer minimaal één onderdeel voor de klantversie." },
      { status: 400 },
    );
  }

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
    klantversie ? "cfme-klantversie" : "cfme-maandrapportage",
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
            variant: klantversie ? "klantwaarde" : "standaard",
            onderdelen: klantversie ? [...onderdelen] : null,
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

    if (
      klantversie || isKlantwaardeRapportage(
        rapportage.rapport_data,
      )
    ) {
      tekenKlantwaardePdf(
        document,
        rapportage,
        woning,
        klantversie
          ? onderdelen
          : alleKlantversieOnderdelen(),
      );
    } else {
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
    const eindvorm =
      bouwRapportageEindvorm(
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

    sectie("Bestuurlijke duiding");
    schrijf(
      eindvorm.managementconclusie,
      { vet: true, grootte: 11 },
    );

    eindvorm.duiding.forEach(
      (regel, index) => {
        schrijf(
          `${index + 1}. ${regel.onderwerp}`,
          { vet: true },
        );
        schrijf(
          `Vorige situatie: ${regel.vorige_situatie}`,
          { inspringen: 4, grootte: 9 },
        );
        schrijf(
          `Huidige situatie: ${regel.huidige_situatie}`,
          { inspringen: 4, grootte: 9 },
        );
        schrijf(
          `Verschil: ${regel.verschil}`,
          { inspringen: 4, grootte: 9 },
        );
        schrijf(
          `Actie: ${regel.actie}`,
          { inspringen: 4, grootte: 9 },
        );
        schrijf(
          `Resultaat: ${regel.resultaat}`,
          { inspringen: 4, grootte: 9 },
        );
        schrijf(
          `Financiële en operationele betekenis: ${regel.betekenis}`,
          { inspringen: 4, grootte: 9 },
        );
      },
    );

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
