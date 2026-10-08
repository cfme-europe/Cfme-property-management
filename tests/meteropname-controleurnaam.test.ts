import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  bepaalOpnemerNaam,
  isTechnischeGebruikersId,
  vervangTechnischeOpnemers,
} from "../src/lib/meterstanden/opgenomen-door";
import type { Meterstand } from "../src/types/meterstand";

const controleurId =
  "8cff9b85-d0bc-4ef3-9213-4d7864d9109a";

function maakMeterstand(
  wijzigingen: Partial<Meterstand>,
): Meterstand {
  return {
    id: 1,
    created_at: "2026-08-24T10:00:00.000Z",
    updated_at: "2026-08-24T10:00:00.000Z",
    woning_id: 19,
    controlesessie_id: 42,
    opnamedatum: "2026-08-24",
    bewoners_aantal: 13,
    dagstroom_kwh: 19158,
    nachtstroom_kwh: 12678,
    elektriciteit_kwh: null,
    gas_m3: 8319,
    water_m3: 1036,
    opgenomen_door: controleurId,
    opmerkingen: null,
    ...wijzigingen,
  };
}

test(
  "herkent alleen een technisch gebruikersnummer als UUID",
  () => {
    assert.equal(
      isTechnischeGebruikersId(controleurId),
      true,
    );
    assert.equal(
      isTechnischeGebruikersId("Bob Gerits"),
      false,
    );
  },
);

test(
  "gebruikt volledige profielnaam en daarna e-mail als terugval",
  () => {
    assert.equal(
      bepaalOpnemerNaam({
        volledige_naam: "  Jos Jansen  ",
        email: "jos@example.com",
      }),
      "Jos Jansen",
    );
    assert.equal(
      bepaalOpnemerNaam({
        volledige_naam: null,
        email: " jos@example.com ",
      }),
      "jos@example.com",
    );
  },
);

test(
  "vervangt bestaand UUID met de naam uit de gekoppelde inspectie",
  () => {
    const [resultaat] = vervangTechnischeOpnemers(
      [maakMeterstand({})],
      [
        {
          id: 42,
          inspectie_id: 7,
        },
      ],
      [
        {
          id: 7,
          uitgevoerd_door: "Jos Jansen",
        },
      ],
      [
        {
          id: controleurId,
          volledige_naam: "Huidige profielnaam",
          email: "jos@example.com",
        },
      ],
    );

    assert.equal(
      resultaat.opgenomen_door,
      "Jos Jansen",
    );
  },
);

test(
  "valt zonder inspectienaam terug op profielnaam en toont nooit UUID",
  () => {
    const [metProfiel, zonderProfiel, bestaandeNaam] =
      vervangTechnischeOpnemers(
        [
          maakMeterstand({ controlesessie_id: null }),
          maakMeterstand({
            id: 2,
            controlesessie_id: null,
            opgenomen_door:
              "123e4567-e89b-42d3-a456-426614174000",
          }),
          maakMeterstand({
            id: 3,
            opgenomen_door: "Bob Gerits",
          }),
        ],
        [],
        [],
        [
          {
            id: controleurId,
            volledige_naam: "Jos Jansen",
            email: "jos@example.com",
          },
        ],
      );

    assert.equal(
      metProfiel.opgenomen_door,
      "Jos Jansen",
    );
    assert.equal(
      zonderProfiel.opgenomen_door,
      "Onbekende controleur",
    );
    assert.equal(
      bestaandeNaam.opgenomen_door,
      "Bob Gerits",
    );
  },
);

test(
  "nieuwe opslag en alle lezers gebruiken de controleurnaam",
  () => {
    const opslag = readFileSync(
      "src/services/meterstanden.ts",
      "utf8",
    );
    const dossier = readFileSync(
      "src/services/woningdossier-server.ts",
      "utf8",
    );
    const detail = readFileSync(
      "src/services/meterstanden-server.ts",
      "utf8",
    );
    const rapportage = readFileSync(
      "src/services/rapportagegenerator-server.ts",
      "utf8",
    );
    const opnemers = readFileSync(
      "src/services/meterstand-opnemers-server.ts",
      "utf8",
    );

    assert.match(opslag, /\.from\("profiles"\)/);
    assert.match(
      opslag,
      /opgenomen_door:\s*opnemerNaam/,
    );
    assert.doesNotMatch(
      opslag,
      /opgenomen_door:\s*user\.id/,
    );

    for (const lezer of [dossier, detail, rapportage]) {
      assert.match(
        lezer,
        /verrijkMeterstand(?:en)?MetOpnemer/,
      );
    }

    assert.match(
      opnemers,
      /\.from\("controlesessies"\)[\s\S]*\.select\("id, inspectie_id"\)/,
    );
    assert.doesNotMatch(
      opnemers,
      /\.from\("inspecties"\)[\s\S]*\.select\("controlesessie_id/,
    );
  },
);
