import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  bouwZakelijkeRapportageModel,
  type JsonObject,
} from "../src/lib/rapportages/zakelijke-rapportage";

function lees(pad: string): string {
  return readFileSync(pad, "utf8");
}

const basisMigratie = lees(
  "supabase/migrations/20260724120000_8_1a_controleur_rapportage_basis.sql",
);

const opvolgingMigratie = lees(
  "supabase/migrations/20260726190000_8_1d_automatische_opvolging.sql",
);

const workflowHardeningMigratie = lees(
  "supabase/migrations/20260726210000_8_1h_workflow_verwerkt_at_hardening.sql",
);

const woningconfiguratieService = lees(
  "src/services/woningconfiguratie.ts",
);

const controleurflowService = lees(
  "src/services/controleurflow.ts",
);

const controleurflowServer = lees(
  "src/services/controleurflow-server.ts",
);

const afwijkingenService = lees(
  "src/services/controleafwijkingen.ts",
);

const rapportagegenerator = lees(
  "src/services/rapportagegenerator-server.ts",
);

const rapportagemotor = lees(
  "src/services/rapportagemotor.ts",
);

const rapportageScherm = lees(
  "src/components/rapportages/MaandrapportageInhoud.tsx",
);

const pdfRoute = lees(
  "src/app/woningen/[id]/rapportages/[rapportageId]/pdf/route.ts",
);

const excelExport = lees(
  "src/components/rapportages/RapportageExcelButton.tsx",
);

test("database ondersteunt de volledige configureerbare woningketen", () => {
  const vereisteTabellen = [
    "woning_verdiepingen",
    "woning_ruimten",
    "woning_objecten",
    "controlepunt_definities",
    "woning_controlepunten",
    "controle_resultaten",
    "controle_afwijkingen",
  ];

  for (const tabel of vereisteTabellen) {
    assert.match(
      basisMigratie,
      new RegExp(
        `create table(?: if not exists)? public\\.${tabel}`,
        "i",
      ),
      `Tabel ${tabel} ontbreekt in de basismigratie.`,
    );
  }

  assert.match(
    basisMigratie,
    /constraint controle_resultaten_uniek/i,
  );

  assert.match(
    basisMigratie,
    /woning_verdiepingen[\s\S]*woning_id/i,
  );

  assert.match(
    basisMigratie,
    /woning_ruimten[\s\S]*verdieping_id/i,
  );

  assert.match(
    basisMigratie,
    /woning_objecten[\s\S]*ruimte_id/i,
  );

  assert.match(
    basisMigratie,
    /woning_controlepunten[\s\S]*object_id/i,
  );
});

test("woningconfiguratie en controleurflow vormen één applicatieketen", () => {
  const configuratiefuncties = [
    "createVerdieping",
    "createRuimte",
    "createObject",
    "createControlepunt",
  ];

  for (const functie of configuratiefuncties) {
    assert.match(
      woningconfiguratieService,
      new RegExp(
        `export async function ${functie}\\(`,
      ),
    );
  }

  const controlefuncties = [
    "slaControleResultaatOp",
    "slaControleAfwijkingOp",
    "uploadControleFoto",
    "rondControleflowAf",
  ];

  for (const functie of controlefuncties) {
    assert.match(
      controleurflowService,
      new RegExp(
        `export async function ${functie}\\(`,
      ),
    );
  }

  assert.match(
    controleurflowServer,
    /export async function getControleurFlow\(/,
  );

  assert.match(
    controleurflowServer,
    /woning_controlepunten/,
  );

  assert.match(
    controleurflowServer,
    /controle_resultaten/,
  );
});

test("afwijking maakt idempotent melding en taak aan", () => {
  assert.match(
    opvolgingMigratie,
    /create or replace function public\.verwerk_controle_afwijking_opvolging\(\)/i,
  );

  assert.match(
    opvolgingMigratie,
    /create trigger controle_afwijkingen_automatische_opvolging/i,
  );

  assert.match(
    opvolgingMigratie,
    /meldingen_controle_afwijking_referentie_uniek_idx/i,
  );

  assert.match(
    opvolgingMigratie,
    /taken_controle_afwijking_referentie_uniek_idx/i,
  );

  assert.match(
    opvolgingMigratie,
    /factuur/i,
  );

  assert.match(
    afwijkingenService,
    /export async function updateControleAfwijkingBeheer\(/,
  );

  assert.match(
    afwijkingenService,
    /kosten|werkelijke_kosten|geschatte_kosten/i,
  );
});

test("verwerkte workflowgebeurtenis krijgt altijd een verwerkingstijd", () => {
  assert.match(
    workflowHardeningMigratie,
    /new\.status = 'verwerkt'/,
  );

  assert.match(
    workflowHardeningMigratie,
    /new\.verwerkt_at := now\(\)/,
  );

  assert.match(
    workflowHardeningMigratie,
    /before insert or update of status, verwerkt_at/i,
  );
});

test("rapportagegenerator gebruikt de formele rapportagemotor", () => {
  assert.match(
    rapportagegenerator,
    /bouwRapportagemotor/,
  );

  assert.match(
    rapportagegenerator,
    /rapportagemotor/,
  );

  assert.match(
    rapportagemotor,
    /export function bouwRapportagemotor\(/,
  );

  assert.match(
    rapportagemotor,
    /persoonsweken/,
  );

  assert.match(
    rapportagemotor,
    /risico/i,
  );

  assert.match(
    rapportagemotor,
    /kosten/i,
  );
});

test("formele rapportagedata voedt scherm, PDF en Excel", () => {
  const data: JsonObject = {
    gegenereerd_op: "2026-07-26T15:00:00.000Z",
    rapportagemotor: {
      huidige_periode: {
        vanaf: "2026-06-01",
        tot_en_met: "2026-06-30",
      },
      vorige_periode: {
        vanaf: "2026-05-01",
        tot_en_met: "2026-05-31",
      },
      vergelijking: {
        inspecties: {
          huidig: 2,
          vorig: 1,
          absoluut: 1,
          procentueel: 100,
        },
        meldingen: {
          huidig: 3,
          vorig: 2,
          absoluut: 1,
          procentueel: 50,
        },
        open_meldingen: {
          huidig: 1,
          vorig: 2,
          absoluut: -1,
          procentueel: -50,
        },
        afwijkingen: {
          huidig: 2,
          vorig: 1,
          absoluut: 1,
          procentueel: 100,
        },
        open_afwijkingen: {
          huidig: 1,
          vorig: 1,
          absoluut: 0,
          procentueel: 0,
        },
      },
      energie: {
        elektriciteit: {
          totaal: 480,
          persoonsweken: 24,
          per_persoon_per_week: 20,
          vorige_per_persoon_per_week: 16,
          afwijking_percentage: 25,
          signalering: "waarschuwing",
        },
        ongeldige_of_onvolledige_meetperioden: 0,
      },
      kosten: {
        werkelijk: 250,
        geschat: 100,
        totaal_indicatie: 350,
        definitief: false,
        per_factuurontvanger: {
          cfme: 250,
          hurend_bedrijf: 100,
        },
      },
      risico: {
        score: 4.5,
        classificatie: "middel",
        factoren: [
          "Energieverbruik wijkt af",
          "Eén open afwijking",
        ],
      },
      acties: [
        "Controleer het verhoogde energieverbruik.",
        "Volg de open afwijking op.",
      ],
    },
    samenvatting: {
      bewoners_aantal: 6,
      inspecties_aantal: 2,
      meldingen_open: 1,
      schademeldingen_aantal: 1,
    },
    inspecties: [
      {
        id: 10,
        inspectiedatum: "2026-06-15",
        algemene_toestand: "goed",
        orde_netheid_score: 8,
        schade_aanwezig: false,
      },
    ],
    meldingen: [
      {
        id: 20,
        titel: "Losse deurklink",
        status: "in_behandeling",
        prioriteit: "normaal",
        factuur_naar: "cfme",
      },
    ],
    meterstanden: [],
    energieverbruik: [],
    opmerkingen: "Geen aanvullende besluiten.",
  };

  const model =
    bouwZakelijkeRapportageModel(data);

  assert.equal(
    model.huidige_periode.vanaf,
    "2026-06-01",
  );

  assert.equal(
    model.vergelijking.find(
      (item) => item.sleutel === "inspecties",
    )?.huidig,
    2,
  );

  assert.equal(
    model.energie.find(
      (item) => item.sleutel === "elektriciteit",
    )?.per_persoon_per_week,
    20,
  );

  assert.equal(
    model.energie.find(
      (item) => item.sleutel === "elektriciteit",
    )?.signalering,
    "waarschuwing",
  );

  assert.equal(
    model.kosten.totaal_indicatie,
    350,
  );

  assert.equal(model.risico.score, 4.5);
  assert.equal(model.acties.length, 2);
  assert.equal(model.inspecties.length, 1);
  assert.equal(model.meldingen.length, 1);

  for (const uitvoer of [
    rapportageScherm,
    pdfRoute,
    excelExport,
  ]) {
    assert.match(
      uitvoer,
      /bouwZakelijkeRapportageModel/,
    );
  }
});

test("zakelijke externe rapportage toont geen bewonersnamen", () => {
  assert.doesNotMatch(
    rapportageScherm,
    /bewoner_naam|voornaam|achternaam/,
  );

  assert.doesNotMatch(
    pdfRoute,
    /bewoner_naam|voornaam|achternaam/,
  );

  const privacyModel =
    bouwZakelijkeRapportageModel({
      gegenereerd_op:
        "2026-07-26T15:00:00.000Z",
      samenvatting: {
        bewoners_aantal: 6,
      },
    });

  assert.equal(
    privacyModel.samenvatting.bewoners_aantal,
    6,
  );

  assert.match(
    pdfRoute,
    /Vertrouwelijk/,
  );
});

test("exportketen behoudt registratie en foutafhandeling", () => {
  assert.match(
    pdfRoute,
    /\.from\("rapportexports"\)/,
  );

  assert.match(
    pdfRoute,
    /status: "gereed"/,
  );

  assert.match(
    pdfRoute,
    /status: "mislukt"/,
  );

  assert.match(
    excelExport,
    /startRapportexport/,
  );

  assert.match(
    excelExport,
    /voltooiRapportexport/,
  );

  assert.match(
    excelExport,
    /markeerRapportexportMislukt/,
  );
});

test("zakelijke exports vertalen interne codes", () => {
  const zakelijkeRapportage = lees(
    "src/lib/rapportages/zakelijke-rapportage.ts",
  );

  assert.match(
    zakelijkeRapportage,
    /onvoldoende_data: "Onvoldoende gegevens"/,
  );

  assert.match(
    zakelijkeRapportage,
    /cfme: "CFME"/,
  );

  assert.match(
    rapportageScherm,
    /zakelijkLabel/,
  );

  assert.match(
    pdfRoute,
    /zakelijkLabel/,
  );

  assert.match(
    excelExport,
    /zakelijkVeldlabel/,
  );
});

test("rapportage bewerken toont de gekoppelde templateversie", () => {
  const bewerkpagina = lees(
    "src/app/woningen/[id]/rapportages/[rapportageId]/bewerken/page.tsx",
  );

  assert.match(
    bewerkpagina,
    /getActieveRapporttemplates/,
  );

  assert.match(
    bewerkpagina,
    /actieveTemplates=\{/,
  );
});
