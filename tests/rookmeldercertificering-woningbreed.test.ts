import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function lees(pad: string): string {
  return readFileSync(join(process.cwd(), pad), "utf-8");
}

const migratiePad =
  "supabase/migrations/20261008133000_rookmeldercertificering_woningbreed.sql";

test("rookmeldercertificering is onafhankelijk van het aantal objecten", () => {
  const migratie = lees(migratiePad);
  const service = lees("src/services/certificeringen.ts");
  const formulier = lees(
    "src/components/certificeringen/CertificeringForm.tsx"
  );
  const compliance = lees(
    "src/app/woningen/[id]/compliance/page.tsx"
  );

  assert.match(
    migratie,
    /certificeringen_een_actieve_rookmelder_per_woning_idx/
  );
  assert.match(
    migratie,
    /where actief = true\s+and type = 'rookmelder'/
  );
  assert.match(
    migratie,
    /verplichting\.certificering_type = 'rookmelder'[\s\S]*overzicht\.woning_id = object\.woning_id/
  );
  assert.match(
    service,
    /invoer\.type === "rookmelder"[\s\S]*\? null[\s\S]*: invoer\.object_id/
  );
  assert.match(
    formulier,
    /Eén registratie geldt voor alle rookmelders/
  );
  assert.match(
    compliance,
    /certificeringen\/nieuw\?type=rookmelder/
  );
});

test("oudere dubbele registratie blijft als historie bewaard", () => {
  const migratie = lees(migratiePad);

  assert.match(migratie, /row_number\(\) over/);
  assert.match(migratie, /set\s+actief = false/);
  assert.doesNotMatch(migratie, /delete\s+from\s+public\.certificeringen/i);
});

test("compliance wordt na de woningbrede omzetting opnieuw opgebouwd", () => {
  const migratie = lees(migratiePad);

  assert.match(
    migratie,
    /disable trigger certificeringen_compliance_synchronisatie/
  );
  assert.match(
    migratie,
    /enable trigger certificeringen_compliance_synchronisatie/
  );
  assert.match(
    migratie,
    /synchroniseer_compliance_voor_woning/
  );
});

test("iedere brandblusser behoudt een eigen actieve certificering", () => {
  const migratie = lees(migratiePad);
  const service = lees("src/services/certificeringen.ts");

  assert.match(
    migratie,
    /certificeringen_een_actieve_brandblusser_per_object_idx[\s\S]*on public\.certificeringen \(object_id\)/
  );
  assert.match(
    migratie,
    /type = 'brandblusser'[\s\S]*object_id is not null/
  );
  assert.match(
    migratie,
    /gerangschikte_brandblussercertificeringen/
  );
  assert.match(
    service,
    /type === "brandblusser"[\s\S]*Kies de afzonderlijke brandblusser/
  );
});
