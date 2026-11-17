import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
test("informative price and advance migration enforces append-only, scope, stale versions and RLS", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('00000000-0000-0000-0000-000000000001');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function heeft_rol(text[]) returns boolean language sql stable as $$select current_setting('test.role',true)=any($1)$$;create function mag_managementinformatie_lezen() returns boolean language sql stable as $$select heeft_rol(array['admin','management','lezen'])$$;create table woningen(id bigint primary key);insert into woningen values(1),(2);create table verhuurperiodes(id bigint primary key,woning_id bigint, startdatum date,werkelijke_einddatum date);insert into verhuurperiodes values(1,1,'2026-09-01','2027-01-01');create function energie_onveranderlijk() returns trigger language plpgsql as $$begin raise exception 'immutable';end$$;grant usage on schema auth to authenticated;grant select on all tables in schema public to authenticated;grant execute on all functions in schema auth to authenticated;`,
    );
    const sql = fs.readFileSync(
      "supabase/migrations/20261117143139_energie_informatieve_jaarprijzen_voorschotten.sql",
      "utf8",
    );
    await db.exec(sql);
    await db.exec(sql);
    await db.exec(
      `set role authenticated;set "request.jwt.claim.sub"='00000000-0000-0000-0000-000000000001';set "test.role"='admin'`,
    );
    const insert = `insert into energie_jaarprijzen(woning_id,jaar,stroomtype) values(1,2026,'enkel')`;
    await db.exec(insert);
    await assert.rejects(() => db.exec(insert));
    await db.exec(
      `insert into energie_jaarprijzen(woning_id,jaar,stroomtype,voorganger_id) select 1,2026,'enkel',id from energie_jaarprijzen`,
    );
    await assert.rejects(() =>
      db.exec(
        `insert into energie_jaarprijzen(woning_id,jaar,stroomtype,voorganger_id) select 2,2026,'enkel',id from energie_jaarprijzen limit 1`,
      ),
    );
    await assert.rejects(() =>
      db.exec("update energie_jaarprijzen set stroom=1"),
    );
    await assert.rejects(() => db.exec("delete from energie_jaarprijzen"));
    await assert.rejects(() =>
      db.exec(
        `insert into energie_voorschotafspraken(verhuurperiode_id,vanaf) values(1,'2026-08-01')`,
      ),
    );
    await assert.rejects(() =>
      db.exec(
        `insert into energie_voorschotafspraken(verhuurperiode_id,vanaf,voorschotten) values(1,'2026-09-01','[{"vanaf":"2026-09-01","bedrag":-1}]')`,
      ),
    );
    await db.exec(
      `insert into energie_voorschotafspraken(verhuurperiode_id,vanaf,voorschotten) values(1,'2026-09-01','[{"vanaf":"2026-09-01","bedrag":0}]')`,
    );
    await db.exec(`set "test.role"='lezen'`);
    await assert.rejects(() =>
      db.exec(
        `insert into energie_jaarprijzen(woning_id,jaar,stroomtype) values(1,2027,'enkel')`,
      ),
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(() => db.query("select * from energie_jaarprijzen"));
  } finally {
    await db.close();
  }
});
