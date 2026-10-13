import test from "node:test";
import assert from "node:assert/strict";
import {
  bouwEnergiePortfolioAnalyse,
  berekenPersoonsdagen,
  type Brondata,
  type EnergieMeterstand,
  type EnergieInterval,
} from "../src/lib/energie/portfolio-analyse";
import { datumTijd, kwartiel } from "../src/lib/energie/rekenregels";
import { elektriciteitsMeting } from "../src/lib/energie/metingen";
import {
  berekenEnergiekosten,
  type Tariefplan,
} from "../src/lib/energie/tarieven";
import { leesAlleRijen } from "../src/lib/energie/paginering";
import {
  bouwEnergieSnapshot,
  klantSnapshot,
} from "../src/lib/energie/snapshot";
import { leesSelectie } from "../src/lib/energie/selectie";
import { beoordeelMaatregel } from "../src/lib/energie/resultaten";
import {
  alleKlantversieOnderdelen,
  leesKlantversieOnderdelen,
} from "../src/lib/rapportages/klantversie-onderdelen";
import { jsPDF } from "jspdf";
import { tekenEnergieRapportPagina } from "../src/lib/energie/rapport-pdf";
const stand = (
  id: number,
  date: string,
  kwh: number,
  residents = 8,
): EnergieMeterstand => ({
  id,
  woning_id: 16,
  opnamedatum: date,
  bewoners_aantal: residents,
  dagstroom_kwh: kwh,
  nachtstroom_kwh: 0,
  elektriciteit_kwh: kwh,
  gas_m3: null,
  water_m3: null,
});
function bron(): Brondata {
  return {
    woningen: [
      { id: 16, adres: "Testpand", postcode: "", plaats: "", status: "actief" },
    ],
    bedrijven: [{ id: 4, naam: "Klant" }],
    verhuurperioden: [
      { id: 12, woning_id: 16, bedrijf_id: 4, startdatum: "2026-08-01" },
    ],
    bewoners: Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      verhuurperiode_id: 12,
      incheckdatum: "2026-08-01",
      uitcheckdatum: null,
    })),
    meterstanden: [
      stand(58, "2026-09-07", 63890),
      stand(75, "2026-09-23", 64654),
    ],
  };
}
const sel = {
  niveau: "totaal" as const,
  drager: "elektriciteit" as const,
  vanaf: "2026-09-01",
  totEnMet: "2026-10-01",
};
const analyse = (b = bron(), s = sel) => bouwEnergiePortfolioAnalyse(b, s);
test("golden Meerstraat:764 / (128/7), 16/30 calendar coverage, no misleading benchmark", () => {
  const a = analyse();
  assert.equal(a.totaal, 764);
  assert.equal(a.persoonsdagen, 128);
  assert.equal(a.per_persoon_per_week, 41.78125);
  assert.ok(Math.abs(a.dekking_percentage - (16 / 30) * 100) < 1e-10);
  assert.equal(a.rijen[0].betrouwbaarheid, "gedeeltelijk");
  assert.equal(a.mediaan_per_persoon_per_week, null);
});
test("exact boundaries and missing boundaries are distinct", () => {
  const a = analyse(bron(), {
    ...sel,
    vanaf: "2026-09-07",
    totEnMet: "2026-09-23",
  });
  assert.equal(a.dekking_percentage, 100);
  assert.equal(a.rijen[0].betrouwbaarheid, "exact");
  const b = bron();
  b.meterstanden.pop();
  assert.equal(analyse(b).totaal, null);
  assert.equal(analyse(b).rijen.length, 1);
});
test("interpolation only in explicit mode and never extrapolates", () => {
  const b = bron();
  const exact = analyse(b, {
    ...sel,
    vanaf: "2026-09-10",
    totEnMet: "2026-09-20",
  });
  assert.equal(exact.totaal, null);
  const est = bouwEnergiePortfolioAnalyse(b, {
    ...sel,
    vanaf: "2026-09-10",
    totEnMet: "2026-09-20",
    modus: "schatting",
  });
  assert.equal(est.totaal, 477.5);
  assert.equal(est.rijen[0].betrouwbaarheid, "geschat");
  assert.equal(est.rijen[0].exacte_dekking_percentage, 0);
  assert.ok(
    Math.abs(
      bouwEnergiePortfolioAnalyse(b, { ...sel, modus: "schatting" })
        .dekking_percentage -
        (16 / 30) * 100,
    ) < 1e-10,
  );
});
test("Heirstraat golden:9×11=99 vs7×11=77, no authoritative normalized output", () => {
  const b = bron();
  b.bewoners.push({ ...b.bewoners[0], id: 9 });
  b.meterstanden = [
    stand(61, "2026-09-07", 63950, 7),
    stand(71, "2026-09-18", 64120, 7),
  ];
  const a = analyse(b);
  assert.equal(a.totaal, 170);
  assert.equal(a.persoonsdagen, 99);
  assert.equal(a.per_persoon_per_week, null);
  assert.match(a.rijen[0].meldingen.join(), /spreken elkaar tegen/);
  assert.equal(170 / (77 / 7), 170 / 11);
});
test("boundary occupancy switch never counts a person twice", () => {
  assert.equal(
    berekenPersoonsdagen(
      [
        { incheckdatum: "2026-09-01", uitcheckdatum: "2026-09-10" },
        { incheckdatum: "2026-09-10", uitcheckdatum: null },
      ],
      "2026-09-01",
      "2026-10-01",
    ),
    30,
  );
});
test("zero residents preserves consumption", () => {
  const b = bron();
  b.bewoners = [];
  b.meterstanden.forEach((m) => (m.bewoners_aantal = 0));
  const a = analyse(b);
  assert.equal(a.totaal, 764);
  assert.equal(a.per_persoon_per_week, null);
});
test("lease dates clip occupancy; client change cannot silently allocate", () => {
  const b = bron();
  b.verhuurperioden[0].werkelijke_einddatum = "2026-09-15";
  b.verhuurperioden.push({
    id: 13,
    woning_id: 16,
    bedrijf_id: 5,
    startdatum: "2026-09-15",
  });
  const a = bouwEnergiePortfolioAnalyse(b, {
    ...sel,
    niveau: "bedrijf",
    bedrijfId: 4,
  });
  assert.equal(a.totaal, null);
  assert.match(a.rijen[0].meldingen.join(), /klantwissel/);
});
test("declining meters, duplicates and meter changes are excluded", () => {
  const b = bron();
  b.meterstanden[1].dagstroom_kwh = 10;
  b.meterstanden[1].elektriciteit_kwh = 10;
  assert.equal(analyse(b).totaal, null);
  const c = bron();
  c.meterstanden.push({ ...c.meterstanden[0], id: 59 });
  assert.equal(analyse(c).totaal, null);
  const d = bron();
  d.meterconfiguraties = [
    {
      woning_id: 16,
      product: "elektriciteit",
      meteridentiteit: "new",
      registertype: "enkel",
      vanaf: "2026-09-15",
      tot: null,
    },
  ];
  assert.equal(analyse(d).totaal, null);
});
test("partial registers cannot masquerade as complete electricity", () => {
  const a = stand(1, "2026-01-01", 100),
    b = stand(2, "2026-01-08", 170);
  a.nachtstroom_kwh = null;
  b.nachtstroom_kwh = null;
  assert.equal(elektriciteitsMeting(a, b).waarde, null);
  assert.equal(elektriciteitsMeting(a, b, "enkel").waarde, 70);
  b.nachtstroom_kwh = 20;
  assert.equal(elektriciteitsMeting(a, b, "dag_nacht").waarde, null);
});
test("independent total and conflicting total/register families", () => {
  const a = stand(1, "2026-01-01", 100),
    b = stand(2, "2026-01-08", 170);
  a.dagstroom_kwh = null;
  a.nachtstroom_kwh = null;
  b.dagstroom_kwh = null;
  b.nachtstroom_kwh = null;
  assert.equal(elektriciteitsMeting(a, b, "totaal").waarde, 70);
  const c = stand(1, "2026-01-01", 100),
    d = stand(2, "2026-01-08", 170);
  d.elektriciteit_kwh = 500;
  assert.equal(elektriciteitsMeting(c, d).waarde, null);
});
test("gas worst status does not invalidate electricity; critical is not a bad reading", () => {
  const b = bron();
  b.meterstanden[1].analyse_status = "onwaarschijnlijk";
  b.meterstanden[1].opvolging_nodig = true;
  b.meterstanden[1].analyse_resultaat = {
    dragers: [
      { drager: "gas", status: "onwaarschijnlijk" },
      { drager: "elektriciteit", status: "kritiek" },
    ],
  };
  assert.equal(analyse(b).totaal, 764);
  b.meterstanden[1].analyse_resultaat = {
    dragers: [{ drager: "elektriciteit", status: "onwaarschijnlijk" }],
  };
  assert.equal(analyse(b).totaal, null);
});
test("strict calendar validation includes leap days and URL arrays", () => {
  assert.throws(() => datumTijd("2026-02-30"));
  assert.throws(() => datumTijd("2026-02-29"));
  assert.ok(datumTijd("2024-02-29"));
  assert.throws(() =>
    leesSelectie({ vanaf: ["2026-09-01", "2026-09-02"] }, bron()),
  );
  assert.throws(() =>
    leesSelectie({ vanaf: "2026-10-01", tot: "2026-09-01" }, bron()),
  );
  assert.throws(() => leesSelectie({ woning: "9999" }, bron()));
});
test("housing mode clears an irrelevant client; archives explicit", () => {
  const s = leesSelectie(
    { niveau: "woning", woning: "16", bedrijf: "9999" },
    bron(),
  );
  assert.deepEqual(s.selectie.bedrijfIds, []);
  const b = bron();
  b.woningen[0].status = "gearchiveerd";
  assert.equal(analyse(b).rijen.length, 0);
  assert.equal(
    bouwEnergiePortfolioAnalyse(b, { ...sel, archief: true }).rijen.length,
    1,
  );
});
test("golden median and interpolated IQR; insufficient cohorts never signal", () => {
  assert.equal(kwartiel([10, 11, 12, 13, 100], 0.5), 12);
  assert.equal(kwartiel([10, 11, 12, 13, 100], 0.25), 11);
  assert.equal(kwartiel([10, 11, 12, 13, 100], 0.75), 13);
  assert.equal(analyse().rijen[0].signaal, "onvoldoende_data");
});
const interval: EnergieInterval = {
  woningId: 16,
  vanDatum: "2026-01-25",
  totDatum: "2026-02-05",
  bronVanaf: "2026-01-25",
  bronTot: "2026-02-05",
  bronIds: [1, 2],
  dagen: 11,
  persoonsdagen: 11,
  bedrijfIds: [4],
  waarde: 110,
  dag: 110,
  nacht: 0,
  geschat: false,
  meldingen: [],
  bezettingsconflict: false,
  betrouwbaar: true,
  anomalie: null,
};
const tariff = (
  id: string,
  van: string,
  tot: string | null,
  price: string,
): Tariefplan => ({
  id,
  product: "elektriciteit",
  eenheid: "kWh",
  valuta: "EUR",
  vanaf: van,
  tot,
  woning_id: null,
  bedrijf_id: null,
  bron: "Fictief testtarief",
  componenten: [
    {
      soort: "variabel",
      prijs: price,
      btw_percentage: "21",
      inclusief_btw: false,
    },
    {
      soort: "vast_dag",
      prijs: "0.5",
      btw_percentage: "21",
      inclusief_btw: false,
    },
  ],
});
test("tariff boundary:70×.20 +40×.30 =26; fixed5.50; no silent exact allocation", () => {
  const plans = [
    tariff("a", "2026-01-01", "2026-02-01", "0.2"),
    tariff("b", "2026-02-01", null, "0.3"),
  ];
  const exact = berekenEnergiekosten([interval], plans, "elektriciteit", "kWh");
  assert.equal(exact.totaal, null);
  assert.match(exact.ontbrekend.join(), /grensstand/);
  const est = berekenEnergiekosten(
    [interval],
    plans,
    "elektriciteit",
    "kWh",
    true,
  );
  assert.equal(est.variabel, 26);
  assert.equal(est.vast, 5.5);
  assert.equal(est.regels[0].hoeveelheid, 70);
  assert.equal(est.regels[2].hoeveelheid, 40);
  assert.equal(est.geschat, true);
  assert.equal(est.totaal, 38.12);
});
test("missing tariffs never become zero; scope precedence and overlaps", () => {
  assert.equal(
    berekenEnergiekosten([interval], [], "elektriciteit", "kWh").totaal,
    null,
  );
  const p = tariff("a", "2026-01-01", null, ".2".replace(/^\./, "0."));
  p.componenten = p.componenten.slice(0, 1);
  const w = {
    ...p,
    id: "w",
    woning_id: 16,
    componenten: [{ ...p.componenten[0], prijs: "0.1" }],
  };
  assert.equal(
    berekenEnergiekosten([interval], [p, w], "elektriciteit", "kWh", true)
      .variabel,
    11,
  );
  assert.equal(
    berekenEnergiekosten(
      [interval],
      [p, { ...p, id: "duplicate" }],
      "elektriciteit",
      "kWh",
      true,
    ).totaal,
    null,
  );
});
test("inclusive VAT exact cent arithmetic", () => {
  const p = tariff("a", "2026-01-01", null, "0.121");
  p.componenten = [{ ...p.componenten[0], inclusief_btw: true }];
  const k = berekenEnergiekosten(
    [{ ...interval, totDatum: "2026-01-26", dagen: 1, waarde: 100 }],
    [p],
    "elektriciteit",
    "kWh",
  );
  assert.equal(k.variabel, 10);
  assert.equal(k.btw, 2.1);
  assert.equal(k.totaal, 12.1);
});
test("paginates 1501 records even under a server cap lower than requested", async () => {
  const rows = Array.from({ length: 1501 }, (_, id) => ({ id }));
  const all = await leesAlleRijen(async (a, b) => ({
    data: rows.slice(a, Math.min(b + 1, a + 100)),
    error: null,
  }));
  assert.equal(all.length, 1501);
  assert.equal(all.at(-1)?.id, 1500);
});
test("pagination refuses duplicate pages or errors", async () => {
  await assert.rejects(
    () => leesAlleRijen(async () => ({ data: [{ id: 1 }], error: null })),
    /veranderden/,
  );
  await assert.rejects(
    () =>
      leesAlleRijen(async () => ({ data: null, error: { message: "failed" } })),
    /failed/,
  );
});
test("snapshot replay is independent of subsequent corrections and customer allowlist", () => {
  const b = bron();
  const snapshot = bouwEnergieSnapshot(
    b,
    [],
    sel,
    ["elektriciteit"],
    "2026-10-13T12:00:00Z",
    "user",
    "commit",
  );
  const saved = JSON.parse(JSON.stringify(snapshot));
  b.meterstanden[1].dagstroom_kwh = 70000;
  assert.equal(saved.klant.producten[0].verbruik, 764);
  const publicModel = klantSnapshot({
    ...saved.klant,
    interne_notitie: "GEHEIM",
    bewoners: [{ naam: "Privé" }],
    producten: saved.klant.producten.map((p: Record<string, unknown>) => ({
      ...p,
      kosten: { ...(p.kosten as object), geheim: "GEHEIM" },
    })),
  });
  assert.doesNotMatch(JSON.stringify(publicModel), /GEHEIM|Privé/);
  assert.equal(saved.intern.bronnen.meterstanden[1].dagstroom_kwh, 64654);
});
test("an intervention never automatically proves savings", () => {
  const r = analyse(bron(), {
    ...sel,
    vanaf: "2026-09-07",
    totEnMet: "2026-09-23",
  }).rijen[0];
  const effect = beoordeelMaatregel(
    r,
    { ...r, totaal: 382, per_persoon_per_week: 20.890625 },
    { vanaf: "2026-09-07", tot: "2026-09-23" },
    { vanaf: "2026-09-23", tot: "2026-10-09" },
  );
  assert.equal(effect.verbruiksvermindering, 382);
  assert.equal(effect.geverifieerde_besparing, null);
});
test("energy supplement is opt-in and adds exactly one PDF page", () => {
  assert.equal(alleKlantversieOnderdelen().has("energie_intelligence"), false);
  assert.equal(
    leesKlantversieOnderdelen("energie_intelligence").has(
      "energie_intelligence",
    ),
    true,
  );
  const doc = new jsPDF();
  doc.addPage();
  assert.equal(doc.getNumberOfPages(), 2);
  const s = bouwEnergieSnapshot(
    bron(),
    [],
    sel,
    ["elektriciteit", "gas", "water"],
    "2026-10-13T12:00:00Z",
    "user",
    "commit",
  );
  tekenEnergieRapportPagina(doc, s.klant, "Testpand");
  assert.equal(doc.getNumberOfPages(), 3);
});
test("monthly fixed fee does not make unchanged unit cost estimated", () => {
  const p = tariff("m", "2026-01-01", null, "0.2");
  p.componenten[1] = { ...p.componenten[1], soort: "vast_maand", prijs: "31" };
  const k = berekenEnergiekosten([interval], [p], "elektriciteit", "kWh");
  assert.equal(k.variabel, 22);
  assert.equal(k.geschat, false);
  assert.ok(k.totaal !== null);
  assert.equal(k.vast, 7 + 4.43);
});
test("different calendar windows are not a single benchmark cohort", () => {
  const b = bron();
  for (let i = 0; i < 5; i++) {
    const id = 20 + i;
    b.woningen.push({ id, adres: `Pand ${id}`, postcode: "", plaats: "" });
    b.verhuurperioden.push({ id, woning_id: id, bedrijf_id: 4 });
    b.bewoners.push({
      id: id * 10,
      verhuurperiode_id: id,
      incheckdatum: "2026-08-01",
      uitcheckdatum: null,
    });
    b.meterstanden.push(
      {
        ...stand(id * 10, `2026-09-${String(1 + i).padStart(2, "0")}`, 10, 1),
        woning_id: id,
      },
      {
        ...stand(
          id * 10 + 1,
          `2026-09-${String(11 + i).padStart(2, "0")}`,
          20,
          1,
        ),
        woning_id: id,
      },
    );
  }
  const a = bouwEnergiePortfolioAnalyse(b, { ...sel, minimaleDekking: 30 });
  assert.equal(a.mediaan_per_persoon_per_week, null);
});
