import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function lees(pad: string): string {
  return readFileSync(pad, "utf8");
}

const migratie = lees(
  "supabase/migrations/20261009120000_controleur_werkpunt_terugmeldingen.sql",
);
const controleur = lees(
  "src/components/controleur/ControleurWerkpuntTerugmelding.tsx",
);
const flow = lees(
  "src/components/controleur/ControleurFlow.tsx",
);
const management = lees(
  "src/components/intelligence/ControlebriefingOverzicht.tsx",
);
const server = lees("src/services/intelligence-server.ts");

test("controleur meldt feitelijk terug zonder werkpunt af te handelen", () => {
  assert.match(migratie, /public\.mag_controles_uitvoeren\(\)/);
  assert.match(migratie, /sessie\.status = 'bezig'/);
  assert.match(migratie, /v_sessie\.controleur_id <> auth\.uid\(\)/);
  assert.match(migratie, /werkpunt_afgehandeld', false/);
  assert.doesNotMatch(
    migratie,
    /update public\.intelligence_werkpunten[\s\S]*status =/,
  );
});

test("terugmelding is herleidbaar en kan bestaand controlebewijs koppelen", () => {
  assert.match(migratie, /controlesessie_id bigint not null/);
  assert.match(migratie, /geregistreerd_door uuid not null/);
  assert.match(migratie, /geregistreerd_door_naam text not null/);
  assert.match(migratie, /controle_resultaat_id bigint/);
  assert.match(migratie, /public\.schrijf_auditlog\(\)/);
  assert.match(migratie, /controle\.werkpunt_teruggemeld/);
});

test("controleurscherm biedt bron, drie uitkomsten en bewijskeuze", () => {
  assert.match(flow, /ControleurWerkpuntTerugmelding/);
  assert.match(controleur, /Bron bekijken/);
  assert.match(controleur, /Gecontroleerd/);
  assert.match(controleur, /Actie uitgevoerd/);
  assert.match(controleur, /Vervolg nodig/);
  assert.match(controleur, /Koppel controlebewijs/);
  assert.match(controleur, /Management beoordeelt en handelt/);
});

test("management ziet de terugmelding voordat het werkpunt wordt afgehandeld", () => {
  assert.match(server, /intelligence_werkpunt_terugmeldingen/);
  assert.match(management, /Controleur:/);
  assert.match(management, /Gekoppeld controlebewijs bekijken/);
  assert.match(management, /IntelligenceWerkpuntActies/);
});
