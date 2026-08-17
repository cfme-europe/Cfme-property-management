import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

function lees(pad: string): string {
  return readFileSync(
    join(process.cwd(), pad),
    "utf-8"
  );
}

test(
  "admin en management hebben dezelfde gebruikersbeheerpoort",
  () => {
    const rollen = lees(
      "src/lib/auth/rollen.ts"
    );
    const service = lees(
      "src/services/gebruikersbeheer.ts"
    );
    const pagina = lees(
      "src/app/beheer/gebruikers/page.tsx"
    );
    const actions = lees(
      "src/app/beheer/gebruikers/actions.ts"
    );
    const formulier = lees(
      "src/components/beheer/GebruikerBeheerForm.tsx"
    );
    const migratie = lees(
      "supabase/migrations/20260817184500_management_admin_gelijke_bevoegdheden.sql"
    );

    assert.match(
      rollen,
      /"admin",\s*"management"/s
    );

    assert.match(
      service,
      /huidigeGebruikerMagGebruikersBeheren/
    );

    assert.doesNotMatch(
      service,
      /huidigeGebruikerIsAdmin/
    );

    assert.match(
      service,
      /rol !== beheerder\.rol/
    );

    assert.match(
      pagina,
      /huidigeGebruikerMagGebruikersBeheren/
    );

    assert.match(
      actions,
      /huidigeGebruikerMagGebruikersBeheren/
    );

    assert.match(
      actions,
      /Alleen admin of management/
    );

    assert.match(
      formulier,
      /name="rol"[\s\S]*value=\{profiel\.rol\}/
    );

    assert.match(
      migratie,
      /array\['admin', 'management'\]/
    );

    assert.match(
      migratie,
      /profiles_admin_management_select/
    );

    assert.match(
      migratie,
      /profiles_admin_management_update/
    );
  }
);
