import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test(
  "woning en verhuurcorrecties hebben databasebevoegdheid en veilige objectnummering",
  () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260818140500_woning_verhuur_update_objectnummer_deferred.sql",
      ),
      "utf-8",
    );

    assert.match(
      sql,
      /grant update \(adres, postcode, plaats\)/,
    );

    assert.match(
      sql,
      /Woningen bevoegd wijzigen/,
    );

    assert.match(
      sql,
      /Verhuurperiodes bevoegd wijzigen/,
    );

    assert.match(
      sql,
      /status = 'actief'/,
    );

    assert.match(
      sql,
      /deferrable initially deferred/,
    );

    assert.match(
      sql,
      /woning_objecten_objectnummer_uniek/,
    );
  },
);
