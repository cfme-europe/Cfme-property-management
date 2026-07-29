import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const flow = fs.readFileSync("src/components/controleur/ControleurFlow.tsx", "utf8");
const service = fs.readFileSync("src/services/meterstanden.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260729105800_9_0h2_uitzonderingsopname_zichtbaar_corrigeerbaar.sql", "utf8");

test("uitzonderingen maken ook zonder numerieke stand een meteropname", () => {
  assert.match(flow, /uitzonderingen/);
  assert.match(flow, /slaRouteMeterstandenOp/);
  assert.doesNotMatch(flow, /const opslag = heeftWaarden/);
  assert.match(service, /meteruitzonderingen/);
  assert.match(migration, /jsonb_object_length\(meteruitzonderingen\) > 0/);
});
