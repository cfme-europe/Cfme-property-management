import type { JsonWaarde } from "@/types/maandrapportage";

export type RapportblokType =
  | "samenvatting"
  | "bewoners"
  | "inspecties"
  | "meldingen"
  | "meterstanden"
  | "energieverbruik"
  | "opmerkingen"
  | "vrije_tekst";

export type RapportDoelgroep =
  | "intern"
  | "extern"
  | "beide";

export type RapporttemplateDoelgroep =
  | "intern"
  | "extern";

export type RapporttemplateStatus =
  | "concept"
  | "actief"
  | "gearchiveerd";

export type RapporttemplateversieStatus =
  | "concept"
  | "actief"
  | "vervallen";

export type JsonObject = {
  [sleutel: string]: JsonWaarde;
};

export type Rapportblok = {
  id: number;
  created_at: string;
  updated_at: string;
  code: string;
  naam: string;
  omschrijving: string | null;
  bloktype: RapportblokType;
  doelgroep: RapportDoelgroep;
  standaard_zichtbaar: boolean;
  actief: boolean;
  configuratie: JsonObject;
};

export type RapportblokInvoer = {
  code: string;
  naam: string;
  omschrijving: string | null;
  bloktype: RapportblokType;
  doelgroep: RapportDoelgroep;
  standaard_zichtbaar: boolean;
  actief: boolean;
  configuratie: JsonObject;
};

export type Rapporttemplate = {
  id: number;
  created_at: string;
  updated_at: string;
  code: string;
  naam: string;
  omschrijving: string | null;
  doelgroep: RapporttemplateDoelgroep;
  status: RapporttemplateStatus;
  actief: boolean;
};

export type RapporttemplateInvoer = {
  code: string;
  naam: string;
  omschrijving: string | null;
  doelgroep: RapporttemplateDoelgroep;
  actief: boolean;
};

export type Rapporttemplateversie = {
  id: number;
  created_at: string;
  updated_at: string;
  template_id: number;
  versienummer: number;
  status: RapporttemplateversieStatus;
  geldig_vanaf: string | null;
  toelichting: string | null;
  configuratie: JsonObject;
};

export type RapporttemplateversieInvoer = {
  template_id: number;
  geldig_vanaf: string | null;
  toelichting: string | null;
  configuratie: JsonObject;
};

export type Rapporttemplateblok = {
  id: number;
  created_at: string;
  templateversie_id: number;
  rapportblok_id: number;
  volgorde: number;
  verplicht: boolean;
  zichtbaar: boolean;
  titel_override: string | null;
  configuratie: JsonObject;
};

export type RapporttemplateblokInvoer = {
  rapportblok_id: number;
  volgorde: number;
  verplicht: boolean;
  zichtbaar: boolean;
  titel_override: string | null;
  configuratie: JsonObject;
};

export type RapporttemplateblokMetBlok =
  Rapporttemplateblok & {
    rapportblok: Rapportblok;
  };

export type RapporttemplateversieMetBlokken =
  Rapporttemplateversie & {
    blokken: RapporttemplateblokMetBlok[];
  };

export type RapporttemplateMetVersies =
  Rapporttemplate & {
    versies: Rapporttemplateversie[];
  };

export type ActieveRapporttemplate = {
  template: Rapporttemplate;
  versie: RapporttemplateversieMetBlokken;
};