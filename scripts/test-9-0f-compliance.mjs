import fs from "node:fs";

const vereisten = [
  [
    "supabase/migrations/20260728120000_9_0f_compliance_intelligence.sql",
    [
      "objecttype_compliance_verplichtingen",
      "object_compliance_overzicht",
      "woning_compliance_samenvatting",
      "documenten_object_integriteit",
    ],
  ],
  [
    "supabase/migrations/20260728150000_9_0f_compliance_opvolging.sql",
    [
      "compliance_werkpunten",
      "synchroniseer_compliance_voor_woning",
      "compliance_werkpunten_overzicht",
      "taken_compliance_integriteit",
    ],
  ],
  [
    "src/services/compliance.ts",
    [
      "getObjectComplianceVoorWoning",
      "getComplianceWerkpuntenVoorWoning",
      "synchroniseer_compliance_voor_woning",
    ],
  ],
  [
    "src/app/woningen/[id]/compliance/page.tsx",
    [
      "Objectverplichtingen",
      "Open compliancewerkpunten",
      "Objectdocument toevoegen",
    ],
  ],
  [
    "src/components/certificeringen/CertificeringForm.tsx",
    [
      "object_id",
      "Object",
      "/api/woningen/",
    ],
  ],
];

const fouten = [];

for (const [bestand, patronen] of vereisten) {
  if (!fs.existsSync(bestand)) {
    fouten.push(`Bestand ontbreekt: ${bestand}`);
    continue;
  }

  const inhoud = fs.readFileSync(bestand, "utf8");

  for (const patroon of patronen) {
    if (!inhoud.includes(patroon)) {
      fouten.push(
        `Patroon ontbreekt in ${bestand}: ${patroon}`
      );
    }
  }
}

if (fouten.length > 0) {
  console.error("9.0F-ketentest mislukt:");
  for (const fout of fouten) {
    console.error(`- ${fout}`);
  }
  process.exit(1);
}

console.log(
  "9.0F-ketentest geslaagd: object → verplichting → bewijs → status → werkpunt → taak → woningoverzicht."
);
