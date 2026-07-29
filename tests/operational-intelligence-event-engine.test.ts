import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function lees(pad: string): string {
  return readFileSync(pad, "utf8");
}

const migratie = lees(
  "supabase/migrations/20260729123000_9_0i_event_engine_operational_intelligence.sql",
);

const flowServer = lees(
  "src/services/controleurflow-server.ts",
);

const flow = lees(
  "src/components/controleur/ControleurFlow.tsx",
);

const start = lees(
  "src/components/controleur/ControleStartButton.tsx",
);

const sessies = lees(
  "src/services/controlesessies.ts",
);

test("9.0I registreert iedere controlewaarneming als gebeurtenis", () => {
  assert.match(
    migratie,
    /registreer_controlefeit_gebeurtenis/,
  );
  assert.match(
    migratie,
    /controle\.feit_vastgelegd/,
  );
  assert.match(
    migratie,
    /controle_resultaat:%s:feit/,
  );
  assert.match(
    migratie,
    /on conflict \(deduplicatie_sleutel\)/,
  );
  assert.match(
    migratie,
    /'feitelijk', true/,
  );
});

test("9.0I vernieuwt intelligence automatisch na afronding", () => {
  assert.match(
    migratie,
    /ververs_intelligence_na_controle/,
  );
  assert.match(
    migratie,
    /genereer_intelligence_pakket/,
  );
  assert.match(
    migratie,
    /controle\.afgerond/,
  );
  assert.match(
    migratie,
    /controlesessies_intelligence_na_afronding/,
  );
});

test("controleur krijgt de actuele briefing en werkpunten", () => {
  assert.match(
    flowServer,
    /getActieveControlebriefingVoorWoning/,
  );
  assert.match(
    flowServer,
    /controlebriefing,/,
  );
  assert.match(
    flow,
    /Aandacht vóór de controle/,
  );
  assert.match(
    flow,
    /controlebriefing[\s\S]*\.werkpunten/,
  );
});

test("controlebriefing wordt bij starten aan de sessie gekoppeld", () => {
  assert.match(
    sessies,
    /genereerControleIntelligence/,
  );
  assert.match(
    sessies,
    /genereer_intelligence_pakket/,
  );
  assert.match(
    start,
    /genereerControleIntelligence/,
  );
  assert.match(
    start,
    /woningId,\s*sessie\.id/,
  );
});
