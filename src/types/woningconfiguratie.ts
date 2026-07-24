export const RUIMTE_TYPEN = [
  "toegangsdeur",
  "hal",
  "gang",
  "overloop",
  "trap",
  "woonkamer",
  "slaapkamer",
  "keuken",
  "badkamer",
  "toilet",
  "berging",
  "zolder",
  "kelder",
  "technische_ruimte",
  "buitenruimte",
  "overig",
] as const;

export type RuimteType = (typeof RUIMTE_TYPEN)[number];

export const CONTROLEPUNT_CATEGORIEEN = [
  "algemeen",
  "netheid",
  "conditie",
  "veiligheid",
  "brandveiligheid",
  "installatie",
  "sanitair",
  "ventilatie",
  "energie",
  "bezetting",
  "schade",
  "overig",
] as const;

export type ControlepuntCategorie =
  (typeof CONTROLEPUNT_CATEGORIEEN)[number];

export const CONTROLEPUNT_INVOERTYPEN = [
  "beoordeling",
  "ja_nee",
  "getal",
  "tekst",
  "datum",
] as const;

export type ControlepuntInvoertype =
  (typeof CONTROLEPUNT_INVOERTYPEN)[number];

export const CONTROLEPUNT_PRIORITEITEN = [
  "laag",
  "normaal",
  "hoog",
  "spoed",
] as const;

export type ControlepuntPrioriteit =
  (typeof CONTROLEPUNT_PRIORITEITEN)[number];

export type WoningVerdieping = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  naam: string;
  niveau: number;
  loopvolgorde: number;
  actief: boolean;
  opmerkingen: string | null;
};

export type WoningVerdiepingInvoer = {
  woning_id: number;
  naam: string;
  niveau: number;
  loopvolgorde: number;
  actief: boolean;
  opmerkingen?: string | null;
};

export type WoningRuimte = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  verdieping_id: number | null;
  kamer_id: number | null;
  naam: string;
  ruimte_type: RuimteType;
  loopvolgorde: number;
  actief: boolean;
  controle_verplicht: boolean;
  omschrijving: string | null;
  route_instructie: string | null;
  opmerkingen: string | null;
};

export type WoningRuimteInvoer = {
  woning_id: number;
  verdieping_id?: number | null;
  kamer_id?: number | null;
  naam: string;
  ruimte_type: RuimteType;
  loopvolgorde: number;
  actief: boolean;
  controle_verplicht: boolean;
  omschrijving?: string | null;
  route_instructie?: string | null;
  opmerkingen?: string | null;
};

export type WoningObject = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  ruimte_id: number;
  object_type: string;
  naam: string;
  objectnummer: string | null;
  merk: string | null;
  model: string | null;
  serienummer: string | null;
  loopvolgorde: number;
  actief: boolean;
  controle_verplicht: boolean;
  geplaatst_op: string | null;
  vervangen_op: string | null;
  opmerkingen: string | null;
};

export type WoningObjectInvoer = {
  woning_id: number;
  ruimte_id: number;
  object_type: string;
  naam: string;
  objectnummer?: string | null;
  merk?: string | null;
  model?: string | null;
  serienummer?: string | null;
  loopvolgorde: number;
  actief: boolean;
  controle_verplicht: boolean;
  geplaatst_op?: string | null;
  vervangen_op?: string | null;
  opmerkingen?: string | null;
};

export type ControlepuntDefinitie = {
  id: number;
  created_at: string;
  updated_at: string;
  code: string;
  naam: string;
  omschrijving: string | null;
  categorie: ControlepuntCategorie;
  standaard_ruimte_type: string | null;
  standaard_object_type: string | null;
  invoertype: ControlepuntInvoertype;
  actief: boolean;
  foto_verplicht_bij_afwijking: boolean;
  toelichting_verplicht_bij_afwijking: boolean;
  melding_maken_bij_afwijking: boolean;
  taak_maken_bij_afwijking: boolean;
  standaard_prioriteit: ControlepuntPrioriteit;
};

export type WoningControlepunt = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  ruimte_id: number;
  object_id: number | null;
  definitie_id: number;
  naam_override: string | null;
  omschrijving_override: string | null;
  loopvolgorde: number;
  verplicht: boolean;
  actief: boolean;
  foto_verplicht_bij_afwijking: boolean | null;
  toelichting_verplicht_bij_afwijking: boolean | null;
  melding_maken_bij_afwijking: boolean | null;
  taak_maken_bij_afwijking: boolean | null;
  opmerkingen: string | null;
  definitie: ControlepuntDefinitie | null;
};

export type WoningControlepuntInvoer = {
  woning_id: number;
  ruimte_id: number;
  object_id?: number | null;
  definitie_id: number;
  naam_override?: string | null;
  omschrijving_override?: string | null;
  loopvolgorde: number;
  verplicht: boolean;
  actief: boolean;
  foto_verplicht_bij_afwijking?: boolean | null;
  toelichting_verplicht_bij_afwijking?: boolean | null;
  melding_maken_bij_afwijking?: boolean | null;
  taak_maken_bij_afwijking?: boolean | null;
  opmerkingen?: string | null;
};

export type WoningConfiguratie = {
  verdiepingen: WoningVerdieping[];
  ruimten: WoningRuimte[];
  objecten: WoningObject[];
  controlepunten: WoningControlepunt[];
  definities: ControlepuntDefinitie[];
};
