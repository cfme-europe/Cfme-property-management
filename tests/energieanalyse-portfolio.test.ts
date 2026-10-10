import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  berekenPersoonsdagen,
  bouwEnergiePortfolioAnalyse,
  type EnergieMeterstand,
} from "../src/lib/energie/portfolio-analyse";

test("telt bewonersdagen halfopen zodat een wisseldag nooit dubbel telt", () => {
  const dagen = berekenPersoonsdagen(
    [
      { incheckdatum: "2026-01-01", uitcheckdatum: null },
      { incheckdatum: "2026-01-15", uitcheckdatum: "2026-01-20" },
      { incheckdatum: "2026-02-01", uitcheckdatum: null },
    ],
    "2026-01-01",
    "2026-02-01",
  );

  assert.equal(dagen, 36);
});

function stand(
  woningId: number,
  datum: string,
  elektriciteit: number,
): EnergieMeterstand {
  return {
    woning_id: woningId,
    opnamedatum: datum,
    bewoners_aantal: 0,
    dagstroom_kwh: null,
    nachtstroom_kwh: null,
    elektriciteit_kwh: elektriciteit,
    gas_m3: null,
    water_m3: null,
  };
}

function brondata(verbruiken: number[]) {
  return {
    meterstanden: verbruiken.flatMap((verbruik, index) => [
      stand(index + 1, "2026-01-01", 0),
      stand(index + 1, "2026-01-08", verbruik),
    ]),
    woningen: verbruiken.map((_, index) => ({
      id: index + 1,
      adres: `Teststraat ${index + 1}`,
      postcode: "1000 AA",
      plaats: "Teststad",
    })),
    bedrijven: [
      { id: 1, naam: "Klant A" },
      { id: 2, naam: "Klant B" },
    ],
    verhuurperioden: verbruiken.map((_, index) => ({
      id: index + 1,
      woning_id: index + 1,
      bedrijf_id: index < 2 ? 1 : 2,
    })),
    bewoners: verbruiken.flatMap((_, index) => {
      const aantal = index === 0 ? 2 : 1;
      return Array.from({ length: aantal }, (__, bewonerIndex) => ({
        id: index * 10 + bewonerIndex + 1,
        verhuurperiode_id: index + 1,
        incheckdatum: "2026-01-01",
        uitcheckdatum: null,
      }));
    }),
  };
}

test("berekent portefeuillewaarde gewogen uit totaal verbruik en persoonsdagen", () => {
  const analyse = bouwEnergiePortfolioAnalyse(brondata([100, 100]), {
    niveau: "totaal",
    drager: "elektriciteit",
    vanaf: "2026-01-01",
    totEnMet: "2026-01-08",
  });

  assert.equal(analyse.totaal, 200);
  assert.equal(analyse.persoonsdagen, 21);
  assert.equal(analyse.per_persoon_per_week, 200 / 3);
  assert.notEqual(
    analyse.per_persoon_per_week,
    analyse.rijen.reduce((som, rij) => som + rij.per_persoon_per_week, 0) /
      analyse.rijen.length,
  );
});

test("filtert klant exact via bewoner en verhuurperiode", () => {
  const analyse = bouwEnergiePortfolioAnalyse(brondata([10, 20, 30]), {
    niveau: "bedrijf",
    bedrijfId: 1,
    drager: "elektriciteit",
    vanaf: "2026-01-01",
    totEnMet: "2026-01-08",
  });

  assert.deepEqual(
    analyse.rijen.map((rij) => rij.woning_id).sort((a, b) => a - b),
    [1, 2],
  );
});

test("markeert statistische uitschieters pas met voldoende vergelijkbare panden", () => {
  const analyse = bouwEnergiePortfolioAnalyse(brondata([10, 11, 12, 13, 100]), {
    niveau: "totaal",
    drager: "elektriciteit",
    vanaf: "2026-01-01",
    totEnMet: "2026-01-08",
  });

  assert.equal(analyse.panden_in_benchmark, 5);
  assert.equal(analyse.rijen[0].woning_id, 5);
  assert.equal(analyse.rijen[0].signaal, "uitschieter");
});

test("bedrijvenoverzicht ontsluit de energieanalyse", async () => {
  const bron = await readFile("src/app/bedrijven/page.tsx", "utf8");
  const pagina = await readFile(
    "src/app/bedrijven/energieanalyse/page.tsx",
    "utf8",
  );

  assert.match(bron, /href="\/bedrijven\/energieanalyse"/);
  assert.match(pagina, /Alle panden/);
  assert.match(pagina, /Per klant/);
  assert.match(pagina, /Eén pand/);
  assert.match(pagina, /Persoonsdagen/);
});
