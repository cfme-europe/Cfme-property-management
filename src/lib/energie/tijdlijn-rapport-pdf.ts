import { saldoOverzicht } from "./saldo-overzicht";
import type { jsPDF } from "jspdf";
import type { TijdlijnRapport } from "./tijdlijn-rapport";
export function tekenTijdlijnBijlage(
  doc: jsPDF,
  t: TijdlijnRapport,
  adres: string,
  datum: string,
) {
  doc.addPage();
  const text = (s: string, x: number, y: number, size = 8) => {
    doc.setFont("CFME", "normal");
    doc.setFontSize(size);
    doc.setTextColor("#172e25");
    doc.text(s, x, y);
  };
  const n = (v: number | null) =>
    v === null
      ? "Onbekend"
      : v.toLocaleString("nl-NL", { maximumFractionDigits: 2 });
  text("CFME CONTROL", 16, 15, 10);
  text("Verbruik en voorschot", 16, 25, 19);
  text(`${adres} | ${t.jaar} | maanden ${t.van + 1} t/m ${t.tot + 1}`, 16, 33);
  const indices = Array.from(
      { length: t.tot - t.van + 1 },
      (_, i) => i + t.van,
    ),
    namen = [
      "Jan",
      "Feb",
      "Mrt",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Okt",
      "Nov",
      "Dec",
    ];
  let top = 41;
  for (const g of t.grafieken) {
    text(`${g.product} | ${g.eenheid}`, 16, top, 9);
    const max =
      Math.max(
        1,
        ...g.waarden.filter((v): v is number => v !== null),
        ...g.referentie.filter((v): v is number => v !== null),
      ) * 1.1;
    const x = (i: number) =>
        30 + ((i - t.van) * 162) / Math.max(1, indices.length - 1),
      y = (v: number) => top + 37 - (v / max) * 29;
    for (const f of [0, 0.5, 1]) {
      doc.setDrawColor("#d1d5db");
      doc.setLineWidth(0.2);
      doc.line(30, y(max * f), 194, y(max * f));
      text(n(max * f), 16, y(max * f) + 1, 6);
    }
    for (const r of [
      { v: g.waarden, f: g.volledig, c: "#047857", ref: false },
      { v: g.referentie, f: g.referentieVolledig, c: "#2563eb", ref: true },
    ]) {
      indices.forEach((i, j) => {
        const v = r.v[i];
        if (v === null) return;
        doc.setDrawColor(r.c);
        doc.setLineWidth(0.7);
        if (j > 0 && r.v[indices[j - 1]] !== null) {
          doc.setLineDashPattern(
            r.ref ? [2, 1] : !r.f[i] || !r.f[indices[j - 1]] ? [0.6, 1] : [],
            0,
          );
          doc.line(x(indices[j - 1]), y(r.v[indices[j - 1]]!), x(i), y(v));
        }
        doc.setLineDashPattern([], 0);
        doc.setFillColor(r.f[i] ? r.c : "#ffffff");
        doc.circle(x(i), y(v), 1.1, "FD");
      });
    }
    indices.forEach((i) => text(namen[i], x(i) - 2, top + 43, 6));
    top += 46;
  }
  text(
    `${t.jaar}: groen${t.vergelijkjaar !== null ? ` | ${t.vergelijkjaar}: blauw gestreept` : ""} | Open punt: lopend of onvolledig`,
    16,
    top,
    7,
  );
  top += 5;
  text(
    "Maandwaarden verdeeld uit meteropnames; geen dagelijkse metingen.",
    16,
    top,
    7,
  );
  top += 10;
  if (t.saldoOntbreekt) {
    text(
      "Voorschotsaldo onbekend: voorschotafspraak ontbreekt voor deze verhuurperiode.",
      16,
      top,
      7,
    );
    top += 8;
  }
  if (t.saldo) {
    text("Voorschot en geschatte kosten | stroom + gas + water", 16, top, 10);
    top += 6;
    text(
      `Start ${t.saldo.vanaf} | startsaldo EUR ${n(t.saldo.startsaldo)}`,
      16,
      top,
      7,
    );
    top += 6;
    const overzicht = saldoOverzicht([t.saldo], [t.saldo.woning_id], t.jaar, t.van, t.tot, t.tot);
    text(`Afgesproken voorschot: EUR ${n(overzicht.voorschot)} | Geschatte kosten: EUR ${n(overzicht.kosten)}`,16,top,8);
    top += 5;
    text(`${overzicht.saldo !== null && overzicht.saldo < 0 ? "Opgebouwd tekort" : "Opgebouwd saldo"}: EUR ${n(overzicht.saldo === null ? null : Math.abs(overzicht.saldo))} | Afgesloten maanden ${overzicht.van} t/m ${overzicht.tot}`,16,top,8);
    top += 6;
    [
      "Maand",
      "Voorschot EUR",
      "Kosten EUR",
      "Verschil EUR",
      "Saldo EUR",
    ].forEach((h, i) => text(h, 16 + i * 36, top, 7));
    top += 5;
    t.saldo.maanden.forEach((m) => {
      [
        m.maand + (m.lopend ? " *" : ""),
        n(m.voorschot),
        n(m.kosten),
        n(m.verschil),
        n(m.saldo),
      ].forEach((v, i) => text(v, 16 + i * 36, top, 7));
      top += 4;
    });
    text(
      "Positief: tegoed. Negatief: tekort. * Lopende maand; onbekend: invoer of metingen ontbreken.",
      16,
      top + 2,
      6,
    );
    top += 9;
  }
  text(
    "Inclusief btw. Geschatte prijzen en afgesproken voorschotten; geen betalingscontrole of afrekening.",
    16,
    Math.min(282, top + 3),
    6,
  );
  text(
    `Momentopname ${datum.slice(0, 10)} | Details in energiespecificatie (Excel).`,
    16,
    Math.min(288, top + 8),
    6,
  );
}
