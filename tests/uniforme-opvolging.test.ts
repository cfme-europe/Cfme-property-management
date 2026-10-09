import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bestanden = {
  migratie: "supabase/migrations/20261009140000_uniforme_opvolging.sql",
  woning: "src/app/woningen/[id]/page.tsx",
  component: "src/components/opvolging/OpvolgingOverzicht.tsx",
  groepering: "src/services/opvolging-groepering.ts",
  actie: "src/services/opvolging.ts",
};

async function lees(pad: keyof typeof bestanden): Promise<string> {
  return readFile(bestanden[pad], "utf8");
}

test("afwijking, melding en taak worden één zichtbaar opvolgdossier", async () => {
  const [woning, component, groepering] = await Promise.all([
    lees("woning"), lees("component"), lees("groepering"),
  ]);

  assert.match(woning, /<OpvolgingOverzicht/);
  assert.doesNotMatch(woning, /<h2 className="text-xl font-bold">Taken<\/h2>/);
  assert.doesNotMatch(woning, /<h2 className="text-xl font-bold">Meldingen<\/h2>/);
  assert.match(component, /Meldingen, controleafwijkingen en taken staan hier per kwestie bij elkaar/);
  assert.match(groepering, /gebruikteMeldingen/);
  assert.match(groepering, /gebruikteTaken/);
  assert.match(groepering, /taak\.melding_id === afwijking\.melding_id/);
});

test("interne intelligence wordt direct gevolgd door de werklijst", async () => {
  const [woning, component] = await Promise.all([
    lees("woning"), lees("component"),
  ]);

  const intelligencePositie = woning.indexOf("<WoningDnaOverzicht");
  const werklijstPositie = woning.indexOf("<OpvolgingOverzicht");
  const briefingPositie = woning.indexOf("<ControlebriefingOverzicht");

  assert.ok(intelligencePositie >= 0);
  assert.ok(werklijstPositie > intelligencePositie);
  assert.ok(briefingPositie > werklijstPositie);
  assert.match(component, /<h2 className="text-xl font-bold">Werklijst<\/h2>/);
  assert.doesNotMatch(component, />Eén werklijst</);
});

test("één managementactie synchroniseert de onderliggende registraties", async () => {
  const [migratie, actie] = await Promise.all([
    lees("migratie"), lees("actie"),
  ]);

  assert.match(migratie, /create or replace function public\.beheer_opvolgitem/);
  assert.match(migratie, /if not public\.mag_wijzigen\(\)/);
  assert.match(migratie, /update public\.controle_afwijkingen/);
  assert.match(migratie, /update public\.meldingen/);
  assert.match(migratie, /update public\.taken/);
  assert.match(migratie, /from public, anon/);
  assert.match(actie, /supabase\.rpc\("beheer_opvolgitem"/);
});

test("bestaande brontabellen blijven beschikbaar voor audit en rapportage", async () => {
  const migratie = await lees("migratie");
  assert.doesNotMatch(migratie, /drop table/i);
  assert.doesNotMatch(migratie, /delete from/i);
  assert.match(migratie, /De brontabellen blijven bestaan/);
});
