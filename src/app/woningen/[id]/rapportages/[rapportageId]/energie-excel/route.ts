import ExcelJS from "exceljs";
import { getEnergieRapportSnapshot } from "@/services/energie-rapportage-server";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; rapportageId: string }> },
) {
  const { id, rapportageId } = await params;
  const woning = Number(id),
    rapport = Number(rapportageId);
  if (
    !Number.isSafeInteger(woning) ||
    woning <= 0 ||
    !Number.isSafeInteger(rapport) ||
    rapport <= 0
  )
    return Response.json({ fout: "Ongeldige rapportage" }, { status: 400 });
  try {
    const snapshotId =
      new URL(request.url).searchParams.get("energie_snapshot") ?? "";
    const s = await getEnergieRapportSnapshot(snapshotId, rapport, woning);
    const book = new ExcelJS.Workbook();
    book.creator = "CFME";
    book.created = new Date(s.gegenereerd_op);
    const add = (name: string, rows: (string | number | null)[][]) => {
      const sheet = book.addWorksheet(name);
      sheet.addRows(rows);
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF064E3B" },
      };
      sheet.columns.forEach((c) => {
        c.width = 25;
      });
      sheet.views = [{ state: "frozen", ySplit: 1 }];
    };
    add("Momentopname", [
      ["Kenmerk", "Waarde"],
      ["Snapshot", snapshotId],
      ["Vastgelegd", s.gegenereerd_op],
      ["Rekenregels", s.versie],
      ["Vanaf inclusief", s.vanaf],
      ["Tot exclusief", s.tot],
      ["Berekening", s.modus],
      ["Toelichting", s.conclusie],
    ]);
    if (s.tijdlijn) {
      const t = s.tijdlijn;
      add("Maandgrafieken", [
        [
          "Product",
          "Maand",
          "Eenheid",
          String(t.jaar),
          "Volledige maand",
          t.vergelijkjaar === null
            ? "Geen vergelijking"
            : String(t.vergelijkjaar),
          "Referentie volledig",
        ],
        ...t.grafieken.flatMap((g) =>
          g.waarden.flatMap((v, i) =>
            i < t.van || i > t.tot
              ? []
              : [
                  [
                    g.product,
                    i + 1,
                    g.eenheid,
                    v,
                    g.volledig[i] ? "ja" : "nee",
                    g.referentie[i],
                    g.referentieVolledig[i] ? "ja" : "nee",
                  ],
                ],
          ),
        ),
      ]);
      if (t.saldo)
        add("Informatief saldo", [
          [
            "Maand",
            "Voorschot EUR",
            "Geschatte kosten EUR incl btw",
            "Bekend kostendeel EUR",
            "Verschil EUR",
            "Cumulatief saldo EUR",
            "Opmerking",
          ],
          ...t.saldo.maanden.map((m) => [
            m.maand,
            m.voorschot,
            m.kosten,
            m.bekend,
            m.verschil,
            m.saldo,
            m.ontbrekend.join("; ") + (m.lopend ? "; lopende maand" : ""),
          ]),
        ]);
    } else {
      add("Verbruik", [
        [
          "Product",
          "Eenheid",
          "Verbruik",
          "Verbruik per persoon in periode",
          "Persoonsnorm/week",
          "Kalenderdekking %",
          "Naar rato berekend",
          "Kwaliteit",
          "Vorige norm",
          "Verschil %",
          "Mediaan",
          "Benchmarkpanden",
        ],
        ...s.producten.map((p) => [
          p.product,
          p.eenheid,
          p.verbruik,
          p.verbruik_per_persoon_per_periode,
          p.norm,
          p.dekking,
          p.naar_rato_berekend ? "ja" : "nee",
          p.kwaliteit,
          p.vorige_norm,
          p.verschil_percentage,
          p.mediaan,
          p.benchmark_aantal,
        ]),
      ]);
      add("Meetperioden", [
        ["Product", "Gebruikte meetperiode"],
        ...s.producten.flatMap((p) =>
          p.gebruikte_perioden.map((d) => [p.product, d]),
        ),
      ]);
      add("Kosten", [
        [
          "Product",
          "Variabel excl. btw",
          "Vast excl. btw",
          "Belastingen excl. btw",
          "Btw",
          "Totaal",
          "Valuta",
          "Naar rato berekend",
          "Ontbrekend",
          "Kosten per persoon/week",
        ],
        ...s.producten.map((p) => [
          p.product,
          p.kosten.variabel,
          p.kosten.vast,
          p.kosten.belastingen,
          p.kosten.btw,
          p.kosten.totaal,
          p.kosten.valuta,
          p.kosten.geschat ? "ja" : "nee",
          p.kosten.ontbrekend.join("; "),
          p.kosten_per_persoon_per_week,
        ]),
      ]);
      add("Tariefregels", [
        [
          "Product",
          "Van",
          "Tot exclusief",
          "Component",
          "Hoeveelheid",
          "Eenheidsprijs",
          "Excl. btw",
          "Btw",
          "Totaal",
          "Valuta",
          "Bron",
          "Tariefversie",
          "Naar rato berekend",
        ],
        ...s.producten.flatMap((p) =>
          p.kosten.regels.map((r) => [
            p.product,
            r.vanaf,
            r.tot,
            r.soort,
            r.hoeveelheid,
            r.eenheidsprijs,
            r.exclusief_btw,
            r.btw,
            r.totaal,
            r.valuta,
            r.bron,
            r.tarief_id,
            r.geschat ? "ja" : "nee",
          ]),
        ),
      ]);
      add("CFME maatregelen", [
        ["Titel", "Status", "Uitvoerdatum", "Goedgekeurde klanttoelichting"],
        ...s.maatregelen.map((m) => [
          m.titel,
          m.status,
          m.uitvoerdatum,
          m.toelichting,
        ]),
      ]);
      add("Datakwaliteit", [
        ["Product", "Melding"],
        ...s.producten.flatMap((p) => p.meldingen.map((m) => [p.product, m])),
      ]);
    }
    const bytes = await book.xlsx.writeBuffer();
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="cfme-energie-${rapport}-${snapshotId.slice(0, 8)}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return Response.json(
      {
        fout: "Energiespecificatie niet beschikbaar voor deze rapportage of onvoldoende rechten.",
      },
      { status: 403 },
    );
  }
}
