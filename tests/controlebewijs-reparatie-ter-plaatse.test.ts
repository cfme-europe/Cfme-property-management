import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function lees(pad: string): string {
  return readFileSync(join(process.cwd(), pad), "utf-8");
}

const migratie = lees(
  "supabase/migrations/20261008150000_controlebewijs_reparatie_ter_plaatse.sql",
);
const flowService = lees("src/services/controleurflow.ts");
const flowScherm = lees(
  "src/components/controleur/ControleurFlow.tsx",
);
const inspectieDossier = lees(
  "src/app/woningen/[id]/inspecties/[inspectieId]/page.tsx",
);

test("ieder controlepunt ondersteunt opmerkingen en meerdere foto's", () => {
  assert.match(flowScherm, /opmerking: resultaat\?\.opmerkingen/);
  assert.match(flowScherm, /situatieFotos: File\[\]/);
  assert.match(flowScherm, /multiple[\s\S]*situatieFotos/);
  assert.match(
    flowService,
    /opmerkingen: invoer\.opmerkingen\?\.trim\(\) \|\| null/,
  );
  assert.match(
    migratie,
    /foto_type in \([\s\S]*'situatie'[\s\S]*'voor_herstel'[\s\S]*'na_herstel'/,
  );
});

test("reparatie ter plaatse sluit de afwijking zonder open opvolging", () => {
  assert.match(
    flowService,
    /opvolging_nodig: !terPlaatseHersteld/,
  );
  assert.match(
    flowService,
    /status: terPlaatseHersteld \? "opgelost" : "open"/,
  );
  assert.match(flowService, /opgelost_door: terPlaatseHersteld/);
  assert.match(
    migratie,
    /ter_plaatse_hersteld = false[\s\S]*status = 'opgelost'[\s\S]*opvolging_nodig = false/,
  );
});

test("reparatiegegevens en voor- en nafoto's blijven als bewijs bewaard", () => {
  assert.match(flowScherm, /gebruikteMaterialen/);
  assert.match(flowScherm, /arbeidMinuten/);
  assert.match(flowScherm, /werkelijkeKosten/);
  assert.match(flowService, /foto_type: invoer\.foto_type \?\? "situatie"/);
  assert.match(flowScherm, /foto_type: "na_herstel"/);
  assert.match(inspectieDossier, /Controlebewijs per punt/);
  assert.match(inspectieDossier, /Ter plaatse hersteld/);
});

test("ruimteakkoord overschrijft geen afzonderlijk controlebewijs", () => {
  assert.match(
    flowScherm,
    /!puntInvoer\?\.opmerking\.trim\(\)[\s\S]*puntInvoer\?\.situatieFotos\.length/,
  );
});
