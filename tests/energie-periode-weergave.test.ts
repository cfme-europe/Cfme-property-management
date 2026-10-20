import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  bouwEnergiePeriodeAnalyse,
  maakEnergiePeriodeCsv,
} from "../src/lib/energie/periode-analyse";
import type { Brondata } from "../src/lib/energie/portfolio-analyse";

function source(): Brondata {
  return {
    woningen: [
      { id: 16, adres: "Testpand", postcode: "", plaats: "", status: "actief" },
    ],
    bedrijven: [{ id: 4, naam: "Klant" }],
    verhuurperioden: [
      { id: 12, woning_id: 16, bedrijf_id: 4, startdatum: "2026-09-01" },
    ],
    bewoners: Array.from({ length: 7 }, (_, index) => ({
      id: index + 1,
      verhuurperiode_id: 12,
      incheckdatum: "2026-09-01",
      uitcheckdatum: null,
    })),
    meterstanden: [
      {
        id: 1,
        woning_id: 16,
        opnamedatum: "2026-09-01",
        bewoners_aantal: 0,
        dagstroom_kwh: 100,
        nachtstroom_kwh: null,
        elektriciteit_kwh: 100,
        gas_m3: null,
        water_m3: null,
      },
      {
        id: 2,
        woning_id: 16,
        opnamedatum: "2026-09-27",
        bewoners_aantal: 99,
        dagstroom_kwh: 360,
        nachtstroom_kwh: null,
        elektriciteit_kwh: 360,
        gas_m3: null,
        water_m3: null,
      },
    ],
    meterconfiguraties: [
      {
        woning_id: 16,
        product: "elektriciteit",
        meteridentiteit: "single-register-fixture",
        registertype: "enkel",
        vanaf: "2026-09-01",
        tot: null,
      },
    ],
  };
}

test("free date route sends exclusive boundaries to shared default estimate and CSV calculation", () => {
  const b = source();
  const period = bouwEnergiePeriodeAnalyse(b, {
    vanaf: "2026-09-01",
    tot: "2026-10-20",
    drager: "elektriciteit",
  });
  const shorter = bouwEnergiePeriodeAnalyse(b, {
    vanaf: "2026-09-01",
    tot: "2026-10-01",
    drager: "elektriciteit",
  });
  const partial = bouwEnergiePeriodeAnalyse(b, {
    vanaf: "2026-09-10",
    tot: "2026-10-20",
    drager: "elektriciteit",
  });

  assert.equal(period.selectie.totEnMet, "2026-10-20");
  assert.equal(period.selectie.modus, "schatting");
  assert.equal(period.analyse.rijen[0].dekking_percentage, (26 / 49) * 100);
  assert.equal(period.analyse.rijen[0].geschatte_dagen, 23);
  assert.equal(period.analyse.rijen[0].totaal, 490);
  assert.equal(period.analyse.rijen[0].persoonsdagen, 343);
  assert.equal(period.analyse.rijen[0].per_persoon_per_week, 10);
  assert.equal(shorter.analyse.rijen[0].totaal, 300);

  const csv = maakEnergiePeriodeCsv(period.analyse);
  const partialCsv = maakEnergiePeriodeCsv(partial.analyse);
  assert.match(csv, /Meetdekking procent/);
  assert.match(csv, /gemeten/);
  assert.match(csv, /Geschat/);
  assert.match(csv, /single-register-fixture/);
  assert.match(csv, /"2026-09-27";"2026-10-20"/);
  assert.equal(partial.analyse.rijen[0].totaal, 400);
  assert.match(partialCsv, /naar_rato/);
});

test("range UI is connected to its own route and retains shared calculation export", async () => {
  const page = await readFile(
    "src/app/bedrijven/energieanalyse/periode/page.tsx",
    "utf8",
  );
  const form = await readFile(
    "src/components/energie/EnergieAnalyseFilterFormulier.tsx",
    "utf8",
  );
  const fields = await readFile(
    "src/components/energie/EnergieAnalyseDatumvelden.tsx",
    "utf8",
  );
  const exportRoute = await readFile(
    "src/app/bedrijven/energieanalyse/periode/export/route.ts",
    "utf8",
  );
  const monthView = await readFile(
    "src/components/energie/EnergieMaandAnalysePagina.tsx",
    "utf8",
  );

  assert.match(page, /EnergiePeriodeAnalysePagina/);
  assert.match(form, /\/bedrijven\/energieanalyse\/periode\?/);
  assert.match(form, /name="modus"/);
  assert.match(form, /value="exact"/);
  assert.match(fields, /eindeExclusief/);
  assert.match(fields, /parameterNaam=\{eindeExclusief \? "tot" : "tot_en_met"\}/);
  assert.match(exportRoute, /bouwEnergiePeriodeAnalyse/);
  assert.match(exportRoute, /maakEnergiePeriodeCsv/);
  assert.match(monthView, /href="\/bedrijven\/energieanalyse\/periode"/);
});
