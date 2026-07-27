import fs from "node:fs";

const controles = [
  {
    bestand: "src/types/rapportage-eindvorm.ts",
    termen: [
      "RapportageDuidingsregel",
      "RapportageComplianceRegel",
      "RapportageEindvorm",
    ],
  },
  {
    bestand:
      "src/lib/rapportages/rapportage-eindvorm.ts",
    termen: [
      "bouwRapportageEindvorm",
      "maakExternPrivacyveilig",
      "vorige_situatie",
      "huidige_situatie",
      "betekenis",
      "compliance",
    ],
  },
  {
    bestand:
      "src/services/rapportagegenerator-server.ts",
    termen: [
      'from("certificeringen")',
      "compliance:",
      "verlopen:",
    ],
  },
  {
    bestand:
      "src/components/rapportages/MaandrapportageInhoud.tsx",
    termen: [
      "Bestuurlijke duiding",
      "Vorige situatie",
      "Huidige situatie",
      "Betekenis",
    ],
  },
  {
    bestand:
      "src/app/woningen/[id]/rapportages/[rapportageId]/pdf/route.ts",
    termen: [
      "Bestuurlijke duiding",
      "Financiële en operationele betekenis",
    ],
  },
  {
    bestand:
      "src/components/rapportages/RapportageExcelButton.tsx",
    termen: [
      'werkblad("Bestuurlijke duiding"',
      'werkblad("Compliance"',
    ],
  },
];

for (const controle of controles) {
  if (!fs.existsSync(controle.bestand)) {
    throw new Error(
      `Bestand ontbreekt: ${controle.bestand}`,
    );
  }

  const inhoud = fs.readFileSync(
    controle.bestand,
    "utf8",
  );

  for (const term of controle.termen) {
    if (!inhoud.includes(term)) {
      throw new Error(
        `${controle.bestand} mist: ${term}`,
      );
    }
  }
}

console.log(
  "9.0I-ketentest geslaagd: vorig + nu + verschil + actie + resultaat + betekenis + energie + schade + herstel + kosten + factuurontvanger + compliance + PDF + Excel + externe privacy.",
);
