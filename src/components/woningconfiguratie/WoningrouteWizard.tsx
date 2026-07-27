"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { slaVolledigeWoningrouteOp } from "@/services/woningconfiguratie";
import type {
  RuimteType,
  WoningConfiguratie,
  WoningrouteOpslagInvoer,
} from "@/types/woningconfiguratie";

type Props = {
  woningId: number;
  configuratie: WoningConfiguratie;
};

type WizardStap = "ruimten" | "route" | "details" | "voorbeeld";

type VerdiepingKeuze = {
  sleutel: string;
  id: number | null;
  naam: string;
  niveau: number;
};

type ObjectSjabloon = {
  code: string;
  naam: string;
  objectType: string;
};

type RuimteSjabloon = {
  code: string;
  naam: string;
  categorie: string;
  ruimteType: RuimteType;
  buiten: boolean;
  meervoud: boolean;
  standaardNiveau: number | null;
  controles: string[];
  objecten: string[];
};

type GekozenObject = {
  sleutel: string;
  id: number | null;
  code: string;
  naam: string;
  objectType: string;
};

type GekozenRuimte = {
  sleutel: string;
  id: number | null;
  sjabloonCode: string;
  naam: string;
  ruimteType: RuimteType;
  buiten: boolean;
  verdiepingSleutel: string | null;
  capaciteit: number | null;
  routeInstructie: string;
  controles: string[];
  objecten: GekozenObject[];
};

const ALGEMENE_CONTROLES = [
  "ALG_NETHEID",
  "ALG_SCHADE",
  "ALG_VEILIGHEID",
];

const OBJECTEN: Record<string, ObjectSjabloon> = {
  rookmelder: {
    code: "rookmelder",
    naam: "Rookmelder",
    objectType: "rookmelder",
  },
  brandblusser: {
    code: "brandblusser",
    naam: "Brandblusser",
    objectType: "brandblusser",
  },
  cv_ketel: {
    code: "cv_ketel",
    naam: "CV-ketel",
    objectType: "cv_ketel",
  },
  koelkast: {
    code: "koelkast",
    naam: "Koelkast",
    objectType: "koelkast",
  },
  kookplaat: {
    code: "kookplaat",
    naam: "Kookplaat",
    objectType: "kookplaat",
  },
  afzuigkap: {
    code: "afzuigkap",
    naam: "Afzuigkap",
    objectType: "afzuigkap",
  },
  wasmachine: {
    code: "wasmachine",
    naam: "Wasmachine",
    objectType: "wasmachine",
  },
  droger: {
    code: "droger",
    naam: "Droger",
    objectType: "droger",
  },
  afvalcontainer: {
    code: "afvalcontainer",
    naam: "Afvalcontainer",
    objectType: "afvalcontainer",
  },
  buitenverlichting: {
    code: "buitenverlichting",
    naam: "Buitenverlichting",
    objectType: "buitenverlichting",
  },
  elektriciteitsmeter_dag: {
    code: "elektriciteitsmeter_dag",
    naam: "Elektriciteitsmeter dag",
    objectType: "elektriciteitsmeter_dag",
  },
  elektriciteitsmeter_nacht: {
    code: "elektriciteitsmeter_nacht",
    naam: "Elektriciteitsmeter nacht",
    objectType: "elektriciteitsmeter_nacht",
  },
  gasmeter: {
    code: "gasmeter",
    naam: "Gasmeter",
    objectType: "gasmeter",
  },
  watermeter: {
    code: "watermeter",
    naam: "Watermeter",
    objectType: "watermeter",
  },
  router: {
    code: "router",
    naam: "Router / modem",
    objectType: "internetvoorziening",
  },
  wifi_punt: {
    code: "wifi_punt",
    naam: "Wifi-punt",
    objectType: "internetvoorziening",
  },
  netwerkswitch: {
    code: "netwerkswitch",
    naam: "Netwerkswitch",
    objectType: "internetvoorziening",
  },
  glasvezelkastje: {
    code: "glasvezelkastje",
    naam: "Glasvezelkastje / ONT",
    objectType: "internetvoorziening",
  },
  internetbekabeling: {
    code: "internetbekabeling",
    naam: "Internetbekabeling",
    objectType: "internetvoorziening",
  },
  overige_internetvoorziening: {
    code: "overige_internetvoorziening",
    naam: "Overige internetvoorziening",
    objectType: "internetvoorziening",
  },
};

const RUIMTE_SJABLONEN: RuimteSjabloon[] = [
  {
    code: "voordeur_gevel",
    naam: "Voordeur en voorgevel",
    categorie: "Buiten – toegang en gevel",
    ruimteType: "buitenruimte",
    buiten: true,
    meervoud: false,
    standaardNiveau: null,
    controles: ["ALG_SCHADE", "ALG_VEILIGHEID"],
    objecten: ["buitenverlichting"],
  },
  {
    code: "entree",
    naam: "Entree",
    categorie: "Binnen – toegang en verkeer",
    ruimteType: "toegangsdeur",
    buiten: false,
    meervoud: false,
    standaardNiveau: 0,
    controles: ALGEMENE_CONTROLES,
    objecten: ["rookmelder"],
  },
  {
    code: "hal",
    naam: "Hal",
    categorie: "Binnen – toegang en verkeer",
    ruimteType: "hal",
    buiten: false,
    meervoud: false,
    standaardNiveau: 0,
    controles: ALGEMENE_CONTROLES,
    objecten: ["rookmelder"],
  },
  {
    code: "gang",
    naam: "Gang",
    categorie: "Binnen – toegang en verkeer",
    ruimteType: "gang",
    buiten: false,
    meervoud: true,
    standaardNiveau: 0,
    controles: ALGEMENE_CONTROLES,
    objecten: ["rookmelder"],
  },
  {
    code: "trap",
    naam: "Trap",
    categorie: "Binnen – toegang en verkeer",
    ruimteType: "trap",
    buiten: false,
    meervoud: true,
    standaardNiveau: 0,
    controles: ALGEMENE_CONTROLES,
    objecten: [],
  },
  {
    code: "overloop",
    naam: "Overloop",
    categorie: "Binnen – toegang en verkeer",
    ruimteType: "overloop",
    buiten: false,
    meervoud: true,
    standaardNiveau: 1,
    controles: ALGEMENE_CONTROLES,
    objecten: ["rookmelder"],
  },
  {
    code: "woonkamer",
    naam: "Woonkamer",
    categorie: "Binnen – verblijfsruimten",
    ruimteType: "woonkamer",
    buiten: false,
    meervoud: true,
    standaardNiveau: 0,
    controles: ALGEMENE_CONTROLES,
    objecten: ["rookmelder"],
  },
  {
    code: "keuken",
    naam: "Keuken",
    categorie: "Binnen – verblijfsruimten",
    ruimteType: "keuken",
    buiten: false,
    meervoud: true,
    standaardNiveau: 0,
    controles: [...ALGEMENE_CONTROLES, "KEUKEN_HYGIENE"],
    objecten: ["rookmelder", "koelkast", "kookplaat", "afzuigkap"],
  },
  {
    code: "slaapkamer",
    naam: "Slaapkamer",
    categorie: "Binnen – slaapruimten",
    ruimteType: "slaapkamer",
    buiten: false,
    meervoud: true,
    standaardNiveau: 1,
    controles: ALGEMENE_CONTROLES,
    objecten: ["rookmelder"],
  },
  {
    code: "badkamer",
    naam: "Badkamer",
    categorie: "Binnen – sanitair",
    ruimteType: "badkamer",
    buiten: false,
    meervoud: true,
    standaardNiveau: 1,
    controles: [
      "ALG_NETHEID",
      "ALG_SCHADE",
      "BADKAMER_HYGIENE",
      "BADKAMER_SCHIMMEL",
    ],
    objecten: [],
  },
  {
    code: "toilet",
    naam: "Toilet",
    categorie: "Binnen – sanitair",
    ruimteType: "toilet",
    buiten: false,
    meervoud: true,
    standaardNiveau: 0,
    controles: ["ALG_NETHEID", "ALG_SCHADE"],
    objecten: [],
  },
  {
    code: "berging",
    naam: "Berging",
    categorie: "Binnen – opslag en techniek",
    ruimteType: "berging",
    buiten: false,
    meervoud: true,
    standaardNiveau: 0,
    controles: ALGEMENE_CONTROLES,
    objecten: [],
  },
  {
    code: "technische_ruimte",
    naam: "Technische ruimte",
    categorie: "Binnen – opslag en techniek",
    ruimteType: "technische_ruimte",
    buiten: false,
    meervoud: true,
    standaardNiveau: 0,
    controles: ALGEMENE_CONTROLES,
    objecten: ["cv_ketel"],
  },
  {
    code: "wasruimte",
    naam: "Wasruimte",
    categorie: "Binnen – opslag en techniek",
    ruimteType: "berging",
    buiten: false,
    meervoud: true,
    standaardNiveau: 0,
    controles: ALGEMENE_CONTROLES,
    objecten: ["wasmachine", "droger"],
  },
  {
    code: "kelderruimte",
    naam: "Kelderruimte",
    categorie: "Binnen – opslag en techniek",
    ruimteType: "kelder",
    buiten: false,
    meervoud: true,
    standaardNiveau: -1,
    controles: ALGEMENE_CONTROLES,
    objecten: [],
  },
  {
    code: "zolderruimte",
    naam: "Zolderruimte",
    categorie: "Binnen – opslag en techniek",
    ruimteType: "zolder",
    buiten: false,
    meervoud: true,
    standaardNiveau: 2,
    controles: ALGEMENE_CONTROLES,
    objecten: ["rookmelder"],
  },
  {
    code: "voortuin",
    naam: "Voortuin",
    categorie: "Buiten – tuin en terrein",
    ruimteType: "buitenruimte",
    buiten: true,
    meervoud: false,
    standaardNiveau: null,
    controles: ALGEMENE_CONTROLES,
    objecten: [],
  },
  {
    code: "achtertuin",
    naam: "Achtertuin",
    categorie: "Buiten – tuin en terrein",
    ruimteType: "buitenruimte",
    buiten: true,
    meervoud: false,
    standaardNiveau: null,
    controles: ALGEMENE_CONTROLES,
    objecten: ["buitenverlichting"],
  },
  {
    code: "zijtuin",
    naam: "Zijtuin",
    categorie: "Buiten – tuin en terrein",
    ruimteType: "buitenruimte",
    buiten: true,
    meervoud: true,
    standaardNiveau: null,
    controles: ALGEMENE_CONTROLES,
    objecten: [],
  },
  {
    code: "oprit",
    naam: "Oprit",
    categorie: "Buiten – tuin en terrein",
    ruimteType: "buitenruimte",
    buiten: true,
    meervoud: false,
    standaardNiveau: null,
    controles: ALGEMENE_CONTROLES,
    objecten: [],
  },
  {
    code: "parkeerplaats",
    naam: "Parkeerplaats",
    categorie: "Buiten – tuin en terrein",
    ruimteType: "buitenruimte",
    buiten: true,
    meervoud: true,
    standaardNiveau: null,
    controles: ALGEMENE_CONTROLES,
    objecten: [],
  },
  {
    code: "terras",
    naam: "Terras",
    categorie: "Buiten – tuin en terrein",
    ruimteType: "buitenruimte",
    buiten: true,
    meervoud: true,
    standaardNiveau: null,
    controles: ALGEMENE_CONTROLES,
    objecten: ["buitenverlichting"],
  },
  {
    code: "balkon",
    naam: "Balkon",
    categorie: "Buiten – tuin en terrein",
    ruimteType: "buitenruimte",
    buiten: true,
    meervoud: true,
    standaardNiveau: 1,
    controles: ALGEMENE_CONTROLES,
    objecten: [],
  },
  {
    code: "buitenberging",
    naam: "Buitenberging",
    categorie: "Buiten – opslag en voorzieningen",
    ruimteType: "buitenruimte",
    buiten: true,
    meervoud: true,
    standaardNiveau: null,
    controles: ALGEMENE_CONTROLES,
    objecten: [],
  },
  {
    code: "garage",
    naam: "Garage",
    categorie: "Buiten – opslag en voorzieningen",
    ruimteType: "buitenruimte",
    buiten: true,
    meervoud: true,
    standaardNiveau: null,
    controles: ALGEMENE_CONTROLES,
    objecten: ["rookmelder", "brandblusser"],
  },
  {
    code: "fietsenstalling",
    naam: "Fietsenstalling",
    categorie: "Buiten – opslag en voorzieningen",
    ruimteType: "buitenruimte",
    buiten: true,
    meervoud: false,
    standaardNiveau: null,
    controles: ALGEMENE_CONTROLES,
    objecten: [],
  },
  {
    code: "containerplaats",
    naam: "Containerplaats",
    categorie: "Buiten – afval en voorzieningen",
    ruimteType: "buitenruimte",
    buiten: true,
    meervoud: false,
    standaardNiveau: null,
    controles: ["ALG_NETHEID", "ALG_VEILIGHEID"],
    objecten: ["afvalcontainer"],
  },
  {
    code: "erfafscheiding",
    naam: "Erfafscheiding",
    categorie: "Buiten – tuin en terrein",
    ruimteType: "buitenruimte",
    buiten: true,
    meervoud: false,
    standaardNiveau: null,
    controles: ["ALG_SCHADE", "ALG_VEILIGHEID"],
    objecten: [],
  },
];

const STAPPEN: Array<{
  sleutel: WizardStap;
  nummer: number;
  titel: string;
}> = [
  { sleutel: "ruimten", nummer: 1, titel: "Aanwezige ruimten" },
  { sleutel: "route", nummer: 2, titel: "Looproute" },
  { sleutel: "details", nummer: 3, titel: "Noodzakelijke details" },
  { sleutel: "voorbeeld", nummer: 4, titel: "Preview en activeren" },
];

function uniekeSleutel(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function standaardVerdiepingNaam(niveau: number): string {
  if (niveau === -1) return "Kelder";
  if (niveau === 0) return "Begane grond";
  if (niveau === 1) return "Eerste verdieping";
  if (niveau === 2) return "Tweede verdieping";
  if (niveau === 3) return "Derde verdieping";
  return niveau < 0
    ? `Onderste verdieping ${Math.abs(niveau)}`
    : `Verdieping ${niveau}`;
}

function maakObject(code: string): GekozenObject {
  const sjabloon = OBJECTEN[code];

  if (!sjabloon) {
    throw new Error(`Onbekend objectsjabloon: ${code}.`);
  }

  return {
    sleutel: uniekeSleutel(code),
    id: null,
    code: sjabloon.code,
    naam: sjabloon.naam,
    objectType: sjabloon.objectType,
  };
}

function maakVerdiepingen(
  configuratie: WoningConfiguratie,
): VerdiepingKeuze[] {
  if (configuratie.verdiepingen.length > 0) {
    return [...configuratie.verdiepingen]
      .sort((a, b) => a.niveau - b.niveau || a.id - b.id)
      .map((verdieping) => ({
        sleutel: `verdieping-${verdieping.id}`,
        id: verdieping.id,
        naam: verdieping.naam,
        niveau: verdieping.niveau,
      }));
  }

  return [
    {
      sleutel: uniekeSleutel("verdieping"),
      id: null,
      naam: "Begane grond",
      niveau: 0,
    },
    {
      sleutel: uniekeSleutel("verdieping"),
      id: null,
      naam: "Eerste verdieping",
      niveau: 1,
    },
  ];
}

function dichtstbijzijndeVerdieping(
  verdiepingen: VerdiepingKeuze[],
  niveau: number | null,
): string | null {
  if (niveau === null) return null;

  const exact = verdiepingen.find(
    (verdieping) => verdieping.niveau === niveau,
  );

  if (exact) return exact.sleutel;

  const nieuweVerdieping: VerdiepingKeuze = {
    sleutel: uniekeSleutel("verdieping"),
    id: null,
    naam: standaardVerdiepingNaam(niveau),
    niveau,
  };

  verdiepingen.push(nieuweVerdieping);
  return nieuweVerdieping.sleutel;
}

function maakRuimte(
  sjabloon: RuimteSjabloon,
  nummer: number,
  verdiepingen: VerdiepingKeuze[],
): GekozenRuimte {
  return {
    sleutel: uniekeSleutel(sjabloon.code),
    id: null,
    sjabloonCode: sjabloon.code,
    naam: sjabloon.meervoud
      ? `${sjabloon.naam} ${nummer}`
      : sjabloon.naam,
    ruimteType: sjabloon.ruimteType,
    buiten: sjabloon.buiten,
    verdiepingSleutel: dichtstbijzijndeVerdieping(
      verdiepingen,
      sjabloon.standaardNiveau,
    ),
    capaciteit: sjabloon.ruimteType === "slaapkamer" ? 1 : null,
    routeInstructie: "",
    controles: [...sjabloon.controles],
    objecten: sjabloon.objecten.map(maakObject),
  };
}

function bestaandeRuimten(
  configuratie: WoningConfiguratie,
): GekozenRuimte[] {
  const verdiepingPerId = new Map(
    configuratie.verdiepingen.map((verdieping) => [
      verdieping.id,
      `verdieping-${verdieping.id}`,
    ]),
  );

  const kamerPerId = new Map(
    configuratie.ruimten
      .filter((ruimte) => ruimte.kamer_id !== null)
      .map((ruimte) => [ruimte.kamer_id, ruimte]),
  );

  void kamerPerId;

  return configuratie.ruimten
    .filter((ruimte) => ruimte.actief)
    .sort((a, b) => a.loopvolgorde - b.loopvolgorde || a.id - b.id)
    .map((ruimte) => {
      const controles = configuratie.controlepunten
        .filter(
          (punt) =>
            punt.ruimte_id === ruimte.id &&
            punt.object_id === null &&
            punt.actief &&
            punt.definitie,
        )
        .map((punt) => punt.definitie?.code ?? "")
        .filter(Boolean);

      const objecten = configuratie.objecten
        .filter(
          (object) =>
            object.ruimte_id === ruimte.id && object.actief,
        )
        .sort((a, b) => a.loopvolgorde - b.loopvolgorde || a.id - b.id)
        .map((object) => ({
          sleutel: `bestaand-object-${object.id}`,
          id: object.id,
          code: object.object_type,
          naam: object.naam,
          objectType: object.object_type,
        }));

      return {
        sleutel: `bestaand-ruimte-${ruimte.id}`,
        id: ruimte.id,
        sjabloonCode:
          RUIMTE_SJABLONEN.find(
            (sjabloon) =>
              sjabloon.ruimteType === ruimte.ruimte_type &&
              sjabloon.naam === ruimte.naam.replace(/ \d+$/, ""),
          )?.code ?? ruimte.ruimte_type,
        naam: ruimte.naam,
        ruimteType: ruimte.ruimte_type,
        buiten: ruimte.ruimte_type === "buitenruimte",
        verdiepingSleutel: ruimte.verdieping_id
          ? verdiepingPerId.get(ruimte.verdieping_id) ?? null
          : null,
        capaciteit:
          ruimte.ruimte_type === "slaapkamer"
            ? 1
            : null,
        routeInstructie: ruimte.route_instructie ?? "",
        controles,
        objecten,
      };
    });
}

export default function WoningrouteWizard({
  woningId,
  configuratie,
}: Props) {
  const router = useRouter();

  const [stap, setStap] = useState<WizardStap>("ruimten");
  const [verdiepingen, setVerdiepingen] = useState<VerdiepingKeuze[]>(
    () => maakVerdiepingen(configuratie),
  );
  const [ruimten, setRuimten] = useState<GekozenRuimte[]>(() =>
    bestaandeRuimten(configuratie),
  );
  const [openRuimte, setOpenRuimte] = useState<string | null>(null);
  const [toonGeavanceerd, setToonGeavanceerd] = useState(false);
  const [vrijeNaam, setVrijeNaam] = useState("");
  const [vrijeBuitenruimte, setVrijeBuitenruimte] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [melding, setMelding] = useState("");

  const categorieen = useMemo(
    () =>
      Array.from(
        new Set(RUIMTE_SJABLONEN.map((sjabloon) => sjabloon.categorie)),
      ),
    [],
  );

  const stapIndex = STAPPEN.findIndex((item) => item.sleutel === stap);

  function aantalVoor(sjabloonCode: string): number {
    return ruimten.filter(
      (ruimte) => ruimte.sjabloonCode === sjabloonCode,
    ).length;
  }

  function wijzigAantal(
    sjabloon: RuimteSjabloon,
    gewenstAantal: number,
  ) {
    const gewenst = Math.max(0, gewenstAantal);

    setRuimten((huidig) => {
      const passend = huidig.filter(
        (ruimte) => ruimte.sjabloonCode === sjabloon.code,
      );

      if (passend.length === gewenst) return huidig;

      if (passend.length > gewenst) {
        let behouden = gewenst;

        return huidig.filter((ruimte) => {
          if (ruimte.sjabloonCode !== sjabloon.code) return true;
          if (behouden > 0) {
            behouden -= 1;
            return true;
          }
          return false;
        });
      }

      const verdiepingKopie = [...verdiepingen];
      const aanvulling = Array.from(
        { length: gewenst - passend.length },
        (_, index) =>
          maakRuimte(
            sjabloon,
            passend.length + index + 1,
            verdiepingKopie,
          ),
      );

      if (verdiepingKopie.length !== verdiepingen.length) {
        setVerdiepingen(verdiepingKopie);
      }

      return [...huidig, ...aanvulling];
    });
  }

  function voegVerdiepingToe() {
    const hoogsteNiveau = verdiepingen.reduce(
      (hoogste, verdieping) => Math.max(hoogste, verdieping.niveau),
      -1,
    );
    const niveau = hoogsteNiveau + 1;

    setVerdiepingen((huidig) => [
      ...huidig,
      {
        sleutel: uniekeSleutel("verdieping"),
        id: null,
        naam: standaardVerdiepingNaam(niveau),
        niveau,
      },
    ]);
  }

  function wijzigVerdieping(
    sleutel: string,
    wijziging: Partial<VerdiepingKeuze>,
  ) {
    setVerdiepingen((huidig) =>
      huidig.map((verdieping) =>
        verdieping.sleutel === sleutel
          ? { ...verdieping, ...wijziging }
          : verdieping,
      ),
    );
  }

  function voegVrijeRuimteToe() {
    const naam = vrijeNaam.trim();

    if (!naam) {
      setFout("Vul eerst een naam in.");
      return;
    }

    setRuimten((huidig) => [
      ...huidig,
      {
        sleutel: uniekeSleutel("vrij"),
        id: null,
        sjabloonCode: "vrij",
        naam,
        ruimteType: vrijeBuitenruimte ? "buitenruimte" : "overig",
        buiten: vrijeBuitenruimte,
        verdiepingSleutel: vrijeBuitenruimte
          ? null
          : verdiepingen.find((verdieping) => verdieping.niveau === 0)
              ?.sleutel ?? null,
        capaciteit: null,
        routeInstructie: "",
        controles: [...ALGEMENE_CONTROLES],
        objecten: [],
      },
    ]);

    setVrijeNaam("");
    setVrijeBuitenruimte(false);
    setFout("");
  }

  function wijzigRuimte(
    sleutel: string,
    wijziging: Partial<GekozenRuimte>,
  ) {
    setRuimten((huidig) =>
      huidig.map((ruimte) =>
        ruimte.sleutel === sleutel
          ? { ...ruimte, ...wijziging }
          : ruimte,
      ),
    );
  }

  function verplaatsRuimte(index: number, richting: -1 | 1) {
    const doel = index + richting;

    if (doel < 0 || doel >= ruimten.length) return;

    setRuimten((huidig) => {
      const nieuw = [...huidig];
      const [ruimte] = nieuw.splice(index, 1);
      nieuw.splice(doel, 0, ruimte);
      return nieuw;
    });
  }

  function wisselControle(sleutel: string, code: string) {
    const ruimte = ruimten.find((item) => item.sleutel === sleutel);
    if (!ruimte) return;

    wijzigRuimte(sleutel, {
      controles: ruimte.controles.includes(code)
        ? ruimte.controles.filter((item) => item !== code)
        : [...ruimte.controles, code],
    });
  }

  function wisselObject(sleutel: string, sjabloon: ObjectSjabloon) {
    const ruimte = ruimten.find((item) => item.sleutel === sleutel);
    if (!ruimte) return;

    const bestaand = ruimte.objecten.find(
      (object) => object.code === sjabloon.code,
    );

    wijzigRuimte(sleutel, {
      objecten: bestaand
        ? ruimte.objecten.filter(
            (object) => object.code !== sjabloon.code,
          )
        : [...ruimte.objecten, maakObject(sjabloon.code)],
    });
  }

  function valideerHuidigeConfiguratie(): boolean {
    if (ruimten.length === 0) {
      setFout("Kies minimaal één ruimte.");
      return false;
    }

    const legeRuimte = ruimten.find((ruimte) => !ruimte.naam.trim());
    if (legeRuimte) {
      setFout("Iedere ruimte moet een naam hebben.");
      return false;
    }

    const ongeldigeSlaapkamer = ruimten.find(
      (ruimte) =>
        ruimte.ruimteType === "slaapkamer" &&
        (!Number.isInteger(ruimte.capaciteit) ||
          (ruimte.capaciteit ?? 0) < 1),
    );

    if (ongeldigeSlaapkamer) {
      setFout(
        `Capaciteit van "${ongeldigeSlaapkamer.naam}" moet minimaal 1 zijn.`,
      );
      return false;
    }

    const dubbeleNaam = ruimten.find(
      (ruimte, index) =>
        ruimten.findIndex(
          (vergelijking) =>
            vergelijking.naam.trim().toLowerCase() ===
            ruimte.naam.trim().toLowerCase(),
        ) !== index,
    );

    if (dubbeleNaam) {
      setFout(`Ruimtenaam "${dubbeleNaam.naam}" komt meerdere keren voor.`);
      return false;
    }

    setFout("");
    return true;
  }

  function volgendeStap() {
    if (!valideerHuidigeConfiguratie()) return;

    setStap(
      STAPPEN[Math.min(stapIndex + 1, STAPPEN.length - 1)].sleutel,
    );
  }

  function vorigeStap() {
    setFout("");
    setStap(STAPPEN[Math.max(stapIndex - 1, 0)].sleutel);
  }

  function maakOpslagInvoer(): WoningrouteOpslagInvoer {
    const gebruikteVerdiepingSleutels = new Set(
      ruimten
        .map((ruimte) => ruimte.verdiepingSleutel)
        .filter((sleutel): sleutel is string => sleutel !== null),
    );

    const actieveVerdiepingen = verdiepingen
      .filter((verdieping) =>
        gebruikteVerdiepingSleutels.has(verdieping.sleutel),
      )
      .sort((a, b) => a.niveau - b.niveau || a.naam.localeCompare(b.naam));

    const verdiepingNaamPerSleutel = new Map(
      actieveVerdiepingen.map((verdieping) => [
        verdieping.sleutel,
        verdieping.naam.trim(),
      ]),
    );

    return {
      verdiepingen: actieveVerdiepingen.map((verdieping, index) => ({
        id: verdieping.id,
        naam: verdieping.naam.trim(),
        niveau: verdieping.niveau,
        loopvolgorde: index + 1,
        opmerkingen: null,
      })),
      ruimten: ruimten.map((ruimte) => ({
        id: ruimte.id,
        naam: ruimte.naam.trim(),
        ruimte_type: ruimte.ruimteType,
        buiten: ruimte.buiten,
        verdieping_naam: ruimte.verdiepingSleutel
          ? verdiepingNaamPerSleutel.get(ruimte.verdiepingSleutel) ?? null
          : null,
        capaciteit:
          ruimte.ruimteType === "slaapkamer"
            ? ruimte.capaciteit
            : null,
        route_instructie: ruimte.routeInstructie.trim() || null,
        controles: ruimte.controles,
        objecten: ruimte.objecten.map((object) => ({
          id: object.id,
          naam: object.naam.trim(),
          object_type: object.objectType,
        })),
      })),
    };
  }

  async function slaRouteOp() {
    if (!valideerHuidigeConfiguratie()) return;

    setBezig(true);
    setFout("");
    setMelding("");

    try {
      const resultaat = await slaVolledigeWoningrouteOp(
        woningId,
        maakOpslagInvoer(),
      );

      setMelding(
        `Woningroute geactiveerd: ${resultaat.ruimten} ruimten, ` +
          `${resultaat.slaapkamers} slaapkamers en ` +
          `${resultaat.controlepunten} controlepunten.`,
      );

      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Woningroute opslaan mislukt.",
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="rounded-3xl bg-slate-950 p-6 text-white shadow">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">
          Reality Engine
        </p>
        <h2 className="mt-2 text-3xl font-bold">
          Beschrijf de woning één keer
        </h2>
        <p className="mt-3 max-w-3xl text-slate-300">
          De route, slaapkamers, bewonerskamers, objecten en controlepunten
          ontstaan automatisch uit deze begeleide invoer.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STAPPEN.map((item) => (
            <button
              key={item.sleutel}
              type="button"
              onClick={() => setStap(item.sleutel)}
              className={`rounded-2xl border p-4 text-left ${
                item.sleutel === stap
                  ? "border-emerald-300 bg-emerald-500 text-slate-950"
                  : "border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              <span className="text-sm font-bold">Stap {item.nummer}</span>
              <span className="mt-1 block font-semibold">{item.titel}</span>
            </button>
          ))}
        </div>
      </header>

      {fout && (
        <p className="rounded-2xl bg-red-100 p-5 font-medium text-red-900">
          {fout}
        </p>
      )}

      {melding && (
        <p className="rounded-2xl bg-emerald-100 p-5 font-medium text-emerald-900">
          {melding}
        </p>
      )}

      {stap === "ruimten" && (
        <div className="space-y-6">
          {categorieen.map((categorie) => (
            <section
              key={categorie}
              className="rounded-2xl bg-white p-6 shadow"
            >
              <h3 className="text-xl font-bold">{categorie}</h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {RUIMTE_SJABLONEN.filter(
                  (sjabloon) => sjabloon.categorie === categorie,
                ).map((sjabloon) => {
                  const aantal = aantalVoor(sjabloon.code);

                  return (
                    <article
                      key={sjabloon.code}
                      className={`rounded-2xl border p-4 ${
                        aantal > 0
                          ? "border-emerald-600 bg-emerald-50"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold">{sjabloon.naam}</p>
                          <p className="text-sm text-slate-500">
                            {sjabloon.buiten
                              ? "Buitenruimte"
                              : "Binnenruimte"}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-label={`${sjabloon.naam} verminderen`}
                            onClick={() =>
                              wijzigAantal(sjabloon, aantal - 1)
                            }
                            className="flex h-12 w-12 items-center justify-center rounded-xl border text-2xl font-bold"
                          >
                            −
                          </button>

                          <span className="min-w-10 text-center text-lg font-bold">
                            {aantal}
                          </span>

                          <button
                            type="button"
                            aria-label={`${sjabloon.naam} toevoegen`}
                            onClick={() =>
                              wijzigAantal(sjabloon, aantal + 1)
                            }
                            className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-700 text-2xl font-bold text-white"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="rounded-2xl bg-white p-6 shadow">
            <h3 className="text-xl font-bold">Andere ruimte toevoegen</h3>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input
                value={vrijeNaam}
                onChange={(event) => setVrijeNaam(event.target.value)}
                className="rounded-xl border px-4 py-3"
                placeholder="Bijvoorbeeld serre of pomphuis"
              />

              <label className="flex items-center gap-2 rounded-xl border px-4 py-3">
                <input
                  type="checkbox"
                  checked={vrijeBuitenruimte}
                  onChange={(event) =>
                    setVrijeBuitenruimte(event.target.checked)
                  }
                />
                Buitenruimte
              </label>

              <button
                type="button"
                onClick={voegVrijeRuimteToe}
                className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
              >
                Toevoegen
              </button>
            </div>
          </section>
        </div>
      )}

      {stap === "route" && (
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold">
                  Automatisch voorgestelde looproute
                </h3>
                <p className="mt-1 text-slate-600">
                  Pas alleen uitzonderingen aan. Routennummers worden
                  automatisch bepaald.
                </p>
              </div>

              <button
                type="button"
                onClick={voegVerdiepingToe}
                className="rounded-xl border px-5 py-3 font-semibold"
              >
                Verdieping toevoegen
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {ruimten.map((ruimte, index) => (
                <article
                  key={ruimte.sleutel}
                  className="grid gap-3 rounded-2xl border p-4 lg:grid-cols-[auto_1fr_220px_auto]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 font-bold text-white">
                    {index + 1}
                  </span>

                  <input
                    value={ruimte.naam}
                    onChange={(event) =>
                      wijzigRuimte(ruimte.sleutel, {
                        naam: event.target.value,
                      })
                    }
                    className="rounded-xl border px-4 py-3 font-semibold"
                  />

                  {ruimte.buiten ? (
                    <div className="rounded-xl bg-slate-100 px-4 py-3 text-slate-600">
                      Buitenroute
                    </div>
                  ) : (
                    <select
                      value={ruimte.verdiepingSleutel ?? ""}
                      onChange={(event) =>
                        wijzigRuimte(ruimte.sleutel, {
                          verdiepingSleutel: event.target.value || null,
                        })
                      }
                      className="rounded-xl border px-4 py-3"
                    >
                      <option value="">Geen verdieping</option>
                      {verdiepingen
                        .sort(
                          (a, b) =>
                            a.niveau - b.niveau ||
                            a.naam.localeCompare(b.naam),
                        )
                        .map((verdieping) => (
                          <option
                            key={verdieping.sleutel}
                            value={verdieping.sleutel}
                          >
                            {verdieping.naam}
                          </option>
                        ))}
                    </select>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => verplaatsRuimte(index, -1)}
                      className="rounded-xl border px-4 py-3 disabled:opacity-30"
                    >
                      Omhoog
                    </button>
                    <button
                      type="button"
                      disabled={index === ruimten.length - 1}
                      onClick={() => verplaatsRuimte(index, 1)}
                      className="rounded-xl border px-4 py-3 disabled:opacity-30"
                    >
                      Omlaag
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRuimten((huidig) =>
                          huidig.filter(
                            (item) => item.sleutel !== ruimte.sleutel,
                          ),
                        )
                      }
                      className="rounded-xl border border-red-300 px-4 py-3 text-red-700"
                    >
                      Verwijderen
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <h3 className="text-xl font-bold">Verdiepingen</h3>
            <p className="mt-1 text-slate-600">
              Namen en niveaus worden automatisch voorgesteld. Wijzig alleen
              afwijkende woningen.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {verdiepingen.map((verdieping) => (
                <article
                  key={verdieping.sleutel}
                  className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_110px]"
                >
                  <input
                    value={verdieping.naam}
                    onChange={(event) =>
                      wijzigVerdieping(verdieping.sleutel, {
                        naam: event.target.value,
                      })
                    }
                    className="rounded-xl border px-4 py-3"
                  />
                  <input
                    type="number"
                    step="1"
                    value={verdieping.niveau}
                    onChange={(event) =>
                      wijzigVerdieping(verdieping.sleutel, {
                        niveau: Number(event.target.value),
                      })
                    }
                    className="rounded-xl border px-4 py-3"
                    aria-label={`Niveau ${verdieping.naam}`}
                  />
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {stap === "details" && (
        <div className="space-y-4">
          <section className="rounded-2xl bg-emerald-50 p-5">
            <h3 className="font-bold">
              Alleen noodzakelijke gegevens invullen
            </h3>
            <p className="mt-1 text-slate-700">
              Standaardobjecten en controlepunten zijn al voorgesteld.
              Technische keuzes staan onder geavanceerde uitzonderingen.
            </p>
          </section>

          {ruimten.map((ruimte, index) => {
            const open = openRuimte === ruimte.sleutel;

            return (
              <article
                key={ruimte.sleutel}
                className="overflow-hidden rounded-2xl bg-white shadow"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenRuimte(open ? null : ruimte.sleutel)
                  }
                  className="flex w-full justify-between p-6 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">
                      Routepositie {index + 1}
                    </p>
                    <h3 className="text-xl font-bold">{ruimte.naam}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {ruimte.objecten.length} objecten ·{" "}
                      {ruimte.controles.length} controlepunten
                      {ruimte.ruimteType === "slaapkamer"
                        ? ` · capaciteit ${ruimte.capaciteit ?? 1}`
                        : ""}
                    </p>
                  </div>
                  <span className="text-2xl">{open ? "−" : "+"}</span>
                </button>

                {open && (
                  <div className="space-y-6 border-t p-6">
                    {ruimte.ruimteType === "slaapkamer" && (
                      <label className="block">
                        <span className="mb-1 block font-bold">
                          Capaciteit slaapkamer
                        </span>
                        <input
                          required
                          type="number"
                          min="1"
                          step="1"
                          value={ruimte.capaciteit ?? 1}
                          onChange={(event) =>
                            wijzigRuimte(ruimte.sleutel, {
                              capaciteit: Number(event.target.value),
                            })
                          }
                          className="w-full rounded-xl border px-4 py-3"
                        />
                        <span className="mt-1 block text-sm text-slate-600">
                          De gekoppelde bewonerskamer krijgt automatisch
                          dezelfde capaciteit.
                        </span>
                      </label>
                    )}

                    <label className="block">
                      <span className="mb-1 block font-bold">
                        Route-instructie
                      </span>
                      <input
                        value={ruimte.routeInstructie}
                        onChange={(event) =>
                          wijzigRuimte(ruimte.sleutel, {
                            routeInstructie: event.target.value,
                          })
                        }
                        className="w-full rounded-xl border px-4 py-3"
                        placeholder="Alleen invullen wanneer extra uitleg nodig is"
                      />
                    </label>
                  </div>
                )}
              </article>
            );
          })}

          <section className="rounded-2xl bg-white p-6 shadow">
            <button
              type="button"
              onClick={() => setToonGeavanceerd((huidig) => !huidig)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h3 className="text-xl font-bold">
                  Geavanceerde uitzonderingen
                </h3>
                <p className="mt-1 text-slate-600">
                  Alleen gebruiken voor afwijkende objecten of controlepunten.
                </p>
              </div>
              <span className="text-2xl">
                {toonGeavanceerd ? "−" : "+"}
              </span>
            </button>

            {toonGeavanceerd && (
              <div className="mt-6 space-y-6 border-t pt-6">
                {ruimten.map((ruimte) => (
                  <article
                    key={ruimte.sleutel}
                    className="rounded-2xl border p-5"
                  >
                    <h4 className="text-lg font-bold">{ruimte.naam}</h4>

                    <div className="mt-4">
                      <h5 className="font-bold">Controlepunten</h5>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {configuratie.definities
                          .filter(
                            (definitie) =>
                              !definitie.standaard_object_type,
                          )
                          .map((definitie) => (
                            <label
                              key={definitie.id}
                              className="flex gap-3 rounded-xl border p-4"
                            >
                              <input
                                type="checkbox"
                                checked={ruimte.controles.includes(
                                  definitie.code,
                                )}
                                onChange={() =>
                                  wisselControle(
                                    ruimte.sleutel,
                                    definitie.code,
                                  )
                                }
                              />
                              {definitie.naam}
                            </label>
                          ))}
                      </div>
                    </div>

                    <div className="mt-5">
                      <h5 className="font-bold">Objecten</h5>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {Object.values(OBJECTEN).map((object) => (
                          <label
                            key={object.code}
                            className="flex gap-3 rounded-xl border p-4"
                          >
                            <input
                              type="checkbox"
                              checked={ruimte.objecten.some(
                                (item) => item.code === object.code,
                              )}
                              onChange={() =>
                                wisselObject(ruimte.sleutel, object)
                              }
                            />
                            {object.naam}
                          </label>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {stap === "voorbeeld" && (
        <div className="space-y-4">
          <section className="rounded-2xl bg-white p-6 shadow">
            <h3 className="text-2xl font-bold">Routepreview controleur</h3>
            <p className="mt-1 text-slate-600">
              Dit is exact de volgorde waarin de woning wordt gecontroleerd.
            </p>
          </section>

          {ruimten.map((ruimte, index) => {
            const verdieping = verdiepingen.find(
              (item) => item.sleutel === ruimte.verdiepingSleutel,
            );

            return (
              <article
                key={ruimte.sleutel}
                className="rounded-2xl bg-white p-6 shadow"
              >
                <p className="text-sm font-semibold text-emerald-700">
                  Stap {index + 1} van {ruimten.length}
                </p>
                <h3 className="text-2xl font-bold">{ruimte.naam}</h3>
                <p className="mt-2 text-slate-600">
                  {ruimte.buiten
                    ? "Buitenroute"
                    : verdieping?.naam ?? "Geen verdieping"}{" "}
                  · {ruimte.controles.length} controlepunten ·{" "}
                  {ruimte.objecten.length} objecten
                  {ruimte.ruimteType === "slaapkamer"
                    ? ` · capaciteit ${ruimte.capaciteit ?? 1}`
                    : ""}
                </p>
                {ruimte.routeInstructie && (
                  <p className="mt-3 rounded-xl bg-slate-100 p-4">
                    {ruimte.routeInstructie}
                  </p>
                )}
              </article>
            );
          })}

          <button
            type="button"
            disabled={bezig}
            onClick={slaRouteOp}
            className="w-full rounded-2xl bg-emerald-700 px-6 py-5 text-lg font-bold text-white disabled:opacity-50"
          >
            {bezig
              ? "Opslaan en activeren..."
              : "Woningroute opslaan en activeren"}
          </button>
        </div>
      )}

      <footer className="sticky bottom-3 flex items-center justify-between rounded-2xl bg-white p-4 shadow-xl">
        <button
          type="button"
          disabled={stapIndex === 0}
          onClick={vorigeStap}
          className="rounded-xl border px-5 py-3 disabled:opacity-30"
        >
          Vorige
        </button>

        <span className="font-semibold">{ruimten.length} ruimte(n)</span>

        {stap !== "voorbeeld" && (
          <button
            type="button"
            onClick={volgendeStap}
            className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white"
          >
            Volgende
          </button>
        )}
      </footer>
    </section>
  );
}
