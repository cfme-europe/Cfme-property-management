import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function lees(pad: string): string {
  return readFileSync(join(process.cwd(), pad), "utf-8");
}

const migratie = lees(
  "supabase/migrations/20261009110000_intelligence_werkpunten_opvolging.sql",
);
const overzicht = lees(
  "src/components/intelligence/ControlebriefingOverzicht.tsx",
);
const acties = lees(
  "src/components/intelligence/IntelligenceWerkpuntActies.tsx",
);
const server = lees("src/services/intelligence-server.ts");

test("werkpunten worden bevoegd en aantoonbaar afgehandeld", () => {
  assert.match(migratie, /public\.mag_wijzigen\(\)/);
  assert.match(migratie, /p_status not in \('opgevolgd', 'genegeerd'\)/);
  assert.match(migratie, /Een afhandelnotitie is verplicht/);
  assert.match(migratie, /afgehandeld_door = auth\.uid\(\)/);
  assert.match(migratie, /afgehandeld_door_naam = gebruiker_naam/);
  assert.match(migratie, /afgehandeld_at = now\(\)/);
  assert.match(migratie, /to authenticated/);
});

test("ieder actief werkpunt opent de bron en biedt beide afhandelkeuzes", () => {
  assert.match(overzicht, /Bron bekijken/);
  assert.match(overzicht, /bronLink\(werkpunt\)/);
  assert.match(overzicht, /IntelligenceWerkpuntActies/);
  assert.match(acties, /Gereed \/ opgevolgd/);
  assert.match(acties, /Niet relevant/);
  assert.match(acties, /Wat is ermee gedaan\?/);
  assert.match(acties, /router\.refresh\(\)/);
});

test("afgehandelde werkpunten blijven met notitie gebruiker en tijdstip zichtbaar", () => {
  assert.match(server, /\["actief", "opgevolgd", "genegeerd"\]/);
  assert.match(server, /afgehandelde_werkpunten/);
  assert.match(overzicht, /Recent afgehandeld/);
  assert.match(overzicht, /werkpunt\.afhandelnotitie/);
  assert.match(overzicht, /werkpunt\.afgehandeld_door_naam/);
  assert.match(overzicht, /datumTijd\(werkpunt\.afgehandeld_at\)/);
});
