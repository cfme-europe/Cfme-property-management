import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function lees(pad: string): string {
  return readFileSync(join(process.cwd(), pad), "utf-8");
}

const paginaPad =
  "src/app/woningen/[id]/compliance/page.tsx";

test("witte compliancekaarten hebben zelfstandig donkere tekst", () => {
  const pagina = lees(paginaPad);

  assert.match(
    pagina,
    /bg-white p-5 text-slate-950 shadow-sm/,
  );
  assert.match(
    pagina,
    /bg-white text-slate-950 shadow-sm/,
  );
  assert.match(
    pagina,
    /text-xl font-semibold text-slate-950/,
  );
  assert.match(
    pagina,
    /font-semibold text-slate-950[\s\S]*regel\.object_naam/,
  );
  assert.match(
    pagina,
    /font-medium text-slate-950[\s\S]*regel\.verplichting_naam/,
  );
});

test("complianceacties blijven met expliciet contrast leesbaar", () => {
  const pagina = lees(paginaPad);

  for (const actie of [
    "Certificering wijzigen",
    "Certificering toevoegen",
    "Taak openen",
  ]) {
    assert.match(pagina, new RegExp(actie));
  }

  assert.match(
    pagina,
    /border-slate-400 bg-white px-3 py-2 text-sm font-medium text-slate-800/,
  );
  assert.doesNotMatch(
    pagina,
    /border-slate-300 px-3 py-2 text-sm font-medium"/,
  );
});

test("objectnummer blijft exact behouden en wordt als objectcode uitgelegd", () => {
  const pagina = lees(paginaPad);

  assert.match(pagina, />\s*Objectcode:\s*</);
  assert.match(pagina, /\{regel\.objectnummer\}/);
  assert.match(
    pagina,
    /Interne identificatie van dit object; dit is geen aantal\./,
  );
  assert.match(pagina, /aria-label=\{`Objectcode/);
  assert.doesNotMatch(
    pagina,
    /` · \$\{regel\.objectnummer\}`/,
  );
});

test("woningadres staat bovenaan als herkenbare woningnaam", () => {
  const pagina = lees(paginaPad);

  assert.match(
    pagina,
    /getWoningById\(woningId\)/,
  );
  assert.match(
    pagina,
    /Compliance — \{woning\.adres\}/,
  );
  assert.match(pagina, /if \(!woning\) \{\s*notFound\(\);/);
});

test("compliancetellingen blijven data-gedreven en los van objectcodes", () => {
  const service = lees("src/services/compliance.ts");
  const migratie = lees(
    "supabase/migrations/20260728120000_9_0f_compliance_intelligence.sql",
  );

  assert.match(
    service,
    /from\("woning_compliance_samenvatting"\)/,
  );
  assert.match(
    migratie,
    /count\(\*\)::integer as aantal_verplichtingen/,
  );
  assert.match(
    migratie,
    /where compliance_status = 'verlopen'/,
  );
  assert.match(
    migratie,
    /where compliance_status in \(\s*'ontbreekt',\s*'onvolledig'/,
  );
});
