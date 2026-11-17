import test from "node:test";
import assert from "node:assert/strict";
import {
  berekenSaldoMaand,
  bouwVoorschotSaldi,
  controleerAfspraak,
  type Jaarprijs,
  type VoorschotAfspraak,
} from "../src/lib/energie/voorschotten";
import type {
  Brondata,
  EnergieInterval,
} from "../src/lib/energie/portfolio-analyse";
import {
  klantTijdlijn,
  type TijdlijnRapport,
} from "../src/lib/energie/tijdlijn-rapport";
const prijs: Jaarprijs = {
  woning_id: 1,
  jaar: 2026,
  stroomtype: "dag_nacht",
  stroom: null,
  dag: 0.3,
  nacht: 0.2,
  gas: 1.2,
  water: 2,
  vast_jaar: 365,
  stroom_actief: true,
  gas_actief: true,
  water_actief: true,
};
const afspraak: VoorschotAfspraak = {
  verhuurperiode_id: 1,
  vanaf: "2026-09-01",
  tot: null,
  startsaldo: 50,
  voorschotten: [{ vanaf: "2026-09-01", bedrag: 200 }],
};
const interval = (
  waarde: number,
  dag: number | null = null,
  nacht: number | null = null,
  vanDatum = "2026-09-01",
  totDatum = "2026-10-01",
) =>
  ({
    waarde,
    dag,
    nacht,
    vanDatum,
    totDatum,
    betrouwbaar: true,
    geschat: false,
  }) as EnergieInterval;
const intervallen = {
  elektriciteit: [interval(100, 60, 40)],
  gas: [interval(30)],
  water: [interval(5)],
};
test("all-product costs subtract once: day/night 26 + gas36 + water10 + fixed30 =102", () => {
  const m = berekenSaldoMaand(
    "2026-09",
    "2026-09-01",
    "2026-10-01",
    false,
    prijs,
    afspraak,
    intervallen,
  );
  assert.equal(m.kosten, 102);
  assert.equal(m.voorschot, 200);
  assert.equal(m.verschil, 98);
});
test("missing price blocks only complete financial total, explicit zero remains valid", () => {
  const m = berekenSaldoMaand(
    "2026-09",
    "2026-09-01",
    "2026-10-01",
    false,
    { ...prijs, gas: null },
    afspraak,
    intervallen,
  );
  assert.equal(m.kosten, null);
  assert.equal(m.verschil, null);
  assert.equal(m.bekend, 66);
  assert.equal(
    berekenSaldoMaand(
      "2026-09",
      "2026-09-01",
      "2026-10-01",
      false,
      { ...prijs, gas: 0 },
      afspraak,
      intervallen,
    ).kosten,
    66,
  );
});
test("partial month and midmonth advance change prorate by actual calendar days", () => {
  const a = {
    ...afspraak,
    vanaf: "2026-09-11",
    voorschotten: [
      { vanaf: "2026-09-11", bedrag: 300 },
      { vanaf: "2026-09-21", bedrag: 600 },
    ],
  };
  const m = berekenSaldoMaand(
    "2026-09",
    "2026-09-11",
    "2026-10-01",
    false,
    { ...prijs, stroom_actief: false, gas_actief: false, water_actief: false },
    a,
    { elektriciteit: [], gas: [], water: [] },
  );
  assert.equal(m.voorschot, 300);
  assert.equal(m.kosten, 20);
  assert.equal(m.verschil, 280);
});
test("missing night register and incomplete meter coverage cannot produce complete costs", () => {
  assert.equal(
    berekenSaldoMaand(
      "2026-09",
      "2026-09-01",
      "2026-10-01",
      false,
      prijs,
      afspraak,
      { ...intervallen, elektriciteit: [interval(100, 100, null)] },
    ).kosten,
    null,
  );
  assert.equal(
    berekenSaldoMaand(
      "2026-09",
      "2026-09-01",
      "2026-10-01",
      false,
      prijs,
      afspraak,
      { ...intervallen, gas: [interval(20, null, null, "2026-09-10")] },
    ).kosten,
    null,
  );
});
test("invalid, duplicate and out-of-contract advance dates rejected", () => {
  assert.throws(() =>
    controleerAfspraak({
      ...afspraak,
      voorschotten: [{ vanaf: "2026-02-30", bedrag: 5 }],
    }),
  );
  assert.throws(() =>
    controleerAfspraak({
      ...afspraak,
      voorschotten: [...afspraak.voorschotten, ...afspraak.voorschotten],
    }),
  );
});
test("cumulative balance uses start balance across years; expired lease stops costs and advances", () => {
  const bron: Brondata = {
    woningen: [{ id: 1, adres: "Test", postcode: "", plaats: "" }],
    bedrijven: [{ id: 1, naam: "Klant" }],
    verhuurperioden: [
      {
        id: 1,
        woning_id: 1,
        bedrijf_id: 1,
        startdatum: "2025-12-01",
        werkelijke_einddatum: "2026-02-01",
      },
    ],
    bewoners: [],
    meterstanden: [],
  };
  const p = {
    ...prijs,
    stroom_actief: false,
    gas_actief: false,
    water_actief: false,
    vast_jaar: 0,
  };
  const a = {
    ...afspraak,
    vanaf: "2025-12-01",
    voorschotten: [{ vanaf: "2025-12-01", bedrag: 100 }],
  };
  const r = bouwVoorschotSaldi(
    bron,
    [p, { ...p, jaar: 2025 }],
    [a],
    "2026-11-17",
  )[0];
  assert.deepEqual(
    r.maanden.map((m) => m.saldo),
    [150, 250],
  );
  const onbekend = bouwVoorschotSaldi(bron, [p], [a], "2026-11-17")[0];
  assert.equal(onbekend.maanden[1].verschil, 100);
  assert.equal(onbekend.maanden[1].saldo, null);
});
test("customer projection freezes only displayed months without recalculating cumulative saldo", () => {
  const data = {
    jaar: 2026,
    vergelijkjaar: null,
    van: 8,
    tot: 8,
    persoon: false,
    grafieken: [],
    saldo: {
      woning_id: 1,
      verhuurperiode_id: 1,
      bedrijf_id: 1,
      adres: "A",
      klant: "K",
      vanaf: "2026-01-01",
      startsaldo: 0,
      maanden: [
        {
          maand: "2026-09",
          vanaf: "2026-09-01",
          tot: "2026-10-01",
          lopend: false,
          kosten: 10,
          bekend: 10,
          voorschot: 20,
          verschil: 10,
          saldo: 90,
          ontbrekend: [],
          producten: [],
          bewoners: ["private"],
        },
      ],
      geheim: "private",
    },
  } as unknown as TijdlijnRapport;
  const safe = klantTijdlijn(data);
  assert.equal(safe.saldo?.maanden[0].saldo, 90);
  assert.ok(!JSON.stringify(safe).includes("private"));
  data.saldo!.maanden[0].saldo = 999;
  assert.equal(safe.saldo?.maanden[0].saldo, 90);
});
