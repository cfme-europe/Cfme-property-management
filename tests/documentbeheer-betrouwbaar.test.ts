import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bestanden = {
  migratie: "supabase/migrations/20261009150000_documentbeheer_betrouwbaar.sql",
  service: "src/services/documenten.ts",
  formulier: "src/components/documenten/DocumentFormulier.tsx",
  acties: "src/app/woningen/[id]/documenten/actions.ts",
  nieuw: "src/app/woningen/[id]/documenten/nieuw/page.tsx",
  detail: "src/app/woningen/[id]/documenten/[documentId]/page.tsx",
  compliance: "src/app/woningen/[id]/compliance/page.tsx",
};

async function lees(sleutel: keyof typeof bestanden): Promise<string> {
  return readFile(bestanden[sleutel], "utf8");
}

test("dezelfde uploadhandeling maakt nooit meerdere documenten", async () => {
  const [migratie, service] = await Promise.all([
    lees("migratie"),
    lees("service"),
  ]);

  assert.match(migratie, /documenten_upload_sleutel_uniek/);
  assert.match(migratie, /on conflict \(upload_sleutel\)/);
  assert.match(migratie, /registreer_document_upload/);
  assert.match(service, /valideerUploadSleutel/);
  assert.match(service, /supabase\.rpc\("registreer_document_upload"/);
  assert.doesNotMatch(service, /Automatisch gearchiveerd na mislukte eerste upload/);
});

test("document en eerste versie worden in één databasehandeling geregistreerd", async () => {
  const migratie = await lees("migratie");

  const functie = migratie.slice(
    migratie.indexOf("create or replace function public.registreer_document_upload"),
    migratie.indexOf("create or replace function public.registreer_documentversie_upload"),
  );

  assert.match(functie, /insert into public\.documenten/);
  assert.match(functie, /insert into public\.documentversies/);
  assert.match(functie, /security invoker/);
  assert.match(functie, /public\.mag_administratie_beheren\(\)/);
});

test("ook een nieuwe documentversie is bestand tegen dubbel tikken", async () => {
  const [migratie, service] = await Promise.all([
    lees("migratie"),
    lees("service"),
  ]);

  assert.match(migratie, /documentversies_upload_sleutel_uniek/);
  assert.match(migratie, /pg_advisory_xact_lock\(p_document_id\)/);
  assert.match(service, /supabase\.rpc\(\s*"registreer_documentversie_upload"/);
});

test("uploadknoppen blokkeren tijdens verwerking en tonen fouten", async () => {
  const [formulier, nieuw, detail, compliance] = await Promise.all([
    lees("formulier"),
    lees("nieuw"),
    lees("detail"),
    lees("compliance"),
  ]);

  assert.match(formulier, /if \(bezig\) return/);
  assert.match(formulier, /<fieldset disabled=\{bezig\}/);
  assert.match(formulier, /role="alert"/);
  assert.match(formulier, /Tik niet opnieuw/);
  assert.match(nieuw, /uploadSleutel=\{crypto\.randomUUID\(\)\}/);
  assert.match(detail, /uploadSleutel=\{crypto\.randomUUID\(\)\}/);
  assert.match(compliance, /uploadSleutel=\{crypto\.randomUUID\(\)\}/);
});

test("archiveren heeft bevestiging, zichtbare fout en bewaart historie", async () => {
  const [migratie, detail, acties] = await Promise.all([
    lees("migratie"),
    lees("detail"),
    lees("acties"),
  ]);

  assert.match(migratie, /create or replace function public\.archiveer_document/);
  assert.match(migratie, /status = 'gearchiveerd'/);
  assert.match(migratie, /from public, anon/);
  assert.doesNotMatch(migratie, /delete from public\.document/);
  assert.match(detail, /bevestiging="Dit document archiveren\?/);
  assert.match(acties, /fout: foutmelding\(error\)/);
});
