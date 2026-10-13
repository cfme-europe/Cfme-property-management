import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const lees = (pad: string) => readFileSync(pad, "utf8");
const migratie = lees("supabase/migrations/20261013112015_woningarchief.sql");
const dossier = lees("src/app/woningen/[id]/page.tsx");

test("woningarchief bewaart het volledige dossier en auditspoor", () => {
  assert.match(migratie, /create table if not exists public\.woning_statushistorie/);
  assert.match(migratie, /references public\.woningen\(id\) on delete restrict/);
  assert.match(migratie, /create or replace function private\.archiveer_woning/);
  assert.match(migratie, /create or replace function private\.heractiveer_woning/);
  assert.match(migratie, /create or replace function public\.archiveer_woning[\s\S]*security invoker/);
  assert.match(migratie, /create or replace function public\.heractiveer_woning[\s\S]*security invoker/);
  assert.doesNotMatch(migratie, /delete from public\.woningen/);
  assert.doesNotMatch(migratie, /W-0007|Parklaan 34|p_woning_id\s*=\s*17/);
});

test("archiveren sluit operationele opvolging transactioneel af", () => {
  assert.match(migratie, /Beëindig eerst de actieve verhuurperiode/);
  assert.match(migratie, /Rond eerst de actieve controle af/);
  assert.match(migratie, /update public\.woning_rayon_toewijzingen/);
  assert.match(migratie, /update public\.taken[\s\S]*status = 'geannuleerd'/);
  assert.match(migratie, /update public\.intelligence_werkpunten[\s\S]*status = 'vervallen'/);
  assert.match(migratie, /where woning\.status = 'actief'/);
});

test("alleen bevoegde gebruikers wijzigen de woningstatus", () => {
  assert.match(migratie, /auth\.uid\(\)/);
  assert.match(migratie, /public\.mag_wijzigen\(\)/);
  assert.match(migratie, /set search_path = ''/);
  assert.match(migratie, /grant execute on function public\.archiveer_woning\(bigint, text\) to authenticated/);
  assert.match(migratie, /create trigger woningen_archief_via_rpc[\s\S]*execute function private\.bewaar_woningarchief_via_rpc/);
  assert.match(migratie, /revoke all on function private\.archiveer_woning\(bigint, text\) from public, anon/);
  assert.match(migratie, /alter table public\.woning_statushistorie enable row level security/);
});

test("actieve schermen verbergen archiefwoningen en het dossier blijft leesbaar", () => {
  const woningenServer = lees("src/services/woningen-server.ts");
  const dashboard = lees("src/services/dashboard.ts");
  const energie = lees("src/lib/energie/portfolio-analyse.ts");
  const predictive = lees("src/services/predictive-intelligence.ts");
  const archief = lees("src/app/woningen/archief/page.tsx");

  assert.match(woningenServer, /getWoningen\([\s\S]*status: WoningStatus = "actief"/);
  assert.match(dashboard, /\.eq\("status", "actief"\)/);
  assert.match(energie, /sel\.archief/);
  assert.match(energie, /status\s*===\s*"actief"/);
  assert.match(predictive, /\.eq\("status", "actief"\)/);
  assert.match(archief, /getWoningen\("gearchiveerd"\)/);
  assert.match(dossier, /Operationele acties zijn in dit overzicht uitgeschakeld/);
  assert.match(dossier, /WoningArchiefActie/);
});
