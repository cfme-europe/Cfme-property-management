import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function lees(pad: string): string {
  return readFileSync(join(process.cwd(), pad), "utf-8");
}

test("documentverplichting biedt openen of objectgerichte upload", () => {
  const pagina = lees(
    "src/app/woningen/[id]/compliance/page.tsx",
  );

  assert.match(pagina, /regel\.document_id \? \(/);
  assert.match(
    pagina,
    /documenten\/\$\{regel\.document_id\}/,
  );
  assert.match(pagina, /Document openen/);
  assert.match(pagina, /Keuringsdocument toevoegen/);
  assert.match(pagina, /objectId: String\(regel\.object_id\)/);
  assert.match(
    pagina,
    /documentType: regel\.document_type \?\? "overig"/,
  );
});

test("documentvoorinvulling koppelt uitsluitend een object van de woning", () => {
  const pagina = lees(
    "src/app/woningen/[id]/documenten/nieuw/page.tsx",
  );

  assert.match(
    pagina,
    /getComplianceObjectOpties\(woningId\)/,
  );
  assert.match(
    pagina,
    /objecten\.find\([\s\S]*object\.id === gevraagdObjectId/,
  );
  assert.match(pagina, /name="object_id"/);
  assert.match(pagina, /value=\{gekoppeldObject\.id\}/);
  assert.match(pagina, /Gekoppeld aan object/);
  assert.match(pagina, /defaultValue=\{documentType\}/);
  assert.match(pagina, /defaultValue=\{titel\}/);
});
