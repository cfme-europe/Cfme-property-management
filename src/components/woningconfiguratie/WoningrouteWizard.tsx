"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createControlepunt,
  createObject,
  createRuimte,
  createVerdieping,
  updateControlepunt,
  updateObject,
  updateRuimte,
  updateVerdieping,
} from "@/services/woningconfiguratie";
import type {
  RuimteType,
  WoningConfiguratie,
} from "@/types/woningconfiguratie";

type Props = {
  woningId: number;
  configuratie: WoningConfiguratie;
};

type WizardStap =
  | "ruimten"
  | "route"
  | "inrichting"
  | "voorbeeld";

type VerdiepingNaam =
  | "Kelder"
  | "Begane grond"
  | "Eerste verdieping"
  | "Tweede verdieping"
  | "Zolder";

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
  verdieping: VerdiepingNaam | null;
  controles: string[];
  objecten: string[];
};

type GekozenObject = {
  sleutel: string;
  code: string;
  naam: string;
  objectType: string;
  aantal: number;
};

type GekozenRuimte = {
  sleutel: string;
  sjabloonCode: string;
  naam: string;
  ruimteType: RuimteType;
  buiten: boolean;
  verdieping: VerdiepingNaam | null;
  routeInstructie: string;
  controles: string[];
  objecten: GekozenObject[];
};

const VERDIEPINGEN: Array<{
  naam: VerdiepingNaam;
  niveau: number;
}> = [
  { naam: "Kelder", niveau: -1 },
  { naam: "Begane grond", niveau: 0 },
  { naam: "Eerste verdieping", niveau: 1 },
  { naam: "Tweede verdieping", niveau: 2 },
  { naam: "Zolder", niveau: 3 },
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
};

const ALGEMENE_CONTROLES = [
  "ALG_NETHEID",
  "ALG_SCHADE",
  "ALG_VEILIGHEID",
];

const RUIMTE_SJABLONEN: RuimteSjabloon[] = [
  {
    code: "voordeur_gevel",
    naam: "Voordeur en voorgevel",
    categorie: "Buiten – toegang en gevel",
    ruimteType: "buitenruimte",
    buiten: true,
    meervoud: false,
    verdieping: null,
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
    verdieping: "Begane grond",
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
    verdieping: "Begane grond",
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
    verdieping: "Begane grond",
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
    verdieping: "Begane grond",
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
    verdieping: "Eerste verdieping",
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
    verdieping: "Begane grond",
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
    verdieping: "Begane grond",
    controles: [
      ...ALGEMENE_CONTROLES,
      "KEUKEN_HYGIENE",
    ],
    objecten: [
      "rookmelder",
      "koelkast",
      "kookplaat",
      "afzuigkap",
    ],
  },
  {
    code: "slaapkamer",
    naam: "Slaapkamer",
    categorie: "Binnen – slaapruimten",
    ruimteType: "slaapkamer",
    buiten: false,
    meervoud: true,
    verdieping: "Eerste verdieping",
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
    verdieping: "Eerste verdieping",
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
    verdieping: "Begane grond",
    controles: [
      "ALG_NETHEID",
      "ALG_SCHADE",
    ],
    objecten: [],
  },
  {
    code: "berging",
    naam: "Berging",
    categorie: "Binnen – opslag en techniek",
    ruimteType: "berging",
    buiten: false,
    meervoud: true,
    verdieping: "Begane grond",
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
    verdieping: "Begane grond",
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
    verdieping: "Begane grond",
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
    verdieping: "Kelder",
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
    verdieping: "Zolder",
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
    verdieping: null,
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
    verdieping: null,
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
    verdieping: null,
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
    verdieping: null,
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
    verdieping: null,
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
    verdieping: null,
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
    verdieping: "Eerste verdieping",
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
    verdieping: null,
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
    verdieping: null,
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
    verdieping: null,
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
    verdieping: null,
    controles: [
      "ALG_NETHEID",
      "ALG_VEILIGHEID",
    ],
    objecten: ["afvalcontainer"],
  },
  {
    code: "erfafscheiding",
    naam: "Erfafscheiding",
    categorie: "Buiten – tuin en terrein",
    ruimteType: "buitenruimte",
    buiten: true,
    meervoud: false,
    verdieping: null,
    controles: [
      "ALG_SCHADE",
      "ALG_VEILIGHEID",
    ],
    objecten: [],
  },
];

const STAPPEN: Array<{
  sleutel: WizardStap;
  nummer: number;
  titel: string;
}> = [
  {
    sleutel: "ruimten",
    nummer: 1,
    titel: "Ruimten kiezen",
  },
  {
    sleutel: "route",
    nummer: 2,
    titel: "Looproute bepalen",
  },
  {
    sleutel: "inrichting",
    nummer: 3,
    titel: "Inhoud en controles",
  },
  {
    sleutel: "voorbeeld",
    nummer: 4,
    titel: "Controleren en opslaan",
  },
];

function uniekeSleutel(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function verdiepingNiveau(
  naam: VerdiepingNaam,
): number {
  return (
    VERDIEPINGEN.find(
      (verdieping) =>
        verdieping.naam === naam,
    )?.niveau ?? 0
  );
}

function maakObject(
  code: string,
): GekozenObject {
  const sjabloon = OBJECTEN[code];

  if (!sjabloon) {
    throw new Error(
      `Onbekend objectsjabloon: ${code}.`,
    );
  }

  return {
    sleutel: uniekeSleutel(code),
    code: sjabloon.code,
    naam: sjabloon.naam,
    objectType: sjabloon.objectType,
    aantal: 1,
  };
}

function maakRuimte(
  sjabloon: RuimteSjabloon,
  nummer: number,
): GekozenRuimte {
  return {
    sleutel: uniekeSleutel(
      sjabloon.code,
    ),
    sjabloonCode: sjabloon.code,
    naam:
      sjabloon.meervoud
        ? `${sjabloon.naam} ${nummer}`
        : sjabloon.naam,
    ruimteType: sjabloon.ruimteType,
    buiten: sjabloon.buiten,
    verdieping: sjabloon.verdieping,
    routeInstructie: "",
    controles: [...sjabloon.controles],
    objecten: sjabloon.objecten.map(
      maakObject,
    ),
  };
}

function bestaandeRuimten(
  configuratie: WoningConfiguratie,
): GekozenRuimte[] {
  const verdiepingPerId = new Map(
    configuratie.verdiepingen.map(
      (verdieping) => [
        verdieping.id,
        verdieping,
      ],
    ),
  );

  return configuratie.ruimten
    .filter((ruimte) => ruimte.actief)
    .sort(
      (a, b) =>
        a.loopvolgorde -
          b.loopvolgorde ||
        a.id - b.id,
    )
    .map((ruimte) => {
      const verdieping =
        ruimte.verdieping_id
          ? verdiepingPerId.get(
              ruimte.verdieping_id,
            )
          : null;

      const controles =
        configuratie.controlepunten
          .filter(
            (punt) =>
              punt.ruimte_id ===
                ruimte.id &&
              punt.object_id === null &&
              punt.actief &&
              punt.definitie,
          )
          .map(
            (punt) =>
              punt.definitie?.code ?? "",
          )
          .filter(Boolean);

      const objecten =
        configuratie.objecten
          .filter(
            (object) =>
              object.ruimte_id ===
                ruimte.id &&
              object.actief,
          )
          .map((object) => ({
            sleutel:
              `bestaand-object-${object.id}`,
            code: object.object_type,
            naam: object.naam,
            objectType:
              object.object_type,
            aantal: 1,
          }));

      return {
        sleutel:
          `bestaand-ruimte-${ruimte.id}`,
        sjabloonCode:
          ruimte.ruimte_type,
        naam: ruimte.naam,
        ruimteType:
          ruimte.ruimte_type,
        buiten:
          ruimte.ruimte_type ===
          "buitenruimte",
        verdieping:
          verdieping &&
          VERDIEPINGEN.some(
            (keuze) =>
              keuze.naam ===
              verdieping.naam,
          )
            ? (verdieping.naam as VerdiepingNaam)
            : null,
        routeInstructie:
          ruimte.route_instructie ?? "",
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

  const [stap, setStap] =
    useState<WizardStap>("ruimten");

  const [ruimten, setRuimten] =
    useState<GekozenRuimte[]>(() =>
      bestaandeRuimten(configuratie),
    );

  const [openRuimte, setOpenRuimte] =
    useState<string | null>(null);

  const [vrijeNaam, setVrijeNaam] =
    useState("");

  const [vrijeBuitenruimte, setVrijeBuitenruimte] =
    useState(false);

  const [bezig, setBezig] =
    useState(false);

  const [fout, setFout] =
    useState("");

  const [melding, setMelding] =
    useState("");

  const definitiePerCode = useMemo(
    () =>
      new Map(
        configuratie.definities.map(
          (definitie) => [
            definitie.code,
            definitie,
          ],
        ),
      ),
    [configuratie.definities],
  );

  const categorieen = useMemo(
    () =>
      Array.from(
        new Set(
          RUIMTE_SJABLONEN.map(
            (sjabloon) =>
              sjabloon.categorie,
          ),
        ),
      ),
    [],
  );

  const stapIndex = STAPPEN.findIndex(
    (item) => item.sleutel === stap,
  );

  function aantalVoor(
    sjabloonCode: string,
  ): number {
    return ruimten.filter(
      (ruimte) =>
        ruimte.sjabloonCode ===
        sjabloonCode,
    ).length;
  }

  function wijzigAantal(
    sjabloon: RuimteSjabloon,
    gewenstAantal: number,
  ) {
    const gewenst = Math.max(
      0,
      Math.min(20, gewenstAantal),
    );

    setRuimten((huidig) => {
      const passend = huidig.filter(
        (ruimte) =>
          ruimte.sjabloonCode ===
          sjabloon.code,
      );

      if (passend.length === gewenst) {
        return huidig;
      }

      if (passend.length > gewenst) {
        let behouden = gewenst;

        return huidig.filter(
          (ruimte) => {
            if (
              ruimte.sjabloonCode !==
              sjabloon.code
            ) {
              return true;
            }

            if (behouden > 0) {
              behouden -= 1;
              return true;
            }

            return false;
          },
        );
      }

      const aanvulling = Array.from(
        {
          length:
            gewenst - passend.length,
        },
        (_, index) =>
          maakRuimte(
            sjabloon,
            passend.length + index + 1,
          ),
      );

      return [...huidig, ...aanvulling];
    });
  }

  function voegVrijeRuimteToe() {
    const naam = vrijeNaam.trim();

    if (!naam) {
      setFout(
        "Vul eerst een naam in.",
      );
      return;
    }

    setRuimten((huidig) => [
      ...huidig,
      {
        sleutel:
          uniekeSleutel("vrij"),
        sjabloonCode: "vrij",
        naam,
        ruimteType:
          vrijeBuitenruimte
            ? "buitenruimte"
            : "overig",
        buiten: vrijeBuitenruimte,
        verdieping:
          vrijeBuitenruimte
            ? null
            : "Begane grond",
        routeInstructie: "",
        controles: [
          ...ALGEMENE_CONTROLES,
        ],
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
          ? {
              ...ruimte,
              ...wijziging,
            }
          : ruimte,
      ),
    );
  }

  function verplaatsRuimte(
    index: number,
    richting: -1 | 1,
  ) {
    const doel = index + richting;

    if (
      doel < 0 ||
      doel >= ruimten.length
    ) {
      return;
    }

    setRuimten((huidig) => {
      const nieuw = [...huidig];
      const [ruimte] =
        nieuw.splice(index, 1);

      nieuw.splice(doel, 0, ruimte);

      return nieuw;
    });
  }

  function wisselControle(
    sleutel: string,
    code: string,
  ) {
    const ruimte = ruimten.find(
      (item) =>
        item.sleutel === sleutel,
    );

    if (!ruimte) {
      return;
    }

    wijzigRuimte(sleutel, {
      controles:
        ruimte.controles.includes(code)
          ? ruimte.controles.filter(
              (item) => item !== code,
            )
          : [...ruimte.controles, code],
    });
  }

  function wisselObject(
    sleutel: string,
    sjabloon: ObjectSjabloon,
  ) {
    const ruimte = ruimten.find(
      (item) =>
        item.sleutel === sleutel,
    );

    if (!ruimte) {
      return;
    }

    const bestaand =
      ruimte.objecten.find(
        (object) =>
          object.code ===
          sjabloon.code,
      );

    wijzigRuimte(sleutel, {
      objecten: bestaand
        ? ruimte.objecten.filter(
            (object) =>
              object.code !==
              sjabloon.code,
          )
        : [
            ...ruimte.objecten,
            {
              sleutel:
                uniekeSleutel(
                  sjabloon.code,
                ),
              code: sjabloon.code,
              naam: sjabloon.naam,
              objectType:
                sjabloon.objectType,
              aantal: 1,
            },
          ],
    });
  }

  function volgendeStap() {
    if (
      stap === "ruimten" &&
      ruimten.length === 0
    ) {
      setFout(
        "Kies minimaal één ruimte.",
      );
      return;
    }

    if (
      stap === "ruimten" &&
      !ruimten.some(
        (ruimte) => ruimte.buiten,
      )
    ) {
      setFout(
        "Kies minimaal één buitenruimte.",
      );
      return;
    }

    setFout("");

    setStap(
      STAPPEN[
        Math.min(
          stapIndex + 1,
          STAPPEN.length - 1,
        )
      ].sleutel,
    );
  }

  function vorigeStap() {
    setFout("");

    setStap(
      STAPPEN[
        Math.max(
          stapIndex - 1,
          0,
        )
      ].sleutel,
    );
  }

  async function slaRouteOp() {
    setBezig(true);
    setFout("");
    setMelding("");

    try {
      const verdiepingIds =
        new Map<
          VerdiepingNaam,
          number
        >();

      const benodigdeVerdiepingen =
        Array.from(
          new Set(
            ruimten
              .map(
                (ruimte) =>
                  ruimte.verdieping,
              )
              .filter(
                (
                  naam,
                ): naam is VerdiepingNaam =>
                  naam !== null,
              ),
          ),
        );

      for (
        let index = 0;
        index <
        benodigdeVerdiepingen.length;
        index += 1
      ) {
        const naam =
          benodigdeVerdiepingen[index];

        const bestaand =
          configuratie.verdiepingen.find(
            (verdieping) =>
              verdieping.naam === naam,
          );

        const invoer = {
          woning_id: woningId,
          naam,
          niveau:
            verdiepingNiveau(naam),
          loopvolgorde: index + 1,
          actief: true,
          opmerkingen: null,
        };

        const opgeslagen = bestaand
          ? await updateVerdieping(
              bestaand.id,
              invoer,
            )
          : await createVerdieping(
              invoer,
            );

        verdiepingIds.set(
          naam,
          opgeslagen.id,
        );
      }

      const behoudenRuimteIds =
        new Set<number>();

      for (
        let routeIndex = 0;
        routeIndex < ruimten.length;
        routeIndex += 1
      ) {
        const routeRuimte =
          ruimten[routeIndex];

        const bestaandId =
          routeRuimte.sleutel.startsWith(
            "bestaand-ruimte-",
          )
            ? Number(
                routeRuimte.sleutel.replace(
                  "bestaand-ruimte-",
                  "",
                ),
              )
            : null;

        const bestaand =
          configuratie.ruimten.find(
            (ruimte) =>
              ruimte.id === bestaandId,
          );

        const invoer = {
          woning_id: woningId,
          verdieping_id:
            routeRuimte.verdieping
              ? verdiepingIds.get(
                  routeRuimte.verdieping,
                ) ?? null
              : null,
          kamer_id: null,
          naam:
            routeRuimte.naam.trim(),
          ruimte_type:
            routeRuimte.ruimteType,
          loopvolgorde:
            routeIndex + 1,
          actief: true,
          controle_verplicht: true,
          omschrijving: null,
          route_instructie:
            routeRuimte.routeInstructie,
          opmerkingen:
            routeRuimte.buiten
              ? "Buitenruimte"
              : null,
        };

        const opgeslagenRuimte =
          bestaand
            ? await updateRuimte(
                bestaand.id,
                invoer,
              )
            : await createRuimte(invoer);

        behoudenRuimteIds.add(
          opgeslagenRuimte.id,
        );

        let controleVolgorde = 1;

        for (
          const code of
          routeRuimte.controles
        ) {
          const definitie =
            definitiePerCode.get(code);

          if (!definitie) {
            continue;
          }

          const bestaandPunt =
            configuratie.controlepunten.find(
              (punt) =>
                punt.ruimte_id ===
                  opgeslagenRuimte.id &&
                punt.object_id === null &&
                punt.definitie_id ===
                  definitie.id,
            );

          const puntInvoer = {
            woning_id: woningId,
            ruimte_id:
              opgeslagenRuimte.id,
            object_id: null,
            definitie_id:
              definitie.id,
            naam_override: null,
            omschrijving_override: null,
            loopvolgorde:
              controleVolgorde,
            verplicht: true,
            actief: true,
            foto_verplicht_bij_afwijking:
              null,
            toelichting_verplicht_bij_afwijking:
              null,
            melding_maken_bij_afwijking:
              null,
            taak_maken_bij_afwijking:
              null,
            opmerkingen: null,
          };

          if (bestaandPunt) {
            await updateControlepunt(
              bestaandPunt.id,
              puntInvoer,
            );
          } else {
            await createControlepunt(
              puntInvoer,
            );
          }

          controleVolgorde += 1;
        }

        let objectVolgorde = 1;

        for (
          const gekozenObject of
          routeRuimte.objecten
        ) {
          for (
            let nummer = 1;
            nummer <=
            gekozenObject.aantal;
            nummer += 1
          ) {
            const naam =
              gekozenObject.aantal > 1
                ? `${gekozenObject.naam} ${nummer}`
                : gekozenObject.naam;

            const bestaandObject =
              configuratie.objecten.find(
                (object) =>
                  object.ruimte_id ===
                    opgeslagenRuimte.id &&
                  object.naam === naam,
              );

            const objectInvoer = {
              woning_id: woningId,
              ruimte_id:
                opgeslagenRuimte.id,
              object_type:
                gekozenObject.objectType,
              naam,
              objectnummer:
                `${routeIndex + 1}-${objectVolgorde}`,
              merk: null,
              model: null,
              serienummer: null,
              loopvolgorde:
                objectVolgorde,
              actief: true,
              controle_verplicht: true,
              geplaatst_op: null,
              vervangen_op: null,
              opmerkingen: null,
            };

            const opgeslagenObject =
              bestaandObject
                ? await updateObject(
                    bestaandObject.id,
                    objectInvoer,
                  )
                : await createObject(
                    objectInvoer,
                  );

            const definities =
              configuratie.definities.filter(
                (definitie) =>
                  definitie.standaard_object_type ===
                  gekozenObject.objectType,
              );

            for (
              const definitie of definities
            ) {
              const bestaandPunt =
                configuratie.controlepunten.find(
                  (punt) =>
                    punt.object_id ===
                      opgeslagenObject.id &&
                    punt.definitie_id ===
                      definitie.id,
                );

              const puntInvoer = {
                woning_id: woningId,
                ruimte_id:
                  opgeslagenRuimte.id,
                object_id:
                  opgeslagenObject.id,
                definitie_id:
                  definitie.id,
                naam_override: null,
                omschrijving_override:
                  null,
                loopvolgorde:
                  controleVolgorde,
                verplicht: true,
                actief: true,
                foto_verplicht_bij_afwijking:
                  null,
                toelichting_verplicht_bij_afwijking:
                  null,
                melding_maken_bij_afwijking:
                  null,
                taak_maken_bij_afwijking:
                  null,
                opmerkingen: null,
              };

              if (bestaandPunt) {
                await updateControlepunt(
                  bestaandPunt.id,
                  puntInvoer,
                );
              } else {
                await createControlepunt(
                  puntInvoer,
                );
              }

              controleVolgorde += 1;
            }

            objectVolgorde += 1;
          }
        }
      }

      for (
        const oudeRuimte of
        configuratie.ruimten
      ) {
        if (
          oudeRuimte.actief &&
          !behoudenRuimteIds.has(
            oudeRuimte.id,
          )
        ) {
          await updateRuimte(
            oudeRuimte.id,
            {
              woning_id: woningId,
              verdieping_id:
                oudeRuimte.verdieping_id,
              kamer_id:
                oudeRuimte.kamer_id,
              naam: oudeRuimte.naam,
              ruimte_type:
                oudeRuimte.ruimte_type,
              loopvolgorde:
                oudeRuimte.loopvolgorde,
              actief: false,
              controle_verplicht:
                oudeRuimte.controle_verplicht,
              omschrijving:
                oudeRuimte.omschrijving,
              route_instructie:
                oudeRuimte.route_instructie,
              opmerkingen:
                oudeRuimte.opmerkingen,
            },
          );
        }
      }

      setMelding(
        "De woningroute is opgeslagen en geactiveerd.",
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
          Begeleide woningroute
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Richt de controle in zoals je door de woning loopt
        </h2>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STAPPEN.map((item) => (
            <button
              key={item.sleutel}
              type="button"
              onClick={() =>
                setStap(item.sleutel)
              }
              className={`rounded-2xl border p-4 text-left ${
                item.sleutel === stap
                  ? "border-emerald-300 bg-emerald-500 text-slate-950"
                  : "border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              <span className="text-sm font-bold">
                Stap {item.nummer}
              </span>
              <span className="mt-1 block font-semibold">
                {item.titel}
              </span>
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
          {categorieen.map(
            (categorie) => (
              <section
                key={categorie}
                className="rounded-2xl bg-white p-6 shadow"
              >
                <h3 className="text-xl font-bold">
                  {categorie}
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {RUIMTE_SJABLONEN.filter(
                    (sjabloon) =>
                      sjabloon.categorie ===
                      categorie,
                  ).map((sjabloon) => {
                    const aantal =
                      aantalVoor(
                        sjabloon.code,
                      );

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
                            <p className="font-bold">
                              {sjabloon.naam}
                            </p>
                            <p className="text-sm text-slate-500">
                              {sjabloon.buiten
                                ? "Buitenruimte"
                                : "Binnenruimte"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                wijzigAantal(
                                  sjabloon,
                                  aantal - 1,
                                )
                              }
                              className="h-11 w-11 rounded-xl border text-xl font-bold"
                            >
                              −
                            </button>

                            <span className="w-8 text-center font-bold">
                              {aantal}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                wijzigAantal(
                                  sjabloon,
                                  aantal + 1,
                                )
                              }
                              className="h-11 w-11 rounded-xl bg-emerald-700 text-xl font-bold text-white"
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
            ),
          )}

          <section className="rounded-2xl bg-white p-6 shadow">
            <h3 className="text-xl font-bold">
              Andere ruimte toevoegen
            </h3>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input
                value={vrijeNaam}
                onChange={(event) =>
                  setVrijeNaam(
                    event.target.value,
                  )
                }
                className="rounded-xl border px-4 py-3"
                placeholder="Bijvoorbeeld serre of pomphuis"
              />

              <label className="flex items-center gap-2 rounded-xl border px-4 py-3">
                <input
                  type="checkbox"
                  checked={
                    vrijeBuitenruimte
                  }
                  onChange={(event) =>
                    setVrijeBuitenruimte(
                      event.target.checked,
                    )
                  }
                />
                Buitenruimte
              </label>

              <button
                type="button"
                onClick={
                  voegVrijeRuimteToe
                }
                className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
              >
                Toevoegen
              </button>
            </div>
          </section>
        </div>
      )}

      {stap === "route" && (
        <section className="rounded-2xl bg-white p-6 shadow">
          <h3 className="text-2xl font-bold">
            Bepaal de werkelijke loopvolgorde
          </h3>

          <div className="mt-6 space-y-3">
            {ruimten.map(
              (ruimte, index) => (
                <article
                  key={ruimte.sleutel}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border p-4"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 font-bold text-white">
                    {index + 1}
                  </span>

                  <input
                    value={ruimte.naam}
                    onChange={(event) =>
                      wijzigRuimte(
                        ruimte.sleutel,
                        {
                          naam:
                            event.target.value,
                        },
                      )
                    }
                    className="min-w-52 flex-1 rounded-xl border px-4 py-3 font-semibold"
                  />

                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() =>
                      verplaatsRuimte(
                        index,
                        -1,
                      )
                    }
                    className="rounded-xl border px-4 py-3 disabled:opacity-30"
                  >
                    Omhoog
                  </button>

                  <button
                    type="button"
                    disabled={
                      index ===
                      ruimten.length - 1
                    }
                    onClick={() =>
                      verplaatsRuimte(
                        index,
                        1,
                      )
                    }
                    className="rounded-xl border px-4 py-3 disabled:opacity-30"
                  >
                    Omlaag
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setRuimten(
                        ruimten.filter(
                          (item) =>
                            item.sleutel !==
                            ruimte.sleutel,
                        ),
                      )
                    }
                    className="rounded-xl border border-red-300 px-4 py-3 text-red-700"
                  >
                    Verwijderen
                  </button>
                </article>
              ),
            )}
          </div>
        </section>
      )}

      {stap === "inrichting" && (
        <div className="space-y-4">
          {ruimten.map(
            (ruimte, index) => {
              const open =
                openRuimte ===
                ruimte.sleutel;

              return (
                <article
                  key={ruimte.sleutel}
                  className="overflow-hidden rounded-2xl bg-white shadow"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenRuimte(
                        open
                          ? null
                          : ruimte.sleutel,
                      )
                    }
                    className="flex w-full justify-between p-6 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">
                        Routepositie{" "}
                        {index + 1}
                      </p>
                      <h3 className="text-xl font-bold">
                        {ruimte.naam}
                      </h3>
                    </div>
                    <span className="text-2xl">
                      {open ? "−" : "+"}
                    </span>
                  </button>

                  {open && (
                    <div className="space-y-6 border-t p-6">
                      {!ruimte.buiten && (
                        <select
                          value={
                            ruimte.verdieping ??
                            ""
                          }
                          onChange={(event) =>
                            wijzigRuimte(
                              ruimte.sleutel,
                              {
                                verdieping:
                                  event.target.value
                                    ? (event.target
                                        .value as VerdiepingNaam)
                                    : null,
                              },
                            )
                          }
                          className="w-full rounded-xl border px-4 py-3"
                        >
                          <option value="">
                            Geen verdieping
                          </option>
                          {VERDIEPINGEN.map(
                            (verdieping) => (
                              <option
                                key={
                                  verdieping.naam
                                }
                                value={
                                  verdieping.naam
                                }
                              >
                                {verdieping.naam}
                              </option>
                            ),
                          )}
                        </select>
                      )}

                      <input
                        value={
                          ruimte.routeInstructie
                        }
                        onChange={(event) =>
                          wijzigRuimte(
                            ruimte.sleutel,
                            {
                              routeInstructie:
                                event.target
                                  .value,
                            },
                          )
                        }
                        className="w-full rounded-xl border px-4 py-3"
                        placeholder="Route-instructie"
                      />

                      <div>
                        <h4 className="font-bold">
                          Gewenste controles
                        </h4>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {configuratie.definities
                            .filter(
                              (definitie) =>
                                !definitie.standaard_object_type,
                            )
                            .map(
                              (definitie) => (
                                <label
                                  key={
                                    definitie.id
                                  }
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
                              ),
                            )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold">
                          Aanwezige objecten
                        </h4>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {Object.values(
                            OBJECTEN,
                          ).map(
                            (object) => (
                              <label
                                key={
                                  object.code
                                }
                                className="flex gap-3 rounded-xl border p-4"
                              >
                                <input
                                  type="checkbox"
                                  checked={ruimte.objecten.some(
                                    (item) =>
                                      item.code ===
                                      object.code,
                                  )}
                                  onChange={() =>
                                    wisselObject(
                                      ruimte.sleutel,
                                      object,
                                    )
                                  }
                                />
                                {object.naam}
                              </label>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            },
          )}
        </div>
      )}

      {stap === "voorbeeld" && (
        <div className="space-y-4">
          {ruimten.map(
            (ruimte, index) => (
              <article
                key={ruimte.sleutel}
                className="rounded-2xl bg-white p-6 shadow"
              >
                <p className="text-sm font-semibold text-emerald-700">
                  Stap {index + 1} van{" "}
                  {ruimten.length}
                </p>
                <h3 className="text-2xl font-bold">
                  {ruimte.naam}
                </h3>
                <p className="mt-2 text-slate-600">
                  {ruimte.controles.length} controles ·{" "}
                  {ruimte.objecten.length} objecttypen
                </p>
              </article>
            ),
          )}

          <button
            type="button"
            disabled={bezig}
            onClick={slaRouteOp}
            className="w-full rounded-2xl bg-emerald-700 px-6 py-5 text-lg font-bold text-white disabled:opacity-50"
          >
            {bezig
              ? "Opslaan..."
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

        <span className="font-semibold">
          {ruimten.length} ruimte(n)
        </span>

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
