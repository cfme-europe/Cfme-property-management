import { registreerEnergieLettertypen } from "./pdf-lettertypen";
import type { jsPDF } from "jspdf";
import type { EnergieKlantSnapshot } from "./snapshot";
/** One bounded A4 supplement; detail rows are available in the companion workbook. */
export function tekenEnergieRapportPagina(
  doc: jsPDF,
  s: EnergieKlantSnapshot,
  adres: string,
) {
  registreerEnergieLettertypen(doc);
  doc.addPage();
  const x = 16,
    w = 178;
  const n = (v: number | null, d = 1) =>
    v === null ? "-" : v.toLocaleString("nl-NL", { maximumFractionDigits: d });
  const text = (
    v: string,
    xx: number,
    y: number,
    size = 9,
    color: [number, number, number] = [30, 41, 59],
    width = 178,
    max = 2,
  ) => {
    doc.setTextColor(...color);
    doc.setFontSize(size);
    doc.setFont("CFME", size >= 10 ? "bold" : "normal");
    const lines = doc.splitTextToSize(
      v.replaceAll("→", " > ").replaceAll("—", "-"),
      width,
    );
    doc.text(lines.slice(0, max), xx, y);
  };
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 57, "F");
  text("CFME CONTROL  /  ENERGIE & RESULTAAT", x, 14, 8, [110, 231, 183]);
  text("Grip op verbruik. Zicht op vooruitgang.", x, 29, 19, [255, 255, 255]);
  text(
    `${adres} | ${s.vanaf} - ${s.tot} (einde exclusief)`,
    x,
    44,
    8,
    [203, 213, 225],
    w,
    2,
  );
  const cardW = (w - 8) / 3;
  for (let i = 0; i < s.producten.length; i++) {
    const p = s.producten[i],
      xx = x + i * (cardW + 4);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(xx, 64, cardW, 49, 3, 3, "F");
    text(p.product.toUpperCase(), xx + 4, 73, 8, [4, 120, 87], cardW - 8, 1);
    text(
      `${n(p.verbruik)} ${p.eenheid}`,
      xx + 4,
      85,
      17,
      [15, 23, 42],
      cardW - 8,
      1,
    );
    text(
      `${n(p.norm)} ${p.eenheid}/persoon/week`,
      xx + 4,
      93,
      7,
      [71, 85, 105],
      cardW - 8,
      1,
    );
    text(
      p.kosten.totaal === null
        ? "Kosten onvolledig"
        : `${n(p.kosten.totaal, 2)} ${p.kosten.valuta}`,
      xx + 4,
      103,
      10,
      [15, 23, 42],
      cardW - 8,
      1,
    );
    text(
      p.gebruikte_perioden.length ? p.gebruikte_perioden[0] + (p.gebruikte_perioden.length > 1 ? ` (+${p.gebruikte_perioden.length-1})` : "") : "Geen bruikbare meetperiode",
      xx + 4,
      109,
      6,
      [71, 85, 105],
      cardW - 8,
      1,
    );
  }
  text("BETROUWBAARHEID EN VERGELIJKING", x, 125, 9, [4, 120, 87]);
  s.producten.forEach((p, i) => {
    const y = 134 + i * 16;
    text(p.product, x, y, 9);
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(x + 29, y - 3, 53, 2.5, 1, 1, "F");
    doc.setFillColor(
      ...((p.kwaliteit === "exact" ? [5, 150, 105] : [217, 119, 6]) as [
        number,
        number,
        number,
      ]),
    );
    doc.roundedRect(
      x + 29,
      y - 3,
      Math.max(0.1, (53 * Math.min(100, p.dekking)) / 100),
      2.5,
      1,
      1,
      "F",
    );
    text(
      `${n(p.dekking)}% | ${p.kwaliteit.replaceAll("_", " ")}`,
      x + 86,
      y,
      8,
    );
    text(
      p.mediaan === null
        ? "Benchmark nog onvoldoende vergelijkbaar"
        : `Mediaan: ${n(p.mediaan)} ${p.eenheid}/persoon/week (${p.benchmark_aantal} panden)`,
      x + 29,
      y + 5,
      6.5,
      [71, 85, 105],
      145,
      1,
    );
    text(
      p.verschil_percentage === null
        ? "Vorige periode: geen betrouwbare vergelijking"
        : `Vorige periode: ${p.verschil_percentage >= 0 ? "+" : ""}${n(p.verschil_percentage)}% per persoon/week`,
      x + 29,
      y + 9,
      6.5,
      [71, 85, 105],
      145,
      1,
    );
  });
  text("KOSTEN EN TARIEFBRON", x, 189, 9, [4, 120, 87]);
  s.producten.forEach((p, i) => {
    const y = 197 + i * 11;
    text(
      `${p.product}: variabel ${n(p.kosten.regels.length ? p.kosten.variabel : null, 2)} | vast ${n(p.kosten.regels.length ? p.kosten.vast : null, 2)} | belasting ${n(p.kosten.regels.length ? p.kosten.belastingen : null, 2)} | btw ${n(p.kosten.regels.length ? p.kosten.btw : null, 2)} ${p.kosten.valuta ?? ""}`,
      x,
      y,
      7,
      [30, 41, 59],
      178,
      1,
    );
    text(
      p.kosten.ontbrekend.length
        ? "Onvolledig: tarieven of grensstanden ontbreken. Zie energiespecificatie."
        : [...new Set(p.kosten.regels.map((r) => r.bron))].join("; ") ||
            "Geen tarief vastgelegd",
      x,
      y + 4,
      6,
      [100, 116, 139],
      178,
      1,
    );
  });
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(x, 231, w, 34, 3, 3, "F");
  text("WAT CFME ONDERZOEKT EN VERBETERT", x + 4, 238, 8, [4, 120, 87]);
  if (!s.maatregelen.length)
    text(
      "Nog geen klantgerichte maatregelen vastgelegd. Geen gerealiseerde besparing geclaimd.",
      x + 4,
      247,
      8,
      [30, 41, 59],
      w - 8,
      2,
    );
  else
    s.maatregelen
      .slice(0, 3)
      .forEach((m, i) =>
        text(
          `${m.status}: ${m.titel}`,
          x + 4,
          245 + i * 6,
          7,
          [30, 41, 59],
          w - 8,
          1,
        ),
      );
  text(
    "Afwijkend verbruik vraagt onderzoek; het bewijst geen misbruik. Een benchmarkverschil is geen gegarandeerde besparing.",
    x,
    272,
    6.5,
    [100, 116, 139],
    w,
    2,
  );
  text(
    `Momentopname ${s.gegenereerd_op.slice(0, 10)} | Rekenregels ${s.versie} | Details: energiespecificatie (Excel)`,
    x,
    280,
    6,
    [100, 116, 139],
    w,
    1,
  );
}
