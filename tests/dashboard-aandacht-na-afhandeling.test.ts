import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const servicePad =
  "src/services/business-intelligence.ts";

test("afgehandelde woning blijft niet open door een toekomstige controle", async () => {
  const service = await readFile(
    servicePad,
    "utf8"
  );

  const statusSelectie = service.match(
    /const PLANNING_STATUSSEN_MET_AANDACHT = new Set\(\[([\s\S]*?)\]\);/
  );

  assert.ok(statusSelectie);
  assert.match(statusSelectie[1], /"niet_ingepland"/);
  assert.match(statusSelectie[1], /"geen_controleur"/);
  assert.match(statusSelectie[1], /"achterstallig"/);
  assert.doesNotMatch(statusSelectie[1], /"binnen_7_dagen"/);
  assert.doesNotMatch(statusSelectie[1], /"binnen_14_dagen"/);
  assert.match(
    service,
    /PLANNING_STATUSSEN_MET_AANDACHT\.has\(\s*woningPlanning\.planning_status/
  );
});

test("afgehandelde energiesignalen blijven historie maar geen open dashboardreden", async () => {
  const service = await readFile(
    servicePad,
    "utf8"
  );

  assert.match(
    service,
    /\.from\("intelligence_werkpunten"\)[\s\S]*?\.select\("woning_id, bron_type, titel"\)[\s\S]*?\.eq\("status", "actief"\)/
  );
  assert.match(
    service,
    /const woningenMetActiefEnergieWerkpunt = new Set\(/
  );
  assert.match(
    service,
    /!woningenMetActiefEnergieWerkpunt\.has\(\s*afwijking\.woning\.id\s*\)[\s\S]*?continue;/
  );
  assert.doesNotMatch(
    service,
    /\.delete\(|\.update\(/
  );
});
