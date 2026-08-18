import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test(
  "woningadres gebruikt beveiligde correctie-rpc",
  () => {
    const service = readFileSync(
      "src/services/woningen.ts",
      "utf-8",
    );

    const sql = readFileSync(
      "supabase/migrations/20260818142000_woninggegevens_veilige_rpc.sql",
      "utf-8",
    );

    assert.match(
      service,
      /from "@\/lib\/supabase\/client"/,
    );

    assert.match(
      service,
      /const supabase = createClient\(\)/,
    );

    assert.doesNotMatch(
      service,
      /from "@\/lib\/supabase";/,
    );

    assert.match(
      service,
      /\.rpc\(\s*"corrigeer_woninggegevens"/,
    );

    assert.match(sql, /security definer/);
    assert.match(sql, /public\.mag_wijzigen\(\)/);
    assert.match(sql, /adres = trim\(p_adres\)/);
    assert.match(
      sql,
      /postcode = upper\(trim\(p_postcode\)\)/,
    );

    assert.doesNotMatch(
      sql,
      /dossiernummer\s*=/,
    );
  },
);
