import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test(
  "inactieve objectnummers blokkeren actieve woningroute niet",
  () => {
    const sql = readFileSync(
      "supabase/migrations/20260818143500_archiveer_inactieve_woningobjectnummers.sql",
      "utf-8",
    );

    assert.match(
      sql,
      /archiveer_woning_objectnummer/,
    );

    assert.match(
      sql,
      /format\('ARCH-%s-%s'/,
    );

    assert.match(
      sql,
      /old\.actief is true[\s\S]*new\.actief is false/,
    );

    assert.match(
      sql,
      /id is distinct from new\.id/,
    );

    assert.match(
      sql,
      /create trigger woning_objecten_archiveer_objectnummer/,
    );

    assert.match(
      sql,
      /c\.condeferrable = true/,
    );

    assert.doesNotMatch(
      sql,
      /delete from public\.woning_objecten/,
    );
  },
);
