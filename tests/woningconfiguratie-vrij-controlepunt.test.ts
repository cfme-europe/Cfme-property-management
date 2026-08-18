import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

function lees(pad: string): string {
  return readFileSync(
    join(process.cwd(), pad),
    "utf-8",
  );
}

test(
  "woningconfiguratie ondersteunt vrije controlepunten",
  () => {
    const beheer = lees(
      "src/components/woningconfiguratie/WoningconfiguratieBeheer.tsx",
    );

    const migratie = lees(
      "supabase/migrations/20260818114500_vrij_controlepunt.sql",
    );

    assert.match(
      beheer,
      /VRIJ_CONTROLEPUNT/,
    );

    assert.match(
      beheer,
      /\+ Vrij controlepunt/,
    );

    assert.match(
      beheer,
      /required=\{vrijControlepunt\}/,
    );

    assert.match(
      beheer,
      /Naam van het vrije controlepunt/,
    );

    assert.match(
      migratie,
      /'VRIJ_CONTROLEPUNT'/,
    );

    assert.match(
      migratie,
      /categorie = 'algemeen'/,
    );
  },
);
