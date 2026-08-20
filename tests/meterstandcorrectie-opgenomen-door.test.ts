import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test(
  "meterstandcorrectie bewaart opgenomen door en weigert lege correcties",
  () => {
    const service = readFileSync(
      "src/services/meterstanden.ts",
      "utf-8",
    );

    const sql = readFileSync(
      "supabase/migrations/20260820150000_meterstandcorrectie_opgenomen_door.sql",
      "utf-8",
    );

    assert.match(
      service,
      /p_opgenomen_door:\s*geldig\.opgenomen_door/,
    );

    assert.match(
      sql,
      /p_opgenomen_door text/,
    );

    assert.match(
      sql,
      /opgenomen_door\s*=\s*v_opgenomen_door/,
    );

    assert.match(
      sql,
      /'opgenomen_door',\s*v_oud\.opgenomen_door/,
    );

    assert.match(
      sql,
      /'opgenomen_door',\s*v_opgenomen_door/,
    );

    assert.match(
      sql,
      /Er zijn geen wijzigingen om op te slaan/,
    );

    assert.match(
      sql,
      /v_meetgegevens_gewijzigd/,
    );

    assert.doesNotMatch(
      sql,
      /delete from public\.meterstand_correcties/i,
    );
  },
);
