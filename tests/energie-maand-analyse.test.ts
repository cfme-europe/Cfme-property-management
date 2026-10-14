import assert from "node:assert/strict";
import test from "node:test";
import {
  bouwAnoniemeEnergieDataset,
  bouwEnergieMaandAnalyse,
  codeerEnergieAnoniemeSelectie,
  controleerEnergieMaandselectie,
  decodeerEnergieAnoniemeSelectie,
  leesEnergieMaandSelectie,
  maximumEnergieMaandwaarde,
  parseEnergieMaand,
  sorteerEnergieMaandWoningen,
} from "../src/lib/energie/maand-analyse";
import {
  bouwEnergiePortfolioAnalyse,
  type Brondata,
  type EnergieMeterstand,
} from "../src/lib/energie/portfolio-analyse";
import { berekenEnergiekosten, type Tariefplan } from "../src/lib/energie/tarieven";

function source(
  readings: Array<{ date: string; total: number }>,
  residents: Array<{ incheckdatum: string; uitcheckdatum: string | null }> = [
    { incheckdatum: "2025-01-01", uitcheckdatum: null },
  ],
): Brondata {
  const meterstanden: EnergieMeterstand[] = readings.map(
    ({ date, total }, index) => ({
      id: index + 1,
      woning_id: 10,
      opnamedatum: date,
      bewoners_aantal: 1,
      dagstroom_kwh: null,
      nachtstroom_kwh: null,
      elektriciteit_kwh: total,
      gas_m3: null,
      water_m3: null,
    }),
  );
  return {
    meterstanden,
    woningen: [
      {
        id: 10,
        adres: "Geheim adres 42",
        postcode: "1234 AB",
        plaats: "Geheime plaats",
      },
    ],
    bedrijven: [{ id: 20, naam: "Geheime klant BV" }],
    verhuurperioden: [
      {
        id: 30,
        woning_id: 10,
        bedrijf_id: 20,
        startdatum: "2025-01-01",
        werkelijke_einddatum: null,
      },
    ],
    bewoners: residents.map((resident, index) => ({
      id: 40 + index,
      verhuurperiode_id: 30,
      ...resident,
    })),
  };
}

function tariff(id: string, from: string, price: string): Tariefplan {
  return {
    id,
    product: "elektriciteit",
    eenheid: "kWh",
    valuta: "EUR",
    vanaf: from,
    tot: null,
    woning_id: 10,
    bedrijf_id: null,
    bron: "Vast testtarief",
    componenten: [
      {
        soort: "variabel",
        prijs: price,
        btw_percentage: "0",
        inclusief_btw: false,
      },
    ],
  };
}

test("kalendermaand gebruikt grenzen inclusief/exclusief en schrikkelfebruari", () => {
  assert.deepEqual(parseEnergieMaand("2024-02"), {
    maand: "2024-02",
    vanaf: "2024-02-01",
    tot: "2024-03-01",
    dagen: 29,
  });
  assert.equal(parseEnergieMaand("2026-12").tot, "2027-01-01");
  assert.throws(() => parseEnergieMaand("2026-13"), /kalendermaand/);
});

test("selectie ondersteunt niet-aaneengesloten maanden en een gekozen referentiemaand", () => {
  assert.deepEqual(
    controleerEnergieMaandselectie(
      ["2026-09", "2026-11", "2027-02", "2026-11"],
      "2026-11",
    ),
    {
      maanden: ["2026-09", "2026-11", "2027-02"],
      referentiemaand: "2026-11",
    },
  );
  assert.throws(
    () => controleerEnergieMaandselectie(["2026-09"], "2026-10"),
    /sorteermaand/,
  );
});

test("anonieme previewsessie bewaart haar geldige selectie in een cookie-token", () => {
  const selection = {
    maanden: ["2026-09", "2026-11"],
    referentiemaand: "2026-11",
    drager: "elektriciteit" as const,
    bedrijfIds: [20],
    woningIds: [10, 11],
    maat: "verbruik" as const,
    aggregatie: "persoon" as const,
  };
  const cookie = codeerEnergieAnoniemeSelectie(selection);
  assert.doesNotMatch(cookie, /Geheime klant|Geheim adres/);
  assert.deepEqual(decodeerEnergieAnoniemeSelectie(cookie), {
    maand: ["2026-09", "2026-11"],
    bedrijf: "20",
    woning: ["10", "11"],
    referentiemaand: "2026-11",
    drager: "elektriciteit",
    maat: "verbruik",
    aggregatie: "persoon",
    weergave: "anoniem",
  });
  assert.throws(() => decodeerEnergieAnoniemeSelectie("invalid;cookie"));
});

test("geaccordeerd regressievoorbeeld rekent exact toe naar 22 geselecteerde dagen", () => {
  const bron = source([
    { date: "2026-01-01", total: 1000 },
    { date: "2026-01-14", total: 2400 },
    { date: "2026-02-01", total: 5800 },
  ]);
  const analysis = bouwEnergiePortfolioAnalyse(bron, {
    niveau: "woning",
    woningId: 10,
    drager: "elektriciteit",
    vanaf: "2026-01-10",
    totEnMet: "2026-02-01",
    archief: true,
  });
  const row = analysis.rijen[0];
  const cost = berekenEnergiekosten(
    row.intervallen,
    [
      tariff("before", "2026-01-01", "2"),
      tariff("after", "2026-01-11", "4"),
    ],
    "elektriciteit",
    "kWh",
  );

  assert.ok(Math.abs(row.totaal! - 3830.769230769) < 1e-9);
  assert.equal(row.dekking_percentage, 100);
  assert.equal(row.intervallen.reduce((sum, interval) => sum + interval.dagen, 0), 22);
  assert.ok(Math.abs(cost.variabel - 15107.692307692) < 1e-9);
  assert.ok(Math.abs(cost.totaal! - 15107.692307692) < 1e-9);
  assert.equal(cost.vast, 0);
  assert.equal(cost.belastingen, 0);
  assert.equal(cost.btw, 0);
});

test("volledige maand gebruikt meterstanden buiten maandgrenzen en geen fictieve bewoning", () => {
  const bron = source(
    [
      { date: "2026-08-31", total: 100 },
      { date: "2026-10-01", total: 4100 },
    ],
    [],
  );
  const result = bouwEnergieMaandAnalyse(
    bron,
    [],
    {
      maanden: ["2026-09"],
      referentiemaand: "2026-09",
      drager: "elektriciteit",
      bedrijfIds: [20],
      woningIds: [10],
      maat: "verbruik",
      aggregatie: "persoon",
    },
    "2026-10-01",
  );
  const september = result.woningen[0].maanden[0];
  assert.equal(september.status, "volledig");
  assert.equal(september.verbruik, (4000 / 31) * 30);
  assert.equal(september.persoonsdagen, 0);
  assert.equal(september.perPersoonPerWeek, null);
  assert.equal(september.naarRato, true);
});

test("sortering plaatst grootste referentiemaand eerst en ontbrekende waarden onderaan", () => {
  const bron = source([
    { date: "2026-09-01", total: 0 },
    { date: "2026-10-01", total: 310 },
  ]);
  const analysis = bouwEnergieMaandAnalyse(
    bron,
    [],
    {
      maanden: ["2026-09"],
      referentiemaand: "2026-09",
      drager: "elektriciteit",
      bedrijfIds: [20],
      woningIds: [10],
      maat: "verbruik",
      aggregatie: "pand",
    },
  );
  const homes = [
    { ...analysis.woningen[0], id: 11, adres: "Hoger", maanden: [{ ...analysis.woningen[0].maanden[0], verbruik: 20 }] },
    { ...analysis.woningen[0], id: 12, adres: "Onbekend", maanden: [{ ...analysis.woningen[0].maanden[0], verbruik: null, status: "geen" as const }] },
    { ...analysis.woningen[0], id: 13, adres: "Lager", maanden: [{ ...analysis.woningen[0].maanden[0], verbruik: 10 }] },
  ];

  assert.deepEqual(
    sorteerEnergieMaandWoningen(homes, "2026-09", "verbruik", "pand").map(
      (home) => home.id,
    ),
    [11, 13, 12],
  );
  assert.equal(maximumEnergieMaandwaarde(homes, "verbruik", "pand"), 20);
});

test("anonieme dataset bevat alleen beperkte neutrale velden", () => {
  const bron = source([
    { date: "2026-09-01", total: 0 },
    { date: "2026-10-01", total: 310 },
  ]);
  const analysis = bouwEnergieMaandAnalyse(
    bron,
    [],
    {
      maanden: ["2026-09"],
      referentiemaand: "2026-09",
      drager: "elektriciteit",
      bedrijfIds: [20],
      woningIds: [10],
      maat: "verbruik",
      aggregatie: "pand",
    },
  );
  const dataset = bouwAnoniemeEnergieDataset(analysis);
  const serialized = JSON.stringify(dataset);

  assert.equal(dataset.woningen[0].klant, "Portefeuille A");
  assert.equal(dataset.woningen[0].pand, "Pand 01");
  assert.deepEqual(Object.keys(dataset.woningen[0]).sort(), ["klant", "maanden", "pand"]);
  assert.doesNotMatch(serialized, /Geheim|1234 AB|woning_id|bedrijf_id|postcode|bronIds/);
  assert.equal("id" in dataset.woningen[0], false);
});

test("previewvalidatie vereist expliciet klanten en panden", () => {
  const bron = source([]);
  assert.throws(
    () =>
      leesEnergieMaandSelectie(
        { weergave: "anoniem", maand: "2026-09" },
        bron,
      ),
    /Selecteer klanten en panden/,
  );
});
