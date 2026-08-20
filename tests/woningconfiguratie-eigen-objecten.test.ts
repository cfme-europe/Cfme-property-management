import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test(
  "vrije woningobjecten zijn herbruikbaar en verwijderbaar",
  () => {
    const service = readFileSync(
      "src/services/woningconfiguratie.ts",
      "utf-8",
    );

    const wizard = readFileSync(
      "src/components/woningconfiguratie/WoningrouteWizard.tsx",
      "utf-8",
    );

    assert.match(
      service,
      /getHerbruikbareEigenObjecten/,
    );

    assert.match(
      service,
      /\.from\("woning_objecten"\)/,
    );

    assert.match(
      service,
      /\.eq\("actief", true\)/,
    );

    assert.match(
      wizard,
      /Eigen objecten/,
    );

    assert.match(
      wizard,
      /verwijderObjectUitRuimte/,
    );

    assert.match(
      wizard,
      /Uit ruimte verwijderen/,
    );

    assert.match(
      wizard,
      /alleObjectSjablonen\(\)/,
    );

    assert.match(
      wizard,
      /OBJECTEN\[sjabloon\.code\]/,
    );

    assert.match(
      wizard,
      /object\.sleutel !== objectSleutel/,
    );

    assert.match(
      wizard,
      /Automatisch beschikbaar uit eerder opgeslagen woningen/,
    );
  },
);
