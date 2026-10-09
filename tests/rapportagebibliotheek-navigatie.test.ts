import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bestanden = {
  dashboard: "src/app/page.tsx",
  bibliotheek: "src/app/rapportages/bibliotheek/page.tsx",
  templateversie:
    "src/app/rapportages/bibliotheek/versies/[versieId]/page.tsx",
};

test("technische rapportagebibliotheek is niet zichtbaar in de navigatie", async () => {
  const dashboard = await readFile(bestanden.dashboard, "utf8");

  assert.doesNotMatch(dashboard, /href="\/rapportages\/bibliotheek"/);
});

test("oude rapportagebeheerlinks keren terug naar het dashboard", async () => {
  const [bibliotheek, templateversie] = await Promise.all([
    readFile(bestanden.bibliotheek, "utf8"),
    readFile(bestanden.templateversie, "utf8"),
  ]);

  for (const pagina of [bibliotheek, templateversie]) {
    assert.match(pagina, /redirect\("\/"\)/);
    assert.doesNotMatch(pagina, /RapportagebibliotheekBeheer|TemplateversieBeheer/);
  }
});
