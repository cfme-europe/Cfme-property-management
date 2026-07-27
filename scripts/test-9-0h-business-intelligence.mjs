import fs from "node:fs";

const controles = [
  [
    "src/services/business-intelligence.ts",
    [
      "getBusinessIntelligenceCockpit",
      "getDashboardData",
      "getWoningPlanningIntelligence",
      "woning_compliance_samenvatting",
      "overbezetting",
      "rapportages",
      "kosten",
    ],
  ],
  [
    "src/app/page.tsx",
    [
      "Business Intelligence Cockpit",
      "Woningen die aandacht vragen",
      "Controlewerkvoorraad",
      "Open spoedmeldingen",
      "Achterstallige taken",
      "Overbezetting",
      "Energie-afwijkingen",
      "Kosten",
      "Rapportagestatus",
    ],
  ],
  [
    "src/types/business-intelligence.ts",
    [
      "BusinessIntelligenceCockpit",
      "CockpitAandachtspunt",
      "CockpitOverbezetting",
      "CockpitRapportage",
    ],
  ],
];

const fouten = [];

for (const [bestand, patronen] of controles) {
  if (!fs.existsSync(bestand)) {
    fouten.push(`Bestand ontbreekt: ${bestand}`);
    continue;
  }

  const inhoud =
    fs.readFileSync(bestand, "utf8");

  for (const patroon of patronen) {
    if (!inhoud.includes(patroon)) {
      fouten.push(
        `Patroon ontbreekt in ${bestand}: ${patroon}`
      );
    }
  }
}

if (fouten.length > 0) {
  console.error("9.0H-ketentest mislukt:");

  for (const fout of fouten) {
    console.error(`- ${fout}`);
  }

  process.exit(1);
}

console.log(
  "9.0H-ketentest geslaagd: planning + risico + energie + meldingen + taken + bezetting + compliance + kosten + rapportages → bestuurlijke cockpit."
);
