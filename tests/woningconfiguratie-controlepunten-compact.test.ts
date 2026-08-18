import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

function lees(pad: string): string {
  return readFileSync(join(process.cwd(), pad), "utf-8");
}

test("controlepunten zijn compact per ruimte zichtbaar en beheerbaar", () => {
  const wizard = lees(
    "src/components/woningconfiguratie/WoningrouteWizard.tsx",
  );
  const beheer = lees(
    "src/components/woningconfiguratie/WoningconfiguratieBeheer.tsx",
  );
  const pagina = lees(
    "src/app/woningen/[id]/configuratie/page.tsx",
  );
  const beheerPagina = lees(
    "src/app/woningen/[id]/configuratie/controlepunten/page.tsx",
  );

  assert.match(wizard, /actieveControlepunten/);
  assert.match(wizard, /actieve controlepunten in deze ruimte/);
  assert.match(wizard, />\s*Aanpassen\s*</);
  assert.match(wizard, /Verplicht/);
  assert.match(wizard, /Optioneel/);

  assert.doesNotMatch(
    wizard,
    /\{ruimte\.controles\.length\} controlepunten/,
  );

  assert.match(pagina, /Alle controlepunten/);

  assert.match(beheer, /alleenControlepunten/);
  assert.match(beheer, /ruimteFilterId/);

  assert.match(
    beheerPagina,
    /Controlepunten — \$\{geselecteerdeRuimte\.naam\}/,
  );
  assert.match(
    beheerPagina,
    /Beheer uitsluitend de controlepunten van deze ruimte/,
  );
});
