import assert from "node:assert/strict";
import test from "node:test";
import {
  bouwAnoniemeEnergieDataset,
  bouwEnergieMaandAnalyse,
  codeerEnergieAnoniemeSelectie,
  controleerEnergieMaandselectie,
  decodeerEnergieAnoniemeSelectie,
  leesEnergieMaandSelectie,
  herstelEnergieSelectieNaValidatiefout,
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

function multiCompanySource(): Brondata {
  const bron = source([]);
  bron.woningen.push(
    {
      id: 11,
      adres: "Ander geheim adres 11",
      postcode: "2345 BC",
      plaats: "Verborgen plaats",
    },
    {
      id: 12,
      adres: "Derde geheim adres 12",
      postcode: "3456 CD",
      plaats: "Verborgen plaats",
    },
  );
  bron.bedrijven.push({ id: 21, naam: "Andere geheime klant BV" });
  bron.verhuurperioden[0].werkelijke_einddatum = "2026-10-01";
  bron.verhuurperioden.push(
    {
      id: 31,
      woning_id: 11,
      bedrijf_id: 21,
      startdatum: "2026-01-01",
      werkelijke_einddatum: null,
    },
    {
      id: 32,
      woning_id: 12,
      bedrijf_id: 20,
      startdatum: "2026-10-01",
      werkelijke_einddatum: null,
    },
  );
  return bron;
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

test("een expliciet lege maandselectie wordt afgewezen in plaats van vervangen", () => {
  const bron = source([]);
  assert.throws(
    () =>
      leesEnergieMaandSelectie(
        { maand: undefined, maanden_ingediend: "1" },
        bron,
      ),
    /Selecteer minimaal één kalendermaand/,
  );
  assert.deepEqual(
    leesEnergieMaandSelectie({}, bron).selectie.maanden,
    ["2026-09"],
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
    woning: ["10", "11"],
    woningselectie: "aangepast",
    referentiemaand: "2026-11",
    drager: "elektriciteit",
    maat: "verbruik",
    aggregatie: "persoon",
    weergave: "anoniem",
  });
  assert.equal(decodeerEnergieAnoniemeSelectie(cookie).bedrijf, undefined);
  assert.throws(() => decodeerEnergieAnoniemeSelectie("invalid;cookie"));
});

test("klantselectie neemt automatisch alle relevante panden mee", () => {
  const bron = multiCompanySource();
  const { selectie } = leesEnergieMaandSelectie(
    {
      weergave: "klant",
      bedrijf: "20",
      maand: "2026-09",
    },
    bron,
  );

  assert.deepEqual(selectie.woningIds, [10]);
  assert.equal(selectie.woningselectie, "automatisch");
});

test("automatische selectie zonder relevante panden blijft leeg in plaats van alle panden te tonen", () => {
  const bron = multiCompanySource();
  const selectie = leesEnergieMaandSelectie(
    {
      weergave: "intern",
      bedrijf: "20",
      maand: "2024-09",
    },
    bron,
  ).selectie;

  assert.deepEqual(selectie.woningIds, []);
  assert.equal(selectie.woningselectie, "automatisch");
  assert.deepEqual(bouwEnergieMaandAnalyse(bron, [], selectie).woningen, []);
});

test("meerdere klanten nemen relevante panden mee en een aangepaste selectie sluit panden uit", () => {
  const bron = multiCompanySource();
  const automatic = leesEnergieMaandSelectie(
    {
      weergave: "intern",
      bedrijf: ["20", "21"],
      maand: "2026-09",
    },
    bron,
  ).selectie;
  const adjusted = leesEnergieMaandSelectie(
    {
      weergave: "intern",
      bedrijf: ["20", "21"],
      woning: "11",
      woningselectie: "aangepast",
      maand: "2026-09",
    },
    bron,
  ).selectie;

  assert.deepEqual(automatic.woningIds, [10, 11]);
  assert.deepEqual(adjusted.woningIds, [11]);
  assert.equal(adjusted.woningselectie, "aangepast");
});

test("maandwijzigingen verversen automatische panden en weren verborgen niet-passende panden", () => {
  const bron = multiCompanySource();
  const nextMonth = leesEnergieMaandSelectie(
    {
      weergave: "intern",
      bedrijf: "20",
      maand: "2026-10",
    },
    bron,
  ).selectie;

  assert.deepEqual(nextMonth.woningIds, [12]);
  assert.throws(
    () =>
      leesEnergieMaandSelectie(
        {
          weergave: "intern",
          bedrijf: "20",
          woning: "10",
          woningselectie: "aangepast",
          maand: "2026-10",
        },
        bron,
      ),
    /hoort niet bij de gekozen klant/,
  );
});

test("expliciet geen panden blijft leeg en wordt niet als alle panden geïnterpreteerd", () => {
  const bron = multiCompanySource();
  const selection = leesEnergieMaandSelectie(
    {
      weergave: "intern",
      bedrijf: "20",
      woningselectie: "leeg",
      maand: "2026-09",
    },
    bron,
  ).selectie;
  const analysis = bouwEnergieMaandAnalyse(bron, [], selection);

  assert.deepEqual(selection.woningIds, []);
  assert.equal(selection.woningselectie, "leeg");
  assert.deepEqual(analysis.woningen, []);
});

test("anonieme selectie heeft alleen pandIds nodig en leidt toegankelijke klantrelaties af", () => {
  const bron = multiCompanySource();
  const { selectie, weergave } = leesEnergieMaandSelectie(
    {
      weergave: "anoniem",
      woning: "11",
      woningselectie: "aangepast",
      maand: "2026-09",
    },
    bron,
  );

  assert.equal(weergave, "anoniem");
  assert.deepEqual(selectie.woningIds, [11]);
  assert.deepEqual(selectie.bedrijfIds, [21]);
});

test("anonieme selectie weigert lege, ontbrekende en niet-toegankelijke pandIds", () => {
  const bron = multiCompanySource();
  assert.throws(
    () =>
      leesEnergieMaandSelectie(
        { weergave: "anoniem", maand: "2026-09" },
        bron,
      ),
    /Selecteer minimaal één pand/,
  );
  assert.throws(
    () =>
      leesEnergieMaandSelectie(
        {
          weergave: "anoniem",
          woning: "999",
          maand: "2026-09",
        },
        bron,
      ),
    /Ongeldige selectie voor woning/,
  );

  bron.bedrijven = [];
  assert.throws(
    () =>
      leesEnergieMaandSelectie(
        {
          weergave: "anoniem",
          woning: "11",
          maand: "2026-09",
        },
        bron,
      ),
    /niet beschikbaar voor de gekozen maanden/,
  );
});

test("foutterugkeer behoudt maanden en instellingen en maakt de lege selectie expliciet", () => {
  const restored = herstelEnergieSelectieNaValidatiefout(
    {
      weergave: "anoniem",
      maand: ["2026-09", "2026-11"],
      referentiemaand: "2026-11",
      drager: "gas",
      maat: "kosten",
      aggregatie: "pand",
      woningselectie: "leeg",
    },
    "geen-panden",
  );

  assert.deepEqual(restored, {
    maand: ["2026-09", "2026-11"],
    referentiemaand: "2026-11",
    drager: "gas",
    maat: "kosten",
    aggregatie: "pand",
    woningselectie: "leeg",
    weergave: "selectie",
    fout: "geen-panden",
  });
});

test("foutterugkeer verwijdert uitsluitend een ongeldige pand-ID en bewaart overige invoer", () => {
  const restored = herstelEnergieSelectieNaValidatiefout(
    {
      maand: ["2026-09"],
      referentiemaand: "2026-09",
      woning: "999",
      woningselectie: "aangepast",
      drager: "water",
      maat: "verbruik",
      aggregatie: "persoon",
    },
    "ongeldige-selectie",
    new Error("Ongeldige selectie voor woning."),
  );

  assert.deepEqual(restored, {
    maand: ["2026-09"],
    referentiemaand: "2026-09",
    woningselectie: "leeg",
    drager: "water",
    maat: "verbruik",
    aggregatie: "persoon",
    weergave: "selectie",
    fout: "ongeldige-selectie",
  });
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

test("Heirstraat-achtige maandnorm gebruikt bewonersdagen ondanks afwijkend meteraantal", () => {
  const bron = source(
    [
      { date: "2026-09-01", total: 0 },
      { date: "2026-09-07", total: 23 },
      { date: "2026-09-18", total: 112 },
      { date: "2026-10-05", total: 213 },
    ],
    Array.from({ length: 9 }, () => ({
      incheckdatum: "2026-09-01",
      uitcheckdatum: "2026-10-01",
    })),
  );
  bron.meterstanden.forEach((meter) => {
    meter.bewoners_aantal = 1;
  });

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
    "2026-10-05",
  );
  const september = result.woningen[0].maanden[0];
  const expected = ((23 + 89 + (101 * 13) / 17) / 270) * 7;

  assert.equal(september.status, "volledig");
  assert.equal(september.dekking, 100);
  assert.equal(september.persoonsdagen, 270);
  assert.ok(
    Math.abs(september.verbruik! - (23 + 89 + (101 * 13) / 17)) < 1e-10,
  );
  assert.ok(Math.abs(september.perPersoonPerWeek! - expected) < 1e-10);
  assert.equal(Number(september.perPersoonPerWeek!.toFixed(2)), 4.91);
  assert.equal(september.laatsteMeetdatum, "2026-10-05");
  assert.equal(september.periodes.at(-1)?.bronTot, "2026-10-05");
  assert.ok(september.verbruik !== null);
  assert.ok(
    september.waarschuwingen.some((warning) =>
      warning.includes("Bewonersadministratie en meteropname spreken elkaar tegen"),
    ),
  );
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

  assert.equal(dataset.woningen[0].pand, "Pand 01");
  assert.deepEqual(Object.keys(dataset.woningen[0]).sort(), ["maanden", "pand"]);
  assert.doesNotMatch(
    serialized,
    /Geheim|1234 AB|woning_id|bedrijf_id|postcode|bronIds|adres|klant|bedrijfIds|woningIds/,
  );
  assert.equal("id" in dataset.woningen[0], false);
});

test("anonieme pandlabels zijn portefeuillebreed neutraal en blijven gelijk voor iedere gekozen maand", () => {
  const bron = multiCompanySource();
  const analysis = bouwEnergieMaandAnalyse(
    bron,
    [],
    {
      maanden: ["2026-09", "2026-10"],
      referentiemaand: "2026-09",
      drager: "elektriciteit",
      bedrijfIds: [20, 21],
      woningIds: [10, 11],
      woningselectie: "aangepast",
      maat: "verbruik",
      aggregatie: "pand",
    },
  );
  const dataset = bouwAnoniemeEnergieDataset(analysis);
  const labels = dataset.woningen.map((woning) => woning.pand);
  const labelsById = new Map(
    analysis.woningen.map((woning, index) => [
      woning.id,
      dataset.woningen[index].pand,
    ]),
  );
  const reversed = bouwAnoniemeEnergieDataset({
    ...analysis,
    woningen: [...analysis.woningen].reverse(),
  });
  const reversedLabelsById = new Map(
    [...analysis.woningen]
      .reverse()
      .map((woning, index) => [woning.id, reversed.woningen[index].pand]),
  );

  assert.deepEqual(labels.sort(), ["Pand 01", "Pand 02"]);
  assert.deepEqual(reversedLabelsById, labelsById);
  assert.ok(dataset.woningen.every((woning) => woning.maanden.length === 2));
});

test("anonieme presentatie vereist een expliciete pandselectie maar geen klantselectie", () => {
  const bron = source([]);
  assert.throws(
    () =>
      leesEnergieMaandSelectie(
        { weergave: "anoniem", maand: "2026-09" },
        bron,
      ),
    /Selecteer minimaal één pand/,
  );
  assert.equal(
    leesEnergieMaandSelectie(
      {
        weergave: "anoniem",
        woning: "10",
        maand: "2026-09",
      },
      bron,
    ).selectie.bedrijfIds[0],
    20,
  );
});
