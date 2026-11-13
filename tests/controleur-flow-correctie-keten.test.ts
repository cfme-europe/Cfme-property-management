import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test, { mock } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migratie = (naam: string) =>
  readFileSync(`supabase/migrations/${naam}`, "utf8");
const UID_A = "00000000-0000-0000-0000-00000000000a";
const UID_B = "00000000-0000-0000-0000-00000000000b";
const dag = (d: string) => new Date(`${d}T10:00:00Z`).getTime();

// @types/node kent de nieuwe `exports`-optie van mock.module nog niet.
const mockExports = (e: object) => ({ exports: e }) as unknown as Parameters<typeof mock.module>[1];

type Rij = Record<string, unknown>;
type Filter = [string, string, unknown];

function maakClient(db: PGlite, staat: { uid: string }) {
  const CANNED: Record<string, Rij[]> = {
    woningen: [{ id: 16, dossiernummer: "W16", adres: "Teststraat 1", postcode: "1000AA", plaats: "Test" }],
    profiles: [{ volledige_naam: "Test Controleur", email: "test@example.com" }],
  };
  const TABELLEN = new Set(["meterstanden", "meterstand_correcties", "controlesessies", "verhuurperiodes", "bewoners", "energie_meterconfiguraties"]);

  class Bouwer {
    op: "select" | "insert" | "update" = "select";
    filters: Filter[] = [];
    kolommen = "*";
    volgorde: string | null = null;
    max: number | null = null;
    enkel: "single" | "maybe" | null = null;
    inhoud: Rij = {};
    head = false;
    constructor(private tabel: string) {}
    select(kolommen = "*", opties?: { head?: boolean }) {
      this.kolommen = kolommen.replace(/\s+/g, "");
      this.head = Boolean(opties?.head);
      return this;
    }
    insert(inhoud: Rij) { this.op = "insert"; this.inhoud = inhoud; return this; }
    update(inhoud: Rij) { this.op = "update"; this.inhoud = inhoud; return this; }
    eq(k: string, w: unknown) { this.filters.push([k, "=", w]); return this; }
    lte(k: string, w: unknown) { this.filters.push([k, "<=", w]); return this; }
    lt(k: string, w: unknown) { this.filters.push([k, "<", w]); return this; }
    in(k: string, w: unknown[]) { this.filters.push([k, "in", w]); return this; }
    gt(k: string, w: unknown) { this.filters.push([k, ">", w]); return this; }
    is(k: string, w: unknown) { this.filters.push([k, "is", w]); return this; }
    not(k: string, o: string, w: unknown) {
      assert.deepEqual([o, w], ["is", null]);
      this.filters.push([k, "is not", w]);
      return this;
    }
    order(k: string, o: { ascending?: boolean } = {}) { this.volgorde = `${k} ${o.ascending === false ? "desc" : "asc"}`; return this; }
    limit(n: number) { this.max = n; return this; }
    single() { this.enkel = "single"; return this; }
    maybeSingle() { this.enkel = "maybe"; return this; }
    then(ok?: (v: { data: unknown; error: unknown; count?: number | null }) => unknown, nok?: (e: unknown) => unknown) {
      return this.uitvoeren().then(ok, nok);
    }
    private async uitvoeren() {
      let rijen: Rij[];
      try {
        if (!TABELLEN.has(this.tabel)) {
          rijen = CANNED[this.tabel] ?? [];
        } else {
          rijen = await this.sql();
        }
      } catch (e) {
        return { data: null, error: { message: (e as Error).message, code: "P0001" } };
      }
      if (this.head) return { data: null, error: null, count: rijen.length };
      if (this.enkel === "single" && rijen.length !== 1) return { data: null, error: { message: "Verwacht precies één rij." } };
      if (this.enkel) return { data: rijen[0] ?? null, error: null };
      return { data: rijen, error: null };
    }
    private async sql(): Promise<Rij[]> {
      const params: unknown[] = [];
      const p = (w: unknown) => { params.push(w); return `$${params.length}`; };
      const waar = this.filters
        .map(([k, o, w]) => (o === "is" ? `${k} is null` : o === "is not" ? `${k} is not null` : o === "in" ? `${k} = any(${p(w)})` : `${k} ${o} ${p(w)}`))
        .join(" and ");
      const where = waar ? ` where ${waar}` : "";
      const tabel = `public.${this.tabel}`;
      let q: string;
      if (this.op === "insert" || this.op === "update") {
        const sleutels = Object.keys(this.inhoud);
        const waarden = sleutels.map((k) => {
          const w = this.inhoud[k];
          return p(w !== null && typeof w === "object" ? JSON.stringify(w) : w);
        });
        const kern =
          this.op === "insert"
            ? `insert into ${tabel} (${sleutels.join(",")}) values (${waarden.join(",")}) returning *`
            : `update ${tabel} set ${sleutels.map((k, i) => `${k} = ${waarden[i]}`).join(",")}${where} returning *`;
        q = `with r as (${kern}) select row_to_json(r) as j from r`;
      } else {
        q = `select row_to_json(t) as j from (select ${this.kolommen} from ${tabel}${where}${this.volgorde ? ` order by ${this.volgorde}` : ""}${this.max ? ` limit ${this.max}` : ""}) t`;
      }
      await db.query(`select set_config('app.uid', $1, false)`, [staat.uid]);
      return (await db.query<{ j: Rij }>(q, params)).rows.map((r) => r.j);
    }
  }

  return {
    auth: { getUser: async () => ({ data: { user: { id: staat.uid, email: "test@example.com" } }, error: null }) },
    from: (tabel: string) => new Bouwer(tabel),
    rpc: async (naam: string, args: Rij) => {
      try {
        await db.query(`select set_config('app.uid', $1, false)`, [staat.uid]);
        const sleutels = Object.keys(args);
        const { rows } = await db.query<{ j: Rij }>(
          `select row_to_json(f) as j from public.${naam}(${sleutels.map((k, i) => `${k} => $${i + 1}`).join(",")}) f`,
          sleutels.map((k) => args[k]),
        );
        return { data: rows[0]?.j ?? null, error: null };
      } catch (e) {
        return { data: null, error: { message: (e as Error).message } };
      }
    },
  };
}

// De servicemodules blijven na hun eerste import gecachet; de proxy volgt de actieve testdatabase.
let actief: ReturnType<typeof maakClient>;
const opgevraagdeTabellen: string[] = [];
const clientProxy = {
  auth: { getUser: () => actief.auth.getUser() },
  from: (tabel: string) => {
    opgevraagdeTabellen.push(tabel);
    return actief.from(tabel);
  },
  rpc: (naam: string, args: Rij) => actief.rpc(naam, args),
};

type Omgeving = { db: PGlite; staat: { uid: string }; ruim: () => Promise<void> };

async function bereidOmgeving(sessiesSql: string, bezettingSql = "", configuratieSql = ""): Promise<Omgeving> {
  const db = new PGlite();
  const staat = { uid: UID_A };
  actief = maakClient(db, staat);
  mock.module(pathToFileURL(resolve("src/lib/supabase/client.ts")).href, mockExports({ createClient: () => clientProxy }));
  mock.module(pathToFileURL(resolve("src/lib/supabase/server.ts")).href, mockExports({ createClient: async () => clientProxy }));
  mock.module(pathToFileURL(resolve("src/services/intelligence-server.ts")).href, mockExports({ getActieveControlebriefingVoorWoning: async () => null }));
  // Next.js levert "server-only" zelf; buiten Next bestaat het pakket niet.
  const modulelader = Module as unknown as { _load: (verzoek: string, ...rest: unknown[]) => unknown };
  const oorspronkelijkeLoad = modulelader._load;
  modulelader._load = function (verzoek, ...rest) {
    return verzoek === "server-only" ? {} : oorspronkelijkeLoad.call(this, verzoek, ...rest);
  };
  mock.timers.enable({ apis: ["Date"], now: dag("2026-10-01") });
  const ruim = async () => {
    modulelader._load = oorspronkelijkeLoad;
    mock.timers.reset();
    mock.reset();
    await db.close();
  };
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
      create function public.mag_administratie_beheren() returns boolean language sql stable as $$ select false $$;
      create function public.mag_controles_uitvoeren() returns boolean language sql stable as $$ select true $$;
      create table public.controlesessies (
        id bigint primary key, woning_id bigint not null, inspectie_id bigint,
        controleur_id uuid, status text not null, gestart_at timestamptz, locatie_status text
      );
      create table public.meterstanden (
        id bigint generated by default as identity primary key,
        woning_id bigint not null, opnamedatum date not null, controlesessie_id bigint,
        bewoners_aantal integer not null,
        dagstroom_kwh numeric, nachtstroom_kwh numeric, elektriciteit_kwh numeric,
        gas_m3 numeric, water_m3 numeric, opgenomen_door text, opmerkingen text,
        meteruitzonderingen jsonb not null default '{}',
        analyse_status text not null default 'onvoldoende_data',
        analyse_resultaat jsonb not null default '{}',
        opvolging_nodig boolean not null default false,
        geanalyseerd_at timestamptz
      );
      create table public.meterstand_correcties (
        id bigint generated by default as identity primary key,
        created_at timestamptz not null default now(),
        meterstand_id bigint not null, woning_id bigint not null,
        controlesessie_id bigint, gecorrigeerd_door uuid, reden text not null,
        oude_waarden jsonb not null, nieuwe_waarden jsonb not null
      );
    `);
    await db.exec(migratie("20260722224500_5_0f_dag_nachtstroom.sql").replace(/^alter table public\.meterstanden\s+add column[^;]*;/gim, ""));
    await db.exec(`create trigger meterstanden_oplopend_controleren before insert or update on public.meterstanden
                   for each row execute function public.controleer_oplopende_meterstanden();`);
    await db.exec(migratie("20260820150000_meterstandcorrectie_opgenomen_door.sql"));
    await db.exec(migratie("20261020180000_controleur_historische_meterstandcorrectie.sql"));
    await db.exec(`
      create table public.verhuurperiodes (
        id bigint primary key, woning_id bigint not null, bedrijf_id bigint not null,
        startdatum date, werkelijke_einddatum date, status text not null default 'actief'
      );
      create table public.bewoners (
        id bigint primary key, verhuurperiode_id bigint not null,
        incheckdatum date not null, uitcheckdatum date, status text not null default 'actief'
      );
    `);
    await db.exec(`
      create table public.energie_meterconfiguraties (
        id uuid primary key default gen_random_uuid(), woning_id bigint not null,
        product text not null, meteridentiteit text not null,
        registertype text not null check (registertype in ('dag_nacht','enkel','totaal')),
        voorganger_id uuid, vanaf date not null, tot date
      );
    `);
    if (configuratieSql) await db.exec(configuratieSql);
    await db.exec(sessiesSql);
    if (bezettingSql) await db.exec(bezettingSql);
  } catch (e) {
    await ruim();
    throw e;
  }
  return { db, staat, ruim };
}

test("controleursflow: foutieve opname → correctie → nieuwe sessie → gecorrigeerde voorganger → vervolgopname", async () => {
  const { db, staat, ruim } = await bereidOmgeving(`
      insert into public.controlesessies (id, woning_id, controleur_id, status) values
        (1, 16, '${UID_A}', 'afgerond'), (2, 16, '${UID_A}', 'afgerond'), (3, 16, '${UID_A}', 'afgerond'),
        (4, 16, '${UID_A}', 'bezig'),
        (5, 16, '${UID_A}', 'bezig'),
        (6, 16, '${UID_B}', 'bezig'),
        (7, 99, '${UID_A}', 'bezig');
    `);
  try {

    const { slaRouteMeterstandenOp, corrigeerControleurMeterstand } = await import("../src/services/meterstanden");
    const { getControleurFlow } = await import("../src/services/controleurflow-server");
    const opname = (sessie: number, waarden: Record<string, number>) =>
      slaRouteMeterstandenOp({ woning_id: 16, controlesessie_id: sessie, waarden, uitzonderingen: {}, bewoners_aantal: 7 });
    const rij = async (datum: string) =>
      (await db.query<Rij>(`select *, opnamedatum::text as opnamedatum_tekst from public.meterstanden where opnamedatum = $1`, [datum])).rows[0];

    // Opnames via de echte opslagfunctie; 8 oktober bevat de typefout 5000 i.p.v. 1500.
    await opname(1, { dagstroom_kwh: 1000, nachtstroom_kwh: 400, gas_m3: 500 });
    mock.timers.setTime(dag("2026-10-08"));
    await opname(2, { dagstroom_kwh: 5000, nachtstroom_kwh: 420 });
    mock.timers.setTime(dag("2026-10-12"));
    await opname(3, { gas_m3: 520 });

    // Nieuwe sessie vóór de correctie: foutieve voorganger is zichtbaar en een geldige opname wordt geweigerd.
    mock.timers.setTime(dag("2026-10-20"));
    const voor = await getControleurFlow(4);
    assert.ok(voor);
    assert.deepEqual(
      [voor.laatste_meterstand?.dagstroom_kwh, voor.laatste_meterstand?.nachtstroom_kwh, voor.laatste_meterstand?.gas_m3],
      [5000, 420, 520],
    );
    assert.equal(voor.correctiewaarschuwingen.length, 0);
    await assert.rejects(opname(4, { dagstroom_kwh: 1700 }), /mag niet lager zijn dan de vorige stand \(5000/);

    // Weigeringen: ander pand, niet toegewezen sessie, geen reden, register zonder stand.
    const id8 = Number((await rij("2026-10-08")).id);
    const basis = { meterstand_id: id8, register: "dagstroom_kwh" as const, waarde: 1500, reden: "Typefout" };
    await assert.rejects(corrigeerControleurMeterstand({ ...basis, controlesessie_id: 7 }), /hoort niet bij het pand/);
    staat.uid = UID_B;
    await assert.rejects(corrigeerControleurMeterstand({ ...basis, controlesessie_id: 4 }), /niet aan jou toegewezen/);
    staat.uid = UID_A;
    await assert.rejects(corrigeerControleurMeterstand({ ...basis, controlesessie_id: 4, reden: "  " }), /reden/);
    await assert.rejects(corrigeerControleurMeterstand({ ...basis, controlesessie_id: 4, register: "gas_m3" }), /geen stand vastgelegd/);
    assert.equal(Number((await rij("2026-10-08")).dagstroom_kwh), 5000);

    // Correctie via de controleursflow: alleen dagstroom wijzigt, opnamedatum en andere meters blijven gelijk.
    const vorigeNacht = (await rij("2026-10-08")).nachtstroom_kwh;
    const gecorrigeerd = await corrigeerControleurMeterstand({ ...basis, controlesessie_id: 4 });
    const na = await rij("2026-10-08");
    assert.equal(Number(na.dagstroom_kwh), 1500);
    assert.equal(na.nachtstroom_kwh, vorigeNacht);
    assert.equal(na.gas_m3, null);
    assert.equal(na.opnamedatum_tekst, "2026-10-08");
    assert.equal(Number(na.controlesessie_id), 2);
    assert.equal(gecorrigeerd.meterstand.id, id8);
    assert.ok(gecorrigeerd.analyse.samenvatting);
    // 12 oktober is gas-only: geen volgende opname van dezelfde dagstroomreeks, dus geen heranalyse daarvan.
    assert.equal(gecorrigeerd.volgende_analyse, null);

    // Volledige audit.
    const { rows: audit } = await db.query<{ controlesessie_id: string; gecorrigeerd_door: string; reden: string; oude_waarden: Rij; nieuwe_waarden: Rij }>(
      `select * from public.meterstand_correcties where meterstand_id = $1`, [id8]);
    assert.equal(audit.length, 1);
    assert.equal(Number(audit[0].controlesessie_id), 4);
    assert.equal(audit[0].gecorrigeerd_door, UID_A);
    assert.equal(audit[0].reden, "Typefout");
    assert.equal(audit[0].oude_waarden.gecorrigeerd_register, "dagstroom_kwh");
    assert.equal(Number(audit[0].oude_waarden.dagstroom_kwh), 5000);
    assert.equal(Number(audit[0].nieuwe_waarden.dagstroom_kwh), 1500);
    assert.equal(Number(audit[0].nieuwe_waarden.nachtstroom_kwh), 420);
    assert.equal(audit[0].nieuwe_waarden.opnamedatum, "2026-10-08");
    assert.equal(Number(audit[0].nieuwe_waarden.oorspronkelijke_controlesessie_id), 2);

    // Herladen als nieuwe sessie: gecorrigeerde voorganger en actuele correctiewaarschuwing.
    const nieuw = await getControleurFlow(5);
    assert.ok(nieuw);
    assert.deepEqual(
      [nieuw.laatste_meterstand?.dagstroom_kwh, nieuw.laatste_meterstand?.nachtstroom_kwh, nieuw.laatste_meterstand?.gas_m3],
      [1500, 420, 520],
    );
    assert.equal(nieuw.correctiewaarschuwingen.length, 1);
    assert.match(nieuw.correctiewaarschuwingen[0], /Typefout/);
    assert.equal(nieuw.meterstand_historie.find((m) => m.id === id8)?.dagstroom_kwh, 1500);

    // Geldige vervolgopname in de nieuwe sessie; een te lage stand blijft geweigerd.
    await assert.rejects(opname(5, { dagstroom_kwh: 1400 }), /mag niet lager zijn dan de vorige stand \(1500/);
    const vervolg = await opname(5, { dagstroom_kwh: 1700, gas_m3: 540 });
    assert.notEqual(vervolg.analyse.status, "onwaarschijnlijk");
    assert.equal(Number((await rij("2026-10-20")).dagstroom_kwh), 1700);

    // Beide aangrenzende intervallen van dezelfde fysieke meter (dagstroom: 1000 op 1 okt, 1700 op 20 okt).
    const grens = { ...basis, controlesessie_id: 5 };
    await assert.rejects(corrigeerControleurMeterstand({ ...grens, waarde: 900 }), /mag niet lager zijn dan de vorige stand \(1000/);
    await assert.rejects(corrigeerControleurMeterstand({ ...grens, waarde: 1800 }), /mag niet hoger zijn dan de volgende stand \(1700/);
    assert.equal(Number((await rij("2026-10-08")).dagstroom_kwh), 1500);
    const fijn = await corrigeerControleurMeterstand({ ...grens, waarde: 1600, reden: "Fijnafstelling" });
    // Gas-only opname van 12 oktober wordt overgeslagen: de volgende dagstroomopname is 20 oktober.
    assert.equal(fijn.volgende_analyse?.meterstand.opnamedatum, "2026-10-20");
    assert.equal(Number((await rij("2026-10-08")).dagstroom_kwh), 1600);
    assert.equal(Number((await rij("2026-10-08")).nachtstroom_kwh), 420);
  } finally {
    await ruim();
  }
});

test("correctie en heranalyse vinden de elektriciteitsvoorganger over 30+ gas-only opnames heen", async () => {
  const { db, ruim } = await bereidOmgeving(`
    insert into public.controlesessies (id, woning_id, controleur_id, status)
    select g, 16, '${UID_A}', case when g = 99 then 'bezig' else 'afgerond' end from generate_series(1, 99) g;
  `, `
    insert into public.verhuurperiodes (id, woning_id, bedrijf_id, startdatum) values (1, 16, 1, '2025-12-01');
    insert into public.bewoners (id, verhuurperiode_id, incheckdatum) values (1, 1, '2025-12-01'), (2, 1, '2025-12-01');
    insert into public.bewoners (id, verhuurperiode_id, incheckdatum) values (3, 1, '2026-01-21');
  `);
  try {
    const { slaRouteMeterstandenOp, corrigeerControleurMeterstand } = await import("../src/services/meterstanden");
    let sessie = 0;
    const opname = (waarden: Record<string, number>) =>
      slaRouteMeterstandenOp({ woning_id: 16, controlesessie_id: ++sessie, waarden, uitzonderingen: {}, bewoners_aantal: 99 });
    const rij = async (datum: string) =>
      (await db.query<Rij>(`select * from public.meterstanden where opnamedatum = $1`, [datum])).rows[0];
    const dagen = (n: number) => new Date(Date.UTC(2026, 0, 1) + n * 86400000).toISOString().slice(0, 10);

    mock.timers.setTime(dag(dagen(0)));
    await opname({ dagstroom_kwh: 1000, nachtstroom_kwh: 400, gas_m3: 100 });
    const AANTAL = 35;
    for (let i = 1; i <= AANTAL; i++) {
      mock.timers.setTime(dag(dagen(i)));
      await opname({ gas_m3: 100 + i });
    }
    const dagE2 = dagen(AANTAL + 1);
    const dagE3 = dagen(AANTAL + 8);
    mock.timers.setTime(dag(dagE2));
    await opname({ dagstroom_kwh: 1650, nachtstroom_kwh: 450 });
    mock.timers.setTime(dag(dagE3));
    await opname({ dagstroom_kwh: 1700, nachtstroom_kwh: 480 });

    const { rows: [{ n }] } = await db.query<{ n: string }>(
      `select count(*)::text as n from public.meterstanden where dagstroom_kwh is null and gas_m3 is not null`);
    assert.equal(Number(n), AANTAL);

    const e2 = Number((await rij(dagE2)).id);
    const basis = { controlesessie_id: 99, meterstand_id: e2, register: "dagstroom_kwh" as const, reden: "Typefout" };
    // Beide aangrenzende elektriciteitsgrenzen liggen buiten ieder vast aantal opnames: 1000 en 1700.
    await assert.rejects(corrigeerControleurMeterstand({ ...basis, waarde: 900 }), /mag niet lager zijn dan de vorige stand \(1000/);
    await assert.rejects(corrigeerControleurMeterstand({ ...basis, waarde: 1800 }), /mag niet hoger zijn dan de volgende stand \(1700/);

    const resultaat = await corrigeerControleurMeterstand({ ...basis, waarde: 1300 });
    assert.equal(Number((await rij(dagE2)).dagstroom_kwh), 1300);
    assert.equal(Number((await rij(dagE2)).nachtstroom_kwh), 450);

    // Bronperioden per energieproduct, met persoonsdagen uit de bewonersregistratie (2 bewoners + 1 vanaf 21 jan;
    // bewoners_aantal 99 in de opnames mag geen rol spelen).
    const elektriciteit = (r: typeof resultaat.analyse) => r.dragers.find((d) => d.drager === "elektriciteit");
    // Interval 1: eerste opname (35 gas-only opnames eerder) → gecorrigeerde opname: 300 dag + 50 nacht.
    const eerste = elektriciteit(resultaat.analyse);
    assert.equal(eerste?.verbruik_totaal, 350);
    assert.equal(eerste?.van_datum, dagen(0));
    assert.equal(eerste?.tot_datum, dagE2);
    assert.equal(eerste?.aantal_dagen, 36);
    assert.equal(eerste?.persoonsdagen, 2 * 36 + 16);
    assert.equal(eerste?.per_bewoner_per_week, Math.round((350 / (88 / 7)) * 1000) / 1000);
    assert.deepEqual(resultaat.analyse.dragers.map((d) => d.drager), ["elektriciteit"]);
    // Het resultaat als geheel hoort bij de enige drager met een interval op de laatste opname.
    assert.equal(resultaat.analyse.van_datum, dagen(0));
    assert.equal(resultaat.analyse.tot_datum, dagE2);
    assert.equal(resultaat.analyse.aantal_dagen, 36);
    assert.equal(((await rij(dagE2)).analyse_resultaat as { tot_datum: string }).tot_datum, dagE2);
    // Interval 2: gecorrigeerde opname → eerstvolgende elektriciteitsopname: 400 dag + 30 nacht.
    assert.equal(resultaat.volgende_analyse?.meterstand.opnamedatum, dagE3);
    const tweede = elektriciteit(resultaat.volgende_analyse!.analyse);
    assert.equal(tweede?.verbruik_totaal, 430);
    assert.equal(tweede?.van_datum, dagE2);
    assert.equal(tweede?.tot_datum, dagE3);
    assert.equal(tweede?.aantal_dagen, 7);
    assert.equal(tweede?.persoonsdagen, 3 * 7);
    assert.equal(tweede?.per_bewoner_per_week, Math.round((430 / 3) * 1000) / 1000);
    assert.equal(resultaat.volgende_analyse?.analyse.van_datum, dagE2);
    assert.equal(resultaat.volgende_analyse?.analyse.tot_datum, dagE3);
  } finally {
    await ruim();
  }
});

test("koppeling fysieke meters aan opgeslagen velden komt uit controlepunten en routecode", () => {
  const flow = readFileSync("src/components/controleur/ControleurFlow.tsx", "utf8");
  const sql = migratie("20260727143000_8_1k_route_meters_internet.sql");
  const paren = [
    ["METER_DAGSTROOM", "elektriciteitsmeter_dag", "dagstroom_kwh"],
    ["METER_NACHTSTROOM", "elektriciteitsmeter_nacht", "nachtstroom_kwh"],
    ["METER_GAS", "gasmeter", "gas_m3"],
    ["METER_WATER", "watermeter", "water_m3"],
  ];
  for (const [code, object, veld] of paren) {
    assert.match(sql, new RegExp(`'${code}'[\\s\\S]*?'${object}'`));
    assert.match(flow, new RegExp(`${object}:\\s*"${veld}"`));
  }
});

test("heranalyse vergelijkt per register met de eerdere opname die dat register heeft en behoudt onafhankelijke waarschuwingen", async () => {
  const { analyseerMeterstanden } = await import("../src/services/energy-intelligence");
  const rij = (id: number, opnamedatum: string, w: Record<string, number | null>) =>
    ({
      id, woning_id: 16, opnamedatum, bewoners_aantal: 7,
      dagstroom_kwh: null, nachtstroom_kwh: null, elektriciteit_kwh: null, gas_m3: null, water_m3: null,
      ...w,
    }) as unknown as Parameters<typeof analyseerMeterstanden>[0][number];
  const resultaat = analyseerMeterstanden([
    rij(3, "2026-10-20", { dagstroom_kwh: 900, gas_m3: 400 }),
    rij(2, "2026-10-12", { gas_m3: 520 }),
    rij(1, "2026-10-01", { dagstroom_kwh: 1000, gas_m3: 500 }),
  ]);
  const dragers = resultaat.dragers.map((d) => d.drager);
  assert.equal(resultaat.status, "onwaarschijnlijk");
  // Dagstroom 900 < 1000 (niet-aangrenzende opname) en gas 400 < 520: beide terugloop-waarschuwingen blijven staan.
  assert.deepEqual(dragers.sort(), ["elektriciteit", "gas"]);
  assert.match(resultaat.samenvatting, /Elektriciteit/);
  assert.match(resultaat.samenvatting, /Gas/);

  // Alleen gas loopt terug: een gas-only opname na de dagstroomopname veroorzaakt geen elektriciteitswaarschuwing.
  const gasOnly = analyseerMeterstanden([
    rij(3, "2026-10-20", { gas_m3: 400 }),
    rij(2, "2026-10-12", { dagstroom_kwh: 1100 }),
    rij(1, "2026-10-01", { dagstroom_kwh: 1000, gas_m3: 500 }),
  ]);
  assert.deepEqual(gasOnly.dragers.map((d) => d.drager), ["gas"]);
});

test("elektriciteitsterugloop en onafhankelijk hoog gasverbruik blijven beide staan", async () => {
  const { analyseerMeterstanden } = await import("../src/services/energy-intelligence");
  const rij = (id: number, opnamedatum: string, w: Record<string, number | null>) =>
    ({
      id, woning_id: 16, opnamedatum, bewoners_aantal: 2, meteruitzonderingen: {},
      dagstroom_kwh: null, nachtstroom_kwh: null, elektriciteit_kwh: null, gas_m3: null, water_m3: null,
      ...w,
    }) as unknown as Parameters<typeof analyseerMeterstanden>[0][number];
  // Bezetting komt uit de registraties (2 bewoners), niet uit bewoners_aantal.
  const bezetting = {
    verhuurperioden: [{ id: 1, woning_id: 16, bedrijf_id: 1, startdatum: "2026-01-01" }],
    bewoners: [1, 2].map((id) => ({ id, verhuurperiode_id: 1, incheckdatum: "2026-01-01", uitcheckdatum: null })),
  };
  const historie = [
    rij(1, "2026-09-22", { dagstroom_kwh: 950, gas_m3: 490 }),
    rij(2, "2026-09-29", { gas_m3: 500 }),
    rij(3, "2026-10-06", { gas_m3: 510 }),
    rij(4, "2026-10-13", { dagstroom_kwh: 1000, gas_m3: 520 }),
  ];
  const beide = analyseerMeterstanden([...historie, rij(5, "2026-10-20", { dagstroom_kwh: 900, gas_m3: 2000 })], bezetting);
  assert.equal(beide.status, "onwaarschijnlijk");
  assert.deepEqual(beide.dragers.map((d) => [d.drager, d.status]).sort(), [
    ["elektriciteit", "onwaarschijnlijk"],
    ["gas", "onwaarschijnlijk"],
  ]);
  assert.match(beide.samenvatting, /Elektriciteitsmeterstand is lager/);
  assert.match(beide.samenvatting, /Gasverbruik/);

  // Zonder elektriciteitsterugloop blijft de gaswaarschuwing; zonder hoog gas blijft de teruglopende elektriciteit.
  const alleenGas = analyseerMeterstanden([...historie, rij(5, "2026-10-20", { dagstroom_kwh: 1100, gas_m3: 2000 })], bezetting);
  assert.deepEqual(alleenGas.dragers.map((d) => d.drager), ["gas"]);
  const alleenElektriciteit = analyseerMeterstanden([...historie, rij(5, "2026-10-20", { dagstroom_kwh: 900, gas_m3: 530 })], bezetting);
  assert.ok(alleenElektriciteit.dragers.some((d) => d.drager === "elektriciteit" && d.status === "onwaarschijnlijk"));
  assert.ok(alleenElektriciteit.dragers.every((d) => d.drager !== "gas" || d.status !== "onwaarschijnlijk"));
});

test("normalisatie gebruikt daggeldige bewonersregistraties en persoonsdagen, nooit bewoners_aantal uit de opname", async () => {
  const { analyseerMeterstanden } = await import("../src/services/energy-intelligence");
  const opname = (id: number, opnamedatum: string, aantal: number, w: Record<string, number | null>) =>
    ({
      id, woning_id: 16, opnamedatum, bewoners_aantal: aantal, meteruitzonderingen: {},
      dagstroom_kwh: null, nachtstroom_kwh: null, elektriciteit_kwh: null, gas_m3: null, water_m3: null,
      ...w,
    }) as unknown as Parameters<typeof analyseerMeterstanden>[0][number];
  const meters = (aantal: number) => [
    opname(1, "2026-01-01", aantal, { dagstroom_kwh: 1000, nachtstroom_kwh: 500 }),
    opname(2, "2026-01-31", aantal, { dagstroom_kwh: 1120, nachtstroom_kwh: 600 }),
  ];
  const verhuur = [{ id: 1, woning_id: 16, bedrijf_id: 1, startdatum: "2025-12-01" }];
  // 10 dagen 6 bewoners, daarna 20 dagen 8 bewoners: 6×30 + 2×20 = 220 persoonsdagen.
  const bewoners = [
    ...[1, 2, 3, 4, 5, 6].map((id) => ({ id, verhuurperiode_id: 1, incheckdatum: "2025-12-01", uitcheckdatum: null })),
    ...[7, 8].map((id) => ({ id, verhuurperiode_id: 1, incheckdatum: "2026-01-11", uitcheckdatum: null })),
  ];
  const norm = (a: ReturnType<typeof analyseerMeterstanden>) => a.dragers.find((d) => d.drager === "elektriciteit");

  const basis = norm(analyseerMeterstanden(meters(1), { verhuurperioden: verhuur, bewoners }));
  assert.equal(basis?.verbruik_totaal, 220);
  assert.equal(basis?.persoonsdagen, 220);
  assert.equal(basis?.aantal_dagen, 30);
  assert.equal(basis?.per_bewoner_per_week, 7);

  // Alleen bewoners_aantal in de opnames verandert: identieke uitkomst.
  const snapshot = norm(analyseerMeterstanden(meters(99), { verhuurperioden: verhuur, bewoners }));
  assert.deepEqual(snapshot, basis);

  // De echte bewonershistorie verandert (twee extra bewoners de hele periode): 280 persoonsdagen.
  const meer = [
    ...bewoners,
    ...[9, 10].map((id) => ({ id, verhuurperiode_id: 1, incheckdatum: "2025-12-01", uitcheckdatum: null })),
  ];
  const gewijzigd = norm(analyseerMeterstanden(meters(1), { verhuurperioden: verhuur, bewoners: meer }));
  assert.equal(gewijzigd?.persoonsdagen, 280);
  assert.equal(gewijzigd?.per_bewoner_per_week, 5.5);

  // Ontbrekende bezetting blijft onbekend; het gemeten verbruik blijft bestaan.
  for (const onbekend of [undefined, { verhuurperioden: verhuur, bewoners: [] }]) {
    const zonder = norm(analyseerMeterstanden(meters(99), onbekend));
    assert.equal(zonder?.verbruik_totaal, 220);
    assert.equal(zonder?.per_bewoner_per_week, null);
    assert.equal(zonder?.persoonsdagen, null);
  }

  // Terugloopdetectie werkt ook zonder bezetting.
  const terug = analyseerMeterstanden(
    [opname(1, "2026-01-01", 99, { dagstroom_kwh: 1000 }), opname(2, "2026-01-31", 99, { dagstroom_kwh: 900 })],
  );
  assert.equal(terug.status, "onwaarschijnlijk");
  assert.match(terug.samenvatting, /Elektriciteitsmeterstand is lager/);
});

const BEZETTING_220 = `
  insert into public.verhuurperiodes (id, woning_id, bedrijf_id, startdatum) values (1, 16, 1, '2025-12-01');
  insert into public.bewoners (id, verhuurperiode_id, incheckdatum) values (1, 1, '2025-12-01'), (2, 1, '2025-12-01'), (3, 1, '2025-12-01'),
    (4, 1, '2025-12-01'), (5, 1, '2025-12-01'), (6, 1, '2025-12-01');
  insert into public.bewoners (id, verhuurperiode_id, incheckdatum) values (7, 1, '2026-01-11'), (8, 1, '2026-01-11');
`;
const SESSIES = `insert into public.controlesessies (id, woning_id, controleur_id, status)
  select g, 16, '${UID_A}', 'bezig' from generate_series(1, 9) g;`;

for (const geval of [
  { naam: "enkelvoudige configuratie", registertype: "enkel", verwacht: 220, nacht: null as number | null },
  { naam: "geen vastgelegde configuratie met dag-/nachtregister", registertype: null, verwacht: 220, nacht: 100 },
]) {
  test(`opslagpad haalt meterconfiguratie op: ${geval.naam}`, async () => {
    const config = geval.registertype
      ? `insert into public.energie_meterconfiguraties (woning_id, product, meteridentiteit, registertype, vanaf)
         values (16, 'elektriciteit', 'meter-1', '${geval.registertype}', '2025-01-01');`
      : "";
    const { db, ruim } = await bereidOmgeving(SESSIES, BEZETTING_220, config);
    try {
      const { slaRouteMeterstandenOp } = await import("../src/services/meterstanden");
      // 2026-01-01 t/m 2026-01-31: 10 dagen 6 bewoners + 20 dagen 8 bewoners = 220 persoonsdagen.
      const waarden = (dagstroom: number, nacht: number | null) => ({
        dagstroom_kwh: dagstroom,
        ...(nacht === null ? {} : { nachtstroom_kwh: nacht }),
      });
      mock.timers.setTime(dag("2026-01-01"));
      await slaRouteMeterstandenOp({ woning_id: 16, controlesessie_id: 1, waarden: waarden(1000, geval.nacht === null ? null : 500), uitzonderingen: {}, bewoners_aantal: 99 });
      mock.timers.setTime(dag("2026-01-31"));
      const res = await slaRouteMeterstandenOp({
        woning_id: 16, controlesessie_id: 2,
        waarden: waarden(1000 + (geval.nacht === null ? 220 : 120), geval.nacht === null ? null : 600),
        uitzonderingen: {}, bewoners_aantal: 99,
      });
      const rij = (await db.query<Rij>(`select analyse_resultaat from public.meterstanden where opnamedatum = '2026-01-31'`)).rows[0];
      const analyse = rij.analyse_resultaat as { dragers: Array<{ drager: string; verbruik_totaal: number; persoonsdagen: number | null; per_bewoner_per_week: number | null }> };
      const elek = analyse.dragers.find((d) => d.drager === "elektriciteit");
      assert.equal(elek?.verbruik_totaal, geval.verwacht);
      assert.equal(elek?.persoonsdagen, 220);
      assert.equal(elek?.per_bewoner_per_week, 7);
      assert.ok(res);
    } finally {
      await ruim();
    }
  });
}

test("vastgelegde dag-/nachtconfiguratie met alleen dagstroom wordt niet als enkelvoudig verbruik gelezen", async () => {
  const config = `insert into public.energie_meterconfiguraties (woning_id, product, meteridentiteit, registertype, vanaf)
    values (16, 'elektriciteit', 'meter-1', 'dag_nacht', '2025-01-01');`;
  const { db, ruim } = await bereidOmgeving(SESSIES, BEZETTING_220, config);
  try {
    const { slaRouteMeterstandenOp } = await import("../src/services/meterstanden");
    opgevraagdeTabellen.length = 0;
    mock.timers.setTime(dag("2026-01-01"));
    await slaRouteMeterstandenOp({ woning_id: 16, controlesessie_id: 1, waarden: { dagstroom_kwh: 1000 }, uitzonderingen: {}, bewoners_aantal: 99 });
    mock.timers.setTime(dag("2026-01-31"));
    await slaRouteMeterstandenOp({ woning_id: 16, controlesessie_id: 2, waarden: { dagstroom_kwh: 1220 }, uitzonderingen: {}, bewoners_aantal: 99 });
    assert.ok(opgevraagdeTabellen.includes("energie_meterconfiguraties"));
    const rij = (await db.query<Rij>(`select analyse_resultaat from public.meterstanden where opnamedatum = '2026-01-31'`)).rows[0];
    const dragers = (rij.analyse_resultaat as { dragers: Array<{ drager: string }> }).dragers;
    assert.equal(dragers.find((d) => d.drager === "elektriciteit"), undefined);
  } finally {
    await ruim();
  }
});

test("correctieketen beoordeelt een eerdere verbruikswaarschuwing opnieuw op de gecorrigeerde standen", async () => {
  const config = `insert into public.energie_meterconfiguraties (woning_id, product, meteridentiteit, registertype, vanaf)
    values (16, 'elektriciteit', 'meter-1', 'enkel', '2025-01-01');`;
  const { db, ruim } = await bereidOmgeving(SESSIES, BEZETTING_220, config);
  try {
    const { slaRouteMeterstandenOp, corrigeerControleurMeterstand } = await import("../src/services/meterstanden");
    let sessie = 0;
    const standen: Array<[string, number]> = [
      ["2026-01-01", 1000], ["2026-01-15", 1100], ["2026-01-29", 1200], ["2026-02-12", 1300], ["2026-02-26", 2800],
    ];
    for (const [datum, waarde] of standen) {
      mock.timers.setTime(dag(datum));
      await slaRouteMeterstandenOp({ woning_id: 16, controlesessie_id: ++sessie, waarden: { dagstroom_kwh: waarde }, uitzonderingen: {}, bewoners_aantal: 99 });
    }
    const status = async (datum: string) =>
      (await db.query<Rij>(`select id, analyse_status from public.meterstanden where opnamedatum = $1`, [datum])).rows[0];
    const voor = await status("2026-02-26");
    assert.ok(["verhoogd", "kritiek", "onwaarschijnlijk"].includes(String(voor.analyse_status)), `waarschuwing verwacht, kreeg ${voor.analyse_status}`);

    const resultaat = await corrigeerControleurMeterstand({
      controlesessie_id: 9, meterstand_id: Number(voor.id), register: "dagstroom_kwh", waarde: 1400, reden: "Typefout bij opname",
    });
    assert.equal((await status("2026-02-26")).analyse_status, "normaal");
    assert.equal(resultaat.analyse.status, "normaal");
    assert.equal(resultaat.analyse.dragers.find((d) => d.drager === "elektriciteit")?.verbruik_totaal, 100);
  } finally {
    await ruim();
  }
});
