import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import test from "node:test";
import { bouwEnergiePortfolioAnalyse } from "../src/lib/energie/portfolio-analyse";
import type {
  Brondata,
  EnergieMeterstand,
  EnergieBewoner,
  EnergieVerhuurperiode,
  Meterconfiguratie,
} from "../src/lib/energie/portfolio-analyse";

test("bewoners en meterconfiguraties uit de bestaande opslagvorm voeden de analyse", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table public.verhuurperiodes (
        id bigint primary key,
        woning_id bigint not null,
        bedrijf_id bigint not null,
        startdatum date,
        werkelijke_einddatum date
      );
      create table public.bewoners (
        id bigint primary key,
        verhuurperiode_id bigint not null,
        incheckdatum date not null,
        uitcheckdatum date
      );
      create table public.energie_meterconfiguraties (
        id text primary key,
        woning_id bigint not null,
        product text not null,
        meteridentiteit text not null,
        registertype text not null,
        vanaf date not null,
        tot date
      );
      create table public.meterstanden (
        id bigint primary key,
        woning_id bigint not null,
        opnamedatum date not null,
        bewoners_aantal integer not null,
        dagstroom_kwh numeric,
        nachtstroom_kwh numeric,
        elektriciteit_kwh numeric,
        gas_m3 numeric,
        water_m3 numeric
      );
      insert into public.verhuurperiodes values
        (12, 16, 4, '2026-09-01', '2026-09-11'),
        (13, 16, 5, '2026-09-11', null);
      insert into public.bewoners (id, verhuurperiode_id, incheckdatum, uitcheckdatum)
      select n, 12, '2026-09-01', '2026-09-11'
      from generate_series(1, 6) n;
      insert into public.bewoners (id, verhuurperiode_id, incheckdatum, uitcheckdatum)
      select n, 13, '2026-09-11', null
      from generate_series(7, 14) n;
      insert into public.energie_meterconfiguraties
        (id, woning_id, product, meteridentiteit, registertype, vanaf, tot)
      values ('config-1', 16, 'elektriciteit', 'meter-enkel-16', 'enkel', '2026-09-01', null);
      insert into public.meterstanden values
        (1, 16, '2026-09-01', 99, 100, null, 100, null, null),
        (2, 16, '2026-10-01', 1, 400, null, 400, null, null);
    `);

    const bewonersForm = readFileSync(
      "src/components/bewoners/BewonerForm.tsx",
      "utf8",
    );
    const bewonersService = readFileSync("src/services/bewoners.ts", "utf8");
    const sourceService = readFileSync(
      "src/services/energieanalyse-server.ts",
      "utf8",
    );
    const meterAction = readFileSync(
      "src/app/bedrijven/energieanalyse/actions.ts",
      "utf8",
    );
    const meterForm = readFileSync(
      "src/app/bedrijven/energieanalyse/beheer/page.tsx",
      "utf8",
    );

    assert.match(bewonersForm, /incheckdatum,\s*uitcheckdatum/);
    assert.match(bewonersService, /\.from\("bewoners"\)\s*\.insert\(geldig\)/);
    assert.match(sourceService, /read\("bewoners",\s*"id, verhuurperiode_id, incheckdatum, uitcheckdatum"\)/);
    assert.match(sourceService, /startdatum, werkelijke_einddatum/);
    assert.match(meterAction, /registertype:\s*text\(f,\s*"registertype"\)/);
    assert.match(meterAction, /\.from\("energie_meterconfiguraties"\)\s*\.insert\(input\)/);
    assert.match(meterForm, /<option value="enkel">[\s\S]*?Enkel register \(dagstroomveld\)/);

    const { rows: residentRows } = await db.query<{
      id: number;
      verhuurperiode_id: number;
      incheckdatum: string;
      uitcheckdatum: string | null;
    }>(
      `select id, verhuurperiode_id, incheckdatum::text as incheckdatum,
              uitcheckdatum::text as uitcheckdatum
       from public.bewoners order by id`,
    );
    const { rows: leaseRows } = await db.query<{
      id: number;
      woning_id: number;
      bedrijf_id: number;
      startdatum: string;
      werkelijke_einddatum: string | null;
    }>(
      `select id, woning_id, bedrijf_id, startdatum::text as startdatum,
              werkelijke_einddatum::text as werkelijke_einddatum
       from public.verhuurperiodes order by id`,
    );
    const { rows: configRows } = await db.query<{
      id: string;
      woning_id: number;
      product: string;
      meteridentiteit: string;
      registertype: "enkel" | "dag_nacht" | "totaal";
      vanaf: string;
      tot: string | null;
    }>(
      `select id, woning_id, product, meteridentiteit, registertype,
              vanaf::text as vanaf, tot::text as tot
       from public.energie_meterconfiguraties`,
    );
    const { rows: meterRows } = await db.query<{
      id: number;
      opnamedatum: string;
      bewoners_aantal: number;
      dagstroom_kwh: string;
      nachtstroom_kwh: string | null;
      elektriciteit_kwh: string;
    }>(
      `select id, opnamedatum::text as opnamedatum, bewoners_aantal,
              dagstroom_kwh, nachtstroom_kwh, elektriciteit_kwh
       from public.meterstanden order by opnamedatum`,
    );
    const bron: Brondata = {
      woningen: [
        { id: 16, adres: "Testpand", postcode: "", plaats: "", status: "actief" },
      ],
      bedrijven: [
        { id: 4, naam: "Eerste klant" },
        { id: 5, naam: "Volgende klant" },
      ],
      verhuurperioden: leaseRows as EnergieVerhuurperiode[],
      bewoners: residentRows as EnergieBewoner[],
      meterconfiguraties: configRows as Meterconfiguratie[],
      meterstanden: meterRows.map(
        (meter): EnergieMeterstand => ({
          id: meter.id,
          woning_id: 16,
          opnamedatum: meter.opnamedatum,
          bewoners_aantal: meter.bewoners_aantal,
          dagstroom_kwh: Number(meter.dagstroom_kwh),
          nachtstroom_kwh:
            meter.nachtstroom_kwh === null
              ? null
              : Number(meter.nachtstroom_kwh),
          elektriciteit_kwh: Number(meter.elektriciteit_kwh),
          gas_m3: null,
          water_m3: null,
        }),
      ),
    };
    const result = bouwEnergiePortfolioAnalyse(bron, {
      niveau: "totaal",
      drager: "elektriciteit",
      vanaf: "2026-09-01",
      totEnMet: "2026-10-01",
    });

    assert.equal(configRows[0].registertype, "enkel");
    assert.equal(result.totaal, 300);
    assert.equal(result.persoonsdagen, 220);
    assert.deepEqual(
      result.rijen[0].intervallen.map((interval) => [
        interval.waarde,
        interval.rekenwijze,
      ]),
      [
        [100, "naar_rato"],
        [200, "naar_rato"],
      ],
    );
    assert.ok(
      result.rijen[0].intervallen.every(
        (interval) => interval.gebruikteStanden[0]?.register === "dagstroom_kwh",
      ),
    );
  } finally {
    await db.close();
  }
});
