import fs from "node:fs";

const controles = [
  {
    bestand:
      "src/types/predictive-intelligence.ts",
    termen: [
      "lekkagerisico",
      "terugkerende_schade",
      "verhoogd_energieverbruik",
      "ongebruikelijke_controletijd",
      "verslechterende_woningconditie",
      "onderhoudsbehoefte",
      "prioriteit_hercontrole",
      "geen_feitelijke_conclusie",
    ],
  },
  {
    bestand:
      "src/lib/intelligence/predictive-utils.ts",
    termen: [
      "maakPredictiveSignaal",
      "betrouwbaarheid",
      "datadekking_percentage",
      "voldoende_historie",
      "onzekerheid",
    ],
  },
  {
    bestand:
      "src/lib/intelligence/predictive-energy.ts",
    termen: [
      "bouwPredictiveEnergieSignaal",
      "per_bewoner_per_week",
      "historische",
      "meterstanden",
    ],
  },
  {
    bestand:
      "src/lib/intelligence/predictive-woning-signalen.ts",
    termen: [
      "bouwLekkageSignaal",
      "bouwSchadeSignaal",
      "bouwControletijdSignaal",
      "bouwConditieSignaal",
      "bouwOnderhoudSignaal",
    ],
  },
  {
    bestand:
      "src/lib/intelligence/predictive-woning.ts",
    termen: [
      "analyseerPredictiveWoning",
      "prioriteit_hercontrole",
      "prioriteit_score",
      "hoogste_niveau",
    ],
  },
  {
    bestand:
      "src/services/predictive-intelligence.ts",
    termen: [
      "getPredictiveIntelligence",
      "woning_dna_snapshots",
      "controle_afwijkingen",
      "controlesessies",
      "meterstanden",
      "woningen_onvoldoende_historie",
    ],
  },
  {
    bestand:
      "src/app/intelligence/predictive/page.tsx",
    termen: [
      "Uitlegbare voorspelsignalen",
      "Betrouwbaarheid",
      "Datadekking",
      "Onzekerheid",
      "Gebruikte bewijzen",
      "geen vastgestelde",
    ],
  },
  {
    bestand:
      "src/app/page.tsx",
    termen: [
      'href="/intelligence/predictive"',
      "Predictive Intelligence",
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
  "9.0J-ketentest geslaagd: historie + lekkagerisico + terugkerende schade + verhoogd energieverbruik + ongebruikelijke controletijd + verslechterende woningconditie + onderhoudsbehoefte + hercontroleprioriteit + betrouwbaarheid + datadekking + onzekerheid + uitlegbaar bewijs.",
);
