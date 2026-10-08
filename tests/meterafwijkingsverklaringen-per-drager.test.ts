import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import {
  onverklaardeEnergieDragers,
} from "../src/lib/meterstanden/afwijkingsverklaringen";
import type {
  EnergieAnalyseResultaat,
} from "../src/services/energy-intelligence";

const migration = fs.readFileSync(
  "supabase/migrations/20261008120000_meterafwijkingsverklaringen_per_drager.sql",
  "utf8",
);

const analyse: EnergieAnalyseResultaat = {
  status: "verhoogd",
  van_datum: "2026-09-01",
  tot_datum: "2026-10-01",
  aantal_dagen: 30,
  bewoners_gemiddeld: 2,
  opvolging_nodig: true,
  samenvatting: "Water en elektriciteit wijken af.",
  dragers: [
    {
      drager: "water",
      eenheid: "m³",
      status: "verhoogd",
      verbruik_totaal: 20,
      per_bewoner_per_week: 2.3,
      historisch_gemiddelde: 1.8,
      afwijking_percentage: 27.8,
      referentie_periodes: 6,
      toelichting: "Waterverbruik is verhoogd.",
    },
    {
      drager: "elektriciteit",
      eenheid: "kWh",
      status: "kritiek",
      verbruik_totaal: 300,
      per_bewoner_per_week: 35,
      historisch_gemiddelde: 20,
      afwijking_percentage: 75,
      referentie_periodes: 6,
      toelichting: "Elektriciteitsverbruik is kritiek.",
    },
  ],
};

test("een opgeslagen waterverklaring wordt niet opnieuw gevraagd", () => {
  assert.deepEqual(
    onverklaardeEnergieDragers(analyse, {
      water: {
        verklaring_code: "meer_bewoners_of_bezoekers",
      },
    }),
    ["elektriciteit"],
  );
});

test("een algemene historische verklaring handelt geen drager af", () => {
  assert.deepEqual(
    onverklaardeEnergieDragers(analyse, {
      algemeen: {
        verklaring_code: "overig",
      },
    }),
    ["water", "elektriciteit"],
  );
});

test("de migratie bewaart dubbelzinnige historie zonder te gokken", () => {
  assert.match(migration, /else 'algemeen'/);
  assert.match(
    migration,
    /sla_energieverklaring_per_drager/,
  );
  assert.match(migration, /for update/);
});
