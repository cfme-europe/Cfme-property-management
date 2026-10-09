import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bestanden = {
  knop: "src/components/rapportages/KlantversieButton.tsx",
  pagina: "src/app/woningen/[id]/rapportages/[rapportageId]/page.tsx",
  pdf: "src/app/woningen/[id]/rapportages/[rapportageId]/pdf/route.ts",
  bibliotheek: "src/services/rapportagebibliotheek.ts",
};

test("bestaande maandrapportage biedt een selecteerbare klantversie", async () => {
  const [knop, pagina] = await Promise.all([
    readFile(bestanden.knop, "utf8"),
    readFile(bestanden.pagina, "utf8"),
  ]);

  assert.match(pagina, /<KlantversieButton/);
  assert.match(knop, /Klantversie maken/);
  assert.match(knop, /Energieverbruik en vergelijking/);
  assert.match(knop, /Reparaties en oplossingen/);
  assert.match(knop, /Meldingen en opvolgsnelheid/);
  assert.match(knop, /Selecteer minimaal één onderdeel/);
});

test("klantversie filtert uitsluitend de export en bewaart rapportgegevens", async () => {
  const pdf = await readFile(bestanden.pdf, "utf8");

  assert.match(pdf, /variant.*klantwaarde/);
  assert.match(pdf, /zoekparameters\.get\("onderdelen"\)/);
  assert.match(pdf, /onderdelen: klantversie \? \[\.\.\.onderdelen\] : null/);
  assert.doesNotMatch(pdf, /\.from\("maandrapportages"\)\s*\.update/);
});

test("verkeerde tweede template verdwijnt uit nieuwe rapportagekeuze", async () => {
  const bibliotheek = await readFile(bestanden.bibliotheek, "utf8");
  assert.match(
    bibliotheek,
    /\.neq\("code", "maandrapportage-klantwaarde"\)/,
  );
});
