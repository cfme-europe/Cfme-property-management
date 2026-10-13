import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("woningdossier heeft dashboard tussen de bestaande snelkoppelingen", async () => {
  const pagina = await readFile(
    "src/app/woningen/[id]/page.tsx",
    "utf8",
  );

  const actiebalk = pagina.slice(
    pagina.indexOf('<div className="flex flex-wrap gap-3">'),
    pagina.indexOf('<header className="mb-8'),
  );

  assert.match(actiebalk, /href="\/"/);
  assert.match(actiebalk, />\s*Dashboard\s*</);
  assert.match(actiebalk, /Nieuwe inspectie/);
  assert.match(actiebalk, /Opvolging/);
  assert.match(actiebalk, /Compliance/);
});

test("dashboard bevat geen overbodige woningkeuze", async () => {
  const dashboard = await readFile("src/app/page.tsx", "utf8");

  assert.doesNotMatch(dashboard, /WoningSnelkoppelingen/);
  assert.doesNotMatch(dashboard, /Woning snel openen/);
});
