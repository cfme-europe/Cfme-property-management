import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function lees(pad: string): string {
  return readFileSync(pad, "utf8");
}

const migratie = lees(
  "supabase/migrations/20261009130000_controleur_inspectie_annuleren.sql",
);
const flow = lees(
  "src/components/controleur/ControleurFlow.tsx",
);
const starten = lees(
  "src/components/controleur/ControleStartButton.tsx",
);
const werkplek = lees(
  "src/services/controleurwerkplek-server.ts",
);
const predictive = lees(
  "src/services/predictive-intelligence.ts",
);
const rapportage = lees(
  "src/services/rapportagegenerator-server.ts",
);
const inspectiedetail = lees(
  "src/app/woningen/[id]/inspecties/[inspectieId]/page.tsx",
);

test("controleur annuleert alleen eigen lege actieve controle met reden", () => {
  assert.match(migratie, /public\.mag_controles_uitvoeren\(\)/);
  assert.match(migratie, /sessie\.status = 'bezig'/);
  assert.match(migratie, /v_sessie\.controleur_id is distinct from auth\.uid\(\)/);
  assert.match(migratie, /length\(v_reden\) < 5/);
  assert.match(migratie, /from public\.controle_resultaten/);
  assert.match(migratie, /from public\.meterstanden/);
  assert.match(migratie, /from public\.inspectiefotos/);
});

test("annulering bewaart auditspoor en annuleert sessie plus inspectie", () => {
  assert.match(migratie, /status = 'geannuleerd'/);
  assert.match(migratie, /geannuleerd_at = now\(\)/);
  assert.match(migratie, /annuleringsreden = v_reden/);
  assert.match(migratie, /geannuleerd_door = auth\.uid\(\)/);
  assert.match(migratie, /controle\.inspectie_geannuleerd/);
  assert.match(migratie, /to authenticated/);
});

test("controleurscherm vraagt reden en bevestiging", () => {
  assert.match(flow, /Verkeerde controle gestart\?/);
  assert.match(flow, /Reden van annulering/);
  assert.match(flow, /window\.confirm/);
  assert.match(flow, /annuleerControleflow/);
});

test("nieuwe controle vraagt bevestiging en waarschuwt bij tweede controle vandaag", () => {
  assert.match(starten, /Nieuwe controle starten voor/);
  assert.match(starten, /Vandaag is voor/);
  assert.match(starten, /window\.confirm/);
});

test("geannuleerde inspectie telt niet mee in werkplek intelligence of rapportage", () => {
  assert.match(werkplek, /neq\("status", "geannuleerd"\)/);
  assert.match(predictive, /neq\("status", "geannuleerd"\)/);
  assert.match(rapportage, /neq\("status", "geannuleerd"\)/);
  assert.match(inspectiedetail, /Geannuleerd/);
  assert.match(inspectiedetail, /inspectie\.annuleringsreden/);
});
