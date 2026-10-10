import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migratiepad =
  "supabase/migrations/20261010100000_documentduplicaten_samenvoegen.sql";

test("alleen het bewezen Hovk-uploadpatroon wordt samengevoegd", async () => {
  const migratie = await readFile(migratiepad, "utf8");

  assert.match(migratie, /v_aantal <> 16/);
  assert.match(migratie, /v_actief <> 13/);
  assert.match(migratie, /v_gearchiveerd <> 3/);
  assert.match(migratie, /v_woningen <> 1/);
  assert.match(migratie, /v_bestandsnamen <> 1/);
  assert.match(migratie, /v_bestandsgroottes <> 1/);
  assert.match(migratie, /v_mime_types <> 1/);
  assert.match(
    migratie,
    /productiegegevens wijken af van het bewezen patroon/,
  );
});

test("samenvoegen bewaart documenten versies en opslagbestanden", async () => {
  const migratie = await readFile(migratiepad, "utf8");

  assert.match(migratie, /samengevoegd_met_document_id/);
  assert.match(migratie, /status = 'gearchiveerd'/);
  assert.doesNotMatch(migratie, /delete\s+from\s+public\.document/i);
  assert.doesNotMatch(migratie, /storage\.objects\s+delete/i);
});

test("samengevoegde registraties verdwijnen uit beide gewone overzichten", async () => {
  const [service, detail] = await Promise.all([
    readFile("src/services/documenten.ts", "utf8"),
    readFile(
      "src/app/woningen/[id]/documenten/[documentId]/page.tsx",
      "utf8",
    ),
  ]);

  assert.equal(
    service.match(/\.is\("samengevoegd_met_document_id", null\)/g)?.length,
    2,
  );
  assert.match(detail, /document\.samengevoegd_met_document_id/);
  assert.match(detail, /redirect\(/);
});
