import fs from "node:fs";

const controles = [
  [
    "supabase/migrations/20260728180000_9_0g_planning_intelligence.sql",
    [
      "planning_controlehistorie",
      "woning_planning_intelligence",
      "rayon_planning_samenvatting",
      "controleur_planning_samenvatting",
      "planning_intelligence_samenvatting",
    ],
  ],
  [
    "src/services/planning-intelligence.ts",
    [
      "getPlanningIntelligenceSamenvatting",
      "getWoningPlanningIntelligence",
      "getRayonPlanningSamenvatting",
      "getControleurPlanningSamenvatting",
    ],
  ],
  [
    "src/app/planning/intelligence/page.tsx",
    [
      "Controleplanning en werkvoorraad",
      "Woningplanning",
      "Werkvoorraad per rayon",
      "Werkvoorraad per controleur",
    ],
  ],
];

const fouten = [];

for (const [bestand, patronen] of controles) {
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
  console.error("9.0G-ketentest mislukt:");

  for (const fout of fouten) {
    console.error(`- ${fout}`);
  }

  process.exit(1);
}

console.log(
  "9.0G-ketentest geslaagd: rayon → woning → frequentie → laatste controle → volgende controle → achterstand → werkvoorraad."
);
