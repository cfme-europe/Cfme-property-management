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

test("bevoegde gebruikers kunnen verhuurperiodes veilig beheren", () => {
  const migratie = lees(
    "supabase/migrations/20260727103000_8_1j_verhuurperiodes_rls.sql",
  );

  assert.match(
    migratie,
    /Verhuurperiodes authenticated lezen/,
  );

  assert.match(
    migratie,
    /Verhuurperiodes bevoegd toevoegen/,
  );

  assert.match(
    migratie,
    /Verhuurperiodes bevoegd wijzigen/,
  );

  assert.match(
    migratie,
    /mag_administratie_beheren\(\)/,
  );

  assert.match(
    migratie,
    /revoke delete[\s\S]*from authenticated/i,
  );

  assert.doesNotMatch(
    migratie,
    /create policy[\s\S]*to anon/i,
  );
});

test("woningconfiguratie gebruikt een begeleide routewizard met buitenruimten", () => {
  const wizard = lees(
    "src/components/woningconfiguratie/WoningrouteWizard.tsx",
  );
  const pagina = lees(
    "src/app/woningen/[id]/configuratie/page.tsx",
  );

  assert.match(wizard, /Aanwezige ruimten/);
  assert.match(wizard, /Looproute/);
  assert.match(wizard, /Noodzakelijke details/);
  assert.match(wizard, /Achtertuin/);
  assert.match(wizard, /Buitenberging/);
  assert.match(wizard, /Containerplaats/);
  assert.match(wizard, /verplaatsRuimte/);
  assert.match(wizard, /Wijzigingen opslaan/);
  assert.match(pagina, /WoningrouteWizard/);
  assert.doesNotMatch(
    pagina,
    /Geavanceerd technisch beheer/,
  );
  assert.match(
    wizard,
    /Inhoud van deze ruimte/,
  );
  assert.match(
    wizard,
    /Aanbevolen voor deze ruimte/,
  );
  assert.match(
    wizard,
    /Zoek of typ een object/,
  );
  assert.match(wizard, /Bewoners/);
  assert.match(wizard, /bewonersPerKamer/);
  assert.match(wizard, /Wijzigingen opslaan/);
});

test("woningroute ondersteunt meters en internetvoorzieningen op hun exacte locatie", () => {
  const wizard = lees(
    "src/components/woningconfiguratie/WoningrouteWizard.tsx",
  );

  assert.match(wizard, /Elektriciteitsmeter dag/);
  assert.match(wizard, /Elektriciteitsmeter nacht/);
  assert.match(wizard, /Gasmeter/);
  assert.match(wizard, /Watermeter/);
  assert.ok(wizard.includes("Router / modem"));
  assert.match(wizard, /Wifi-punt/);
  assert.match(wizard, /Netwerkswitch/);
  assert.ok(wizard.includes("Glasvezelkastje / ONT"));
});

test("controleur neemt meters en internet met minimale handelingen op", () => {
  const flow = lees(
    "src/components/controleur/ControleurFlow.tsx",
  );
  const meterService = lees(
    "src/services/meterstanden.ts",
  );
  const migratie = lees(
    "supabase/migrations/20260727143000_8_1k_route_meters_internet.sql",
  );

  assert.match(flow, /Alle meterstanden/);
  assert.match(flow, /Vorige stand/);
  assert.match(flow, /Meterstand opslaan en verder/);
  assert.match(flow, /tekst: "Werkt"/);
  assert.match(flow, /tekst: "Storing"/);
  assert.match(flow, /tekst: "Niet aanwezig"/);
  assert.match(flow, /huidigeRuimteAfgerond/);
  assert.match(meterService, /slaRouteMeterstandOp/);
  assert.match(migratie, /mag_controles_uitvoeren/);
  assert.match(migratie, /METER_DAGSTROOM/);
  assert.match(migratie, /INTERNET_WERKING/);
});


test("9.0B woningroute gebruikt één transactionele invoernorm", () => {
  const wizard = lees(
    "src/components/woningconfiguratie/WoningrouteWizard.tsx",
  );
  const service = lees(
    "src/services/woningconfiguratie.ts",
  );
  const migratie = lees(
    "supabase/migrations/20260727190000_9_0b_reality_volledige_invoernorm.sql",
  );

  assert.match(wizard, /slaVolledigeWoningrouteOp/);
  assert.match(wizard, /capaciteit/);
  assert.doesNotMatch(wizard, /Math\.min\(20/);
  assert.match(service, /sla_woningroute_op/);
  assert.match(migratie, /create or replace function public\.sla_woningroute_op/);
  assert.match(migratie, /perform public\.controleer_reality_engine\(\)/);
  assert.match(migratie, /revoke all[\s\S]*from public, anon/i);
});

test("9.0B kamerbeheer maakt geen zelfstandige kamers meer", () => {
  const beheer = lees(
    "src/components/kamers/Kamerbeheer.tsx",
  );
  const service = lees(
    "src/services/kamers.ts",
  );

  assert.doesNotMatch(beheer, /Nieuwe kamer toevoegen/);
  assert.doesNotMatch(beheer, /Kamer toevoegen/);
  assert.doesNotMatch(beheer, /Verwijderen/);
  assert.doesNotMatch(service, /export async function createKamer/);
  assert.doesNotMatch(service, /export async function deleteKamer/);
  assert.match(beheer, /Bewonerskamers uit de fysieke woningroute/);
});

test("9.0B beschermt capaciteit en bestaande bewonershistorie", () => {
  const migratie = lees(
    "supabase/migrations/20260727190000_9_0b_reality_volledige_invoernorm.sql",
  );

  assert.match(migratie, /capaciteit[\s\S]*actuele bezetting/i);
  assert.match(migratie, /actieve bewoners aan gekoppeld/i);
  assert.match(migratie, /set actief = false/i);
  assert.doesNotMatch(migratie, /delete from public\.kamers/i);
});


test("9.0C normale ruimte wordt met één hoofdhandeling opgeslagen", () => {
  const flow = lees(
    "src/components/controleur/ControleurFlow.tsx",
  );
  const service = lees(
    "src/services/controleurflow.ts",
  );
  const migratie = lees(
    "supabase/migrations/20260727200000_9_0c_inspection_ruimteakkoord.sql",
  );

  assert.match(flow, /Alles in deze ruimte akkoord/);
  assert.match(flow, /slaHuidigeRuimteAkkoordOp/);
  assert.match(flow, /gaNaarVolgendeRuimte/);
  assert.match(flow, /Eindcontrole/);
  assert.match(flow, /Ontbrekende verplichte punten/);
  assert.match(flow, /Vastgelegde afwijkingen/);
  assert.match(service, /slaRuimteAkkoordOp/);
  assert.match(service, /sla_ruimte_akkoord_op/);
  assert.match(
    migratie,
    /create or replace function public\.sla_ruimte_akkoord_op/,
  );
  assert.match(
    migratie,
    /on conflict[\s\S]*controlesessie_id[\s\S]*woning_controlepunt_id/i,
  );
});

test("9.0C ruimteakkoord overschrijft geen gekozen afwijkingen of meters", () => {
  const flow = lees(
    "src/components/controleur/ControleurFlow.tsx",
  );
  const migratie = lees(
    "supabase/migrations/20260727200000_9_0c_inspection_ruimteakkoord.sql",
  );

  assert.match(
    flow,
    /huidigeNormalePunten[\s\S]*!isMeterpunt/,
  );
  assert.match(
    flow,
    /afwijkingGekozen[\s\S]*!afwijkingGekozen/,
  );
  assert.match(
    migratie,
    /status = 'niet_relevant'/,
  );
  assert.match(
    migratie,
    /mag_controles_uitvoeren\(\)/,
  );
  assert.doesNotMatch(
    migratie,
    /to anon/i,
  );
});


test("9.0D bewonersplaatsing toont alleen beschikbare kamers", () => {
  const formulier = lees(
    "src/components/bewoners/BewonerForm.tsx",
  );
  const verhuisflow = lees(
    "src/components/bewoners/BewonerVerhuizenButton.tsx",
  );
  const kamersServer = lees(
    "src/services/kamers-server.ts",
  );
  const migratie = lees(
    "supabase/migrations/20260727220000_9_0d_occupancy_intelligence.sql",
  );

  assert.match(formulier, /actuele_bezetting/);
  assert.match(formulier, /vrije_plaatsen/);
  assert.match(formulier, /kamer\.beschikbaar/);
  assert.match(verhuisflow, /kamer\.beschikbaar/);
  assert.match(verhuisflow, /actuele_bezetting/);
  assert.match(kamersServer, /getKamerbeschikbaarheid/);
  assert.match(kamersServer, /geef_kamerbeschikbaarheid/);
  assert.match(
    migratie,
    /create or replace function public\.geef_kamerbeschikbaarheid/,
  );
});

test("9.0D kamerwissel is transactioneel en bewaart historie", () => {
  const bewonersService = lees(
    "src/services/bewoners.ts",
  );
  const migratie = lees(
    "supabase/migrations/20260727220000_9_0d_occupancy_intelligence.sql",
  );
  const historieMigratie = lees(
    "supabase/migrations/20260715094000_0_4d_kamerhistorie.sql",
  );

  assert.match(bewonersService, /verhuis_bewoner_atomair/);
  assert.match(
    migratie,
    /create or replace function public\.verhuis_bewoner_atomair/,
  );
  assert.match(migratie, /for update/);
  assert.match(migratie, /vrije plaats/i);
  assert.match(migratie, /mag_bewoners_beheren\(\)/);
  assert.match(
    historieMigratie,
    /bewoners_kamerverhuizing_registreren/,
  );
  assert.doesNotMatch(
    migratie,
    /delete from public\.bewoner_kamerhistorie/i,
  );
});

test("9.0E onderhoudsopvolging is één transactionele keten", () => {
  const migration = lees(
    "supabase/migrations/20260727230000_9_0e_maintenance_intelligence.sql",
  );
  const service = lees(
    "src/services/controleafwijkingen.ts",
  );

  assert.match(
    migration,
    /create or replace function public\.beheer_controle_afwijking\(/,
  );
  assert.match(
    migration,
    /for update/,
  );
  assert.match(
    migration,
    /verplicht herstelbewijs moet zijn goedgekeurd/i,
  );
  assert.match(
    service,
    /\.rpc\(\s*"beheer_controle_afwijking"/,
  );
});

test("9.0E toont doorlooptijd, herhaling en herstelbewijs", () => {
  const server = lees(
    "src/services/controleafwijkingen-server.ts",
  );
  const component = lees(
    "src/components/afwijkingen/ControleAfwijkingenBeheer.tsx",
  );

  assert.match(server, /doorlooptijd_dagen/);
  assert.match(server, /terugkeer_aantal/);
  assert.match(server, /herstelbewijs_aantal/);
  assert.match(component, /Doorlooptijd/);
  assert.match(component, /Herhaling/);
  assert.match(component, /Herstelbewijs/);
  assert.match(
    component,
    /controleAfwijkingId=\{/,
  );

  const uploadComponent = lees(
    "src/components/inspecties/InspectieFotoUpload.tsx",
  );

  assert.match(
    uploadComponent,
    /controleAfwijkingId\?: number \| null/,
  );
  assert.match(
    uploadComponent,
    /controle_afwijking_id:\s*controleAfwijkingId/,
  );
});

test("9.0G verlopen controles sturen waarschuwingen zonder toegangsblokkade", () => {
  const migration = lees(
    "supabase/migrations/20260728080000_9_0g_controletermijn_emailwaarschuwingen.sql",
  );
  const service = lees(
    "src/services/controletermijn-email.ts",
  );
  const route = lees(
    "src/app/api/cron/controletermijnen/route.ts",
  );
  const navigatie = lees(
    "src/lib/auth/navigatie.ts",
  );

  assert.match(
    migration,
    /geef_verlopen_controletermijnen/,
  );
  assert.match(
    migration,
    /controletermijn_email_log_uniek/,
  );
  assert.match(
    service,
    /\.in\("rol", \["admin", "management"\]\)/,
  );
  assert.match(
    service,
    /controleur_email/,
  );
  assert.match(
    service,
    /RESEND_API_KEY/,
  );
  assert.match(
    route,
    /Bearer \$\{geheim\}/,
  );
  assert.match(
    navigatie,
    /\/api\/cron\/controletermijnen/,
  );
  assert.doesNotMatch(
    migration,
    /blokkeer|toegang.*weigeren|actief\s*=\s*false/i,
  );
});
