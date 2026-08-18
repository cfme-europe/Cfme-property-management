import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

function lees(pad: string): string {
  return readFileSync(
    join(process.cwd(), pad),
    "utf-8",
  );
}

test(
  "woninggegevens en actieve verhuurperiode zijn veilig corrigeerbaar",
  () => {
    const woningen = lees(
      "src/services/woningen.ts",
    );

    const verhuur = lees(
      "src/services/verhuurperiodes.ts",
    );

    const dossier = lees(
      "src/app/woningen/[id]/page.tsx",
    );

    const woningPagina = lees(
      "src/app/woningen/[id]/bewerken/page.tsx",
    );

    const verhuurPagina = lees(
      "src/app/woningen/[id]/verhuur/bewerken/page.tsx",
    );

    assert.match(
      woningen,
      /updateWoningGegevens/,
    );

    assert.match(
      woningen,
      /\.rpc\(\s*"corrigeer_woninggegevens"/,
    );

    assert.doesNotMatch(
      woningen,
      /\.from\("woningen"\)[\s\S]*\.update/,
    );

    assert.match(
      verhuur,
      /updateVerhuurperiode/,
    );

    assert.match(
      verhuur,
      /Deze correctie overlapt een andere verhuurperiode/,
    );

    assert.match(
      verhuur,
      /\.eq\("status", "actief"\)/,
    );

    assert.match(
      dossier,
      /Woninggegevens bewerken/,
    );

    assert.match(
      dossier,
      /Verhuurperiode bewerken/,
    );

    assert.match(
      woningPagina,
      /WoningBewerkenForm/,
    );

    assert.match(
      verhuurPagina,
      /VerhuurperiodeBewerkenForm/,
    );
  },
);
