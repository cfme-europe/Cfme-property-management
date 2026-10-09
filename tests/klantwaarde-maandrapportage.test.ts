import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  bouwKlantwaardeRapportage,
  isKlantwaardeRapportage,
} from "../src/lib/rapportages/klantwaarde-rapportage.ts";
import type { JsonWaarde } from "../src/types/maandrapportage.ts";

const bestanden = {
  migratie:
    "supabase/migrations/20261009160000_klantwaarde_maandrapportage.sql",
  component:
    "src/components/rapportages/KlantwaardeMaandrapportage.tsx",
  standaard:
    "src/components/rapportages/MaandrapportageInhoud.tsx",
  pdf: "src/app/woningen/[id]/rapportages/[rapportageId]/pdf/route.ts",
  generator: "src/services/rapportagegenerator-server.ts",
};

async function lees(
  bestand: keyof typeof bestanden,
): Promise<string> {
  return readFile(bestanden[bestand], "utf8");
}

const rapportData: Record<string, JsonWaarde> = {
  template: {
    weergave: "klantwaarde_2_paginas",
    max_paginas: 2,
  },
  rapportperiode: {
    vanaf: "2026-09-01",
    tot_en_met: "2026-09-30",
  },
  rapportagemotor: {
    energie: {
      elektriciteit: {
        per_persoon_per_week: 18,
        vorige_per_persoon_per_week: 20,
        afwijking_percentage: -10,
        signalering: "normaal",
      },
      gas: {
        per_persoon_per_week: 4,
        vorige_per_persoon_per_week: 5,
        afwijking_percentage: -20,
        signalering: "normaal",
      },
      water: {
        per_persoon_per_week: 1.2,
        vorige_per_persoon_per_week: 1,
        afwijking_percentage: 20,
        signalering: "waarschuwing",
      },
    },
  },
  inspecties: [
    { id: 1 },
    { id: 2 },
  ],
  meldingen: [
    {
      titel: "Lekkage",
      melddatum: "2026-09-03",
      oplosdatum: "2026-09-03",
      status: "opgelost",
      oplossing: "Kraan vervangen",
    },
    {
      titel: "Lamp defect",
      melddatum: "2026-09-10",
      oplosdatum: "2026-09-14",
      status: "opgelost",
      oplossing: "Armatuur vervangen",
    },
    {
      titel: "Schilderwerk",
      melddatum: "2026-09-20",
      oplosdatum: null,
      status: "open",
    },
    {
      titel: "Later afgehandeld",
      melddatum: "2026-09-25",
      oplosdatum: "2026-10-02",
      status: "opgelost",
    },
  ],
};

test("klantvariant is een tweede actieve template van maximaal twee pagina's", async () => {
  const migratie = await lees("migratie");

  assert.match(migratie, /maandrapportage-klantwaarde/);
  assert.match(migratie, /Managementrapportage klant/);
  assert.match(migratie, /'weergave', 'klantwaarde_2_paginas'/);
  assert.match(migratie, /'max_paginas', 2/);
  assert.doesNotMatch(migratie, /update public\.maandrapportages/);
  assert.doesNotMatch(migratie, /maandrapportage-standaard'[\s\S]*set/);
});

test("oplossnelheid gebruikt de historische maandstand en geen latere oplossing", () => {
  const waarde = bouwKlantwaardeRapportage(rapportData);

  assert.equal(isKlantwaardeRapportage(rapportData), true);
  assert.equal(waarde.inspecties, 2);
  assert.equal(waarde.ontvangen, 4);
  assert.equal(waarde.opgelost, 2);
  assert.equal(waarde.open_einde_periode, 2);
  assert.equal(waarde.gemiddelde_oplostijd_dagen, 2);
  assert.equal(waarde.dezelfde_dag_opgelost, 1);
  assert.equal(waarde.oplossingspercentage, 50);
  assert.equal(waarde.oplossingen.length, 2);
  assert.deepEqual(
    waarde.energie.map((item) => [
      item.sleutel,
      item.vorig,
      item.huidig,
      item.verschil_percentage,
    ]),
    [
      ["elektriciteit", 20, 18, -10],
      ["gas", 5, 4, -20],
      ["water", 1, 1.2, 20],
    ],
  );
});

test("scherm toont CFME-meerwaarde op exact twee herkenbare pagina's", async () => {
  const [component, standaard] = await Promise.all([
    lees("component"),
    lees("standaard"),
  ]);

  assert.match(component, /Pagina \{pagina\} van 2/);
  assert.match(component, /CFME-meerwaarde in één oogopslag/);
  assert.match(component, /Gemiddelde oplostijd/);
  assert.match(component, /Probleem → actie → oplossing/);
  assert.match(component, /Energieverbruik versus vorige periode/);
  assert.match(component, /Verbruik per persoon per week/);
  assert.match(component, /De getoonde oplostijd is gemeten van melddatum tot geregistreerde oplossing/);
  assert.doesNotMatch(component, /bewoner\.naam|bewoners/);
  assert.match(standaard, /isKlantwaardeRapportage\(data\)/);
  assert.match(standaard, /<KlantwaardeMaandrapportage/);
});

test("PDF gebruikt voor de klantvariant exact twee pagina's", async () => {
  const [pdf, generator] = await Promise.all([
    lees("pdf"),
    lees("generator"),
  ]);

  assert.match(pdf, /function tekenKlantwaardePdf/);
  const begin = pdf.indexOf("function tekenKlantwaardePdf");
  const einde = pdf.indexOf("function veiligeBestandsnaam");
  const klantPdf = pdf.slice(begin, einde);
  assert.equal(
    (klantPdf.match(/document\.addPage\(\)/g) ?? []).length,
    1,
  );
  assert.match(pdf, /isKlantwaardeRapportage/);
  assert.match(pdf, /Energieverbruik versus vorige periode/);
  assert.match(generator, /templateConfiguratie\.weergave/);
  assert.match(generator, /templateConfiguratie\.max_paginas/);
});
