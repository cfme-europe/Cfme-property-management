import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isWoningrouteOpslagbevestigingGevraagd,
  maakWoningrouteOpslagbevestiging,
} from "../src/lib/woningconfiguratie/opslagbevestiging";

test("opslagbevestiging gebruikt uitsluitend canonieke actieve databasegegevens", () => {
  const melding = maakWoningrouteOpslagbevestiging({
    ruimten: [
      { actief: true, ruimte_type: "slaapkamer" },
      { actief: true, ruimte_type: "overig" },
      { actief: false, ruimte_type: "slaapkamer" },
    ],
    controlepunten: [
      { actief: true },
      { actief: true },
      { actief: false },
    ],
  });

  assert.equal(
    melding,
    "Wijzigingen opgeslagen en vanuit de database opnieuw geladen: " +
      "2 ruimten, 1 slaapkamer en 2 controlepunten.",
  );
});

test("alleen de expliciete opslagparameter activeert de bevestiging", () => {
  assert.equal(isWoningrouteOpslagbevestigingGevraagd("1"), true);
  assert.equal(isWoningrouteOpslagbevestigingGevraagd("0"), false);
  assert.equal(isWoningrouteOpslagbevestigingGevraagd(["1"]), false);
  assert.equal(isWoningrouteOpslagbevestigingGevraagd(undefined), false);
});

test("wizard herlaadt volledig en initialiseert de melding zonder effect-setState", () => {
  const wizard = readFileSync(
    "src/components/woningconfiguratie/WoningrouteWizard.tsx",
    "utf8",
  );
  const pagina = readFileSync(
    "src/app/woningen/[id]/configuratie/page.tsx",
    "utf8",
  );

  assert.match(
    wizard,
    /useState\(initieleMelding\)/,
  );
  assert.match(
    wizard,
    /window\.location\.replace\(herlaadUrl\.toString\(\)\)/,
  );
  assert.doesNotMatch(wizard, /router\.refresh\(\)/);
  const effectBegin = wizard.indexOf("  useEffect(() => {");
  const effectEinde = wizard.indexOf(
    "  }, [initieleMelding]);",
    effectBegin,
  );

  assert.ok(effectBegin >= 0, "Effect voor URL-opschoning ontbreekt.");
  assert.ok(effectEinde > effectBegin, "Effecteinde ontbreekt.");
  assert.doesNotMatch(
    wizard.slice(effectBegin, effectEinde),
    /setMelding\(/,
  );
  assert.match(
    pagina,
    /maakWoningrouteOpslagbevestiging\(configuratie\)/,
  );
  assert.match(
    pagina,
    /initieleMelding=\{initieleMelding\}/,
  );
});
