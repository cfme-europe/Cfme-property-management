import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import test from "node:test";
test("energy migration: repeat, permissions, immutability, scope and overlap", async () => {
  const db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;create function public.heeft_rol(text[]) returns boolean language sql stable as $$ select current_setting('test.role',true)=any($1) $$;create function public.mag_administratie_beheren() returns boolean language sql stable as $$ select public.heeft_rol(array['admin','management','administratie','medewerker']) $$;create function public.mag_managementinformatie_lezen() returns boolean language sql stable as $$ select public.heeft_rol(array['admin','management','administratie','medewerker','lezen']) $$;grant usage on schema auth to authenticated;grant execute on all functions in schema auth to authenticated;create table public.woningen(id bigint primary key);create table public.bedrijven(id bigint primary key);create table public.woning_objecten(id bigint primary key,woning_id bigint);create table public.taken(id bigint primary key,woning_id bigint);create table public.maandrapportages(id bigint primary key,woning_id bigint);grant select on all tables in schema public to authenticated;insert into woningen values(1);insert into bedrijven values(1);insert into maandrapportages values(1,1);`,
  );
  const migration = fs.readFileSync(
    "supabase/migrations/20261013151053_energie_intelligence_v2.sql",
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration);
  console.log("Migration and idempotent repeat PASS");
  await db.exec(
    `set role authenticated;set "request.jwt.claim.sub"='00000000-0000-0000-0000-000000000001';set "test.role"='admin';`,
  );
  await db.exec(
    `insert into energie_tariefplannen(product,eenheid,valuta,vanaf,bron,componenten) values('elektriciteit','kWh','EUR','2026-01-01','Test','[{"soort":"variabel","prijs":"0.2","btw_percentage":"21","inclusief_btw":false}]')`,
  );
  console.log("Authorized insert PASS");
  for (const [label, sql] of [
    [
      "overlap",
      `insert into energie_tariefplannen(product,eenheid,valuta,vanaf,bron,componenten) values('elektriciteit','kWh','EUR','2026-02-01','Overlap','[{"soort":"variabel","prijs":"0.3","btw_percentage":"21","inclusief_btw":false}]')`,
    ],
    ["update", `update energie_tariefplannen set bron='rewritten'`],
    ["delete", `delete from energie_tariefplannen`],
    [
      "snapshot cross-property",
      `insert into energie_snapshots(maandrapportage_id,woning_id,klant,intern,bron_hash,rekenregels,codeversie) values(1,null,'{}','{}','x','x','x')`,
    ],
  ]) {
    let blocked = false;
    try {
      await db.exec(sql);
    } catch {
      blocked = true;
    }
    if (!blocked) throw new Error(label + " should be denied");
    console.log(label + " denied PASS");
  }
  await db.exec(`set "test.role"='lezen'`);
  let denied = false;
  try {
    await db.exec(
      `insert into energie_meterconfiguraties(woning_id,product,meteridentiteit,registertype,vanaf) values(1,'elektriciteit','x','enkel','2026-01-01')`,
    );
  } catch {
    denied = true;
  }
  if (!denied) throw new Error("read role wrote");
  console.log("Read-only role write denied PASS");
  await db.exec(`reset role;set role anon`);
  denied = false;
  try {
    await db.query(`select * from energie_tariefplannen`);
  } catch {
    denied = true;
  }
  if (!denied) throw new Error("anon read");
  console.log("Anonymous read denied PASS");
  await db.close();
});
