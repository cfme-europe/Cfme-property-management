import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bestanden = {
  dashboard: "src/app/page.tsx",
  component: "src/components/dashboard/WoningSnelkoppelingen.tsx",
  woningdossier: "src/app/woningen/[id]/page.tsx",
  service: "src/services/business-intelligence.ts",
  types: "src/types/business-intelligence.ts",
};

test("dashboard biedt na woningkeuze dezelfde veilige dossieracties", async () => {
  const [dashboard, component] = await Promise.all([
    readFile(bestanden.dashboard, "utf8"),
    readFile(bestanden.component, "utf8"),
  ]);

  assert.match(dashboard, /<WoningSnelkoppelingen/);
  assert.match(component, /Kies een woning/);
  assert.match(component, /Nieuwe inspectie/);
  assert.match(component, /Opvolging/);
  assert.match(component, /Compliance/);
  assert.match(component, /Woninggegevens/);
  assert.match(component, /Woningconfiguratie/);
  assert.match(component, /Planning/);
  assert.match(component, /Verhuur beheren/);
});

test("snelkoppelingen gebruiken alle woningen zonder gevaarlijke beëindigingsactie", async () => {
  const [component, service, types, woningdossier] = await Promise.all([
    readFile(bestanden.component, "utf8"),
    readFile(bestanden.service, "utf8"),
    readFile(bestanden.types, "utf8"),
    readFile(bestanden.woningdossier, "utf8"),
  ]);

  assert.match(types, /woningen: CockpitWoning\[\]/);
  assert.match(service, /return \{\s+woningen,/);
  assert.doesNotMatch(component, /verhuur\/beeindigen/);
  assert.match(component, /#verhuur/);
  assert.match(woningdossier, /id="verhuur"/);
});
