import assert from "node:assert/strict";
import test from "node:test";
import { bouwEnergiePeriodeAnalyse } from "../src/lib/energie/periode-analyse";
import type { Brondata } from "../src/lib/energie/portfolio-analyse";

const stand = (
  id: number,
  datum: string,
  dag: number | null,
  nacht: number | null,
  extra: Record<string, unknown> = {},
) => ({
  id,
  woning_id: 1,
  opnamedatum: datum,
  bewoners_aantal: 10,
  dagstroom_kwh: dag,
  nachtstroom_kwh: nacht,
  elektriciteit_kwh: dag === null && nacht === null ? null : (dag ?? 0) + (nacht ?? 0),
  gas_m3: null,
  water_m3: null,
  ...extra,
});

function bron(meterstanden: Brondata["meterstanden"], config = true): Brondata {
  return {
    woningen: [{ id: 1, adres: "Fixture", postcode: "", plaats: "", status: "actief" }],
    bedrijven: [{ id: 4, naam: "Klant" }],
    verhuurperioden: [{ id: 12, woning_id: 1, bedrijf_id: 4, startdatum: "2026-08-01" }],
    bewoners: Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      verhuurperiode_id: 12,
      incheckdatum: "2026-08-01",
      uitcheckdatum: null,
    })),
    meterstanden,
    meterconfiguraties: config
      ? [{ woning_id: 1, product: "elektriciteit", meteridentiteit: "x", registertype: "enkel", vanaf: "2026-08-01", tot: null }]
      : [],
  };
}

const bundes = bron([
  stand(1, "2026-08-25", 11858, null),
  stand(2, "2026-09-07", 12148, null),
  stand(3, "2026-09-18", 12433, null),
  stand(4, "2026-10-06", 12875, null),
  stand(5, "2026-10-19", 13140, null),
]);
const run = (b: Brondata, p: Record<string, string>) =>
  bouwEnergiePeriodeAnalyse(b, { vanaf: "2026-09-01", drager: "elektriciteit", ...p });

test("exclusive end 20-10 and 19-10 give the stated Bundes results; tot_en_met adds one day", () => {
  const tot20 = run(bundes, { tot: "2026-10-20" });
  const tot19 = run(bundes, { tot: "2026-10-19" });
  const tem19 = run(bundes, { tot_en_met: "2026-10-19" });
  assert.equal(tot20.selectie.totEnMet, "2026-10-20");
  assert.equal(tot19.selectie.totEnMet, "2026-10-19");
  assert.equal(tem19.selectie.totEnMet, "2026-10-20");
  assert.ok(Math.abs(tot20.analyse.rijen[0].totaal! - 1146.230769) < 1e-6);
  assert.equal(tot20.analyse.rijen[0].persoonsdagen, 490);
  assert.ok(Math.abs(tot19.analyse.rijen[0].totaal! - 1125.846154) < 1e-6);
  assert.equal(tot19.analyse.rijen[0].persoonsdagen, 480);
});

test("exclusive end dates are never shown as t/m", async () => {
  const { readFile } = await import("node:fs/promises");
  for (const f of [
    "src/components/energie/EnergiePeriodeAnalysePagina.tsx",
    "src/components/energie/EnergieAnalyseFilterFormulier.tsx",
  ]) {
    const s = await readFile(f, "utf8");
    assert.doesNotMatch(s, /t\/m|tot en met/, f);
  }
  const m = await readFile("src/components/energie/EnergieMaandAnalysePagina.tsx", "utf8");
  assert.doesNotMatch(m, /\{month\.vanaf\} t\/m/);
});

test("missing night reading: valid pair stays, failing pairs expose stored readings and are a partial total", () => {
  const b = bron(
    [
      stand(67, "2026-09-18", 13860, 12287),
      stand(84, "2026-10-06", 14128, 12515),
      stand(96, "2026-10-19", 14300, null),
      stand(100, "2026-10-20", 14320, 12700),
    ],
    false,
  );
  const rij = run(b, { vanaf: "2026-09-18", tot: "2026-10-20", modus: "exact" }).analyse.rijen[0];
  assert.equal(rij.totaal, 496);
  const mislukt = rij.intervallen.filter((i) => i.waarde === null);
  assert.equal(mislukt.length, 2);
  for (const i of mislukt) {
    assert.ok(i.gebruikteStanden.some((s) => s.register === "dagstroom_kwh" && s.begin !== null));
    assert.match(i.meldingen.join(" "), /leeg nachtveld bewijst niet/);
  }
});

test("opvolging warning names the opname and carrier; stale stored status is labelled historical", () => {
  const b = bron([
    stand(1, "2026-09-01", 100, null, { updated_at: "2026-10-10T10:00:00Z" }),
    stand(2, "2026-09-11", 200, null, {
      geanalyseerd_at: "2026-09-12T10:00:00Z",
      analyse_resultaat: { dragers: [{ drager: "gas", status: "kritiek" }] },
      opvolging_nodig: true,
    }),
  ]);
  const tekst = run(b, { tot: "2026-09-11" }).analyse.rijen[0].meldingen.join(" ");
  assert.match(tekst, /opname 2 \(2026-09-11\)\) voor gas/);
  assert.match(tekst, /geen aantoonbare invloed op de elektriciteit-berekening/);

  const verouderd = bron([
    stand(1, "2026-09-01", 100, null, { updated_at: "2026-10-10T10:00:00Z" }),
    stand(2, "2026-09-11", 200, null, {
      geanalyseerd_at: "2026-09-12T10:00:00Z",
      analyse_resultaat: { dragers: [{ drager: "elektriciteit", status: "onwaarschijnlijk" }] },
    }),
  ]);
  const t2 = run(verouderd, { tot: "2026-09-11" }).analyse.rijen[0];
  assert.match(t2.meldingen.join(" "), /historische status.*geen actuele rekenfout/);
  assert.equal(t2.totaal, 100);
});
