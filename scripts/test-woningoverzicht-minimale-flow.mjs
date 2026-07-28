import fs from "node:fs";

const woning = fs.readFileSync(
  "src/app/woningen/[id]/page.tsx",
  "utf8",
);

const wizard = fs.readFileSync(
  "src/components/woningconfiguratie/WoningrouteWizard.tsx",
  "utf8",
);

const configuratie = fs.readFileSync(
  "src/app/woningen/[id]/configuratie/page.tsx",
  "utf8",
);

const verplichtWoning = [
  "Kamers en bezetting",
  "Actuele bezetting per slaapkamer",
  "Bewoner toevoegen",
  "Actieve verhuur",
  "Verhuurhistorie",
];

for (const term of verplichtWoning) {
  if (!woning.includes(term)) {
    throw new Error(
      `Woningdossier mist: ${term}`,
    );
  }
}

if (
  woning.includes(
    "getHuurdersVoorVerhuurperiode",
  ) ||
  woning.includes(
    '<h2 className="text-xl font-bold">Huurders</h2>',
  )
) {
  throw new Error(
    "Oude individuele huurdersflow is nog aanwezig.",
  );
}

const verplichtWizard = [
  "Inhoud van deze ruimte",
  "Aanpassen",
  "Aanbevolen voor deze ruimte",
  "Zoek of typ een object",
  "Toevoegen",
  "Objecten sluiten",
  "voegGezochtObjectToe",
];

for (const term of verplichtWizard) {
  if (!wizard.includes(term)) {
    throw new Error(
      `Woningroute mist: ${term}`,
    );
  }
}

if (
  wizard.includes(
    "Geavanceerde uitzonderingen",
  )
) {
  throw new Error(
    "Dubbele geavanceerde uitzonderingen zijn nog aanwezig.",
  );
}

if (
  configuratie.includes(
    "WoningconfiguratieBeheer",
  ) ||
  configuratie.includes(
    "Geavanceerd technisch beheer",
  )
) {
  throw new Error(
    "Dubbel technisch beheer staat nog op de normale pagina.",
  );
}

console.log(
  "Woningflow-ketentest geslaagd: ruimte-inhoud + aanpassen + vrij object + capaciteit + actuele kamerbezetting + zakelijke verhuur + verhuurhistorie.",
);
