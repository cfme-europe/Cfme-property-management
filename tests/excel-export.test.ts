import assert from "node:assert/strict";
import test from "node:test";
import {
  excelCel,
  normaliseerWerkbladNaam,
  objectenNaarMatrix,
  uniekeWerkbladNaam,
} from "../src/lib/rapportages/excel";

test(
  "JSON-waarden worden veilige Excelcellen",
  () => {
    assert.equal(excelCel(null), "");
    assert.equal(excelCel("tekst"), "tekst");
    assert.equal(excelCel(12), 12);
    assert.equal(excelCel(true), true);
    assert.equal(
      excelCel({
        status: "open",
      }),
      '{"status":"open"}'
    );
  }
);

test(
  "objecten worden als matrix geëxporteerd",
  () => {
    assert.deepEqual(
      objectenNaarMatrix([
        {
          naam: "Woning A",
          aantal: 4,
        },
        {
          naam: "Woning B",
          aantal: 3,
        },
      ]),
      [
        ["naam", "aantal"],
        ["Woning A", 4],
        ["Woning B", 3],
      ]
    );
  }
);

test(
  "lege gegevens krijgen een melding",
  () => {
    assert.deepEqual(
      objectenNaarMatrix([]),
      [
        [
          "Geen gegevens beschikbaar",
        ],
      ]
    );
  }
);

test(
  "werkbladnamen zijn geldig en uniek",
  () => {
    assert.equal(
      normaliseerWerkbladNaam(
        "Schade / onderhoud: juli?"
      ),
      "Schade onderhoud juli"
    );

    const gebruikt = new Set<string>();

    assert.equal(
      uniekeWerkbladNaam(
        "Meldingen",
        gebruikt
      ),
      "Meldingen"
    );

    assert.equal(
      uniekeWerkbladNaam(
        "Meldingen",
        gebruikt
      ),
      "Meldingen 2"
    );
  }
);
