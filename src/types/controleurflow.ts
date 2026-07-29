export const CONTROLE_RESULTATEN = [
  "goed",
  "voldoende",
  "onvoldoende",
  "niet_aanwezig",
  "niet_van_toepassing",
  "niet_bereikbaar",
  "niet_afleesbaar",
  "defect",
  "overgeslagen",
] as const;

export type ControleResultaatWaarde =
  (typeof CONTROLE_RESULTATEN)[number];

export const GEBREK_TYPEN = [
  "vervuiling",
  "beschadiging",
  "defect",
  "lekkage",
  "schimmel",
  "veiligheidsrisico",
  "ontbreekt",
  "niet_bereikbaar",
  "verkeerd_gebruik",
  "normale_slijtage",
  "keuring_verlopen",
  "oorzaak_onbekend",
  "overig",
] as const;

export type GebrekType = (typeof GEBREK_TYPEN)[number];

export const AFWIJKING_URGENTIES = [
  "laag",
  "normaal",
  "hoog",
  "spoed",
] as const;

export type AfwijkingUrgentie =
  (typeof AFWIJKING_URGENTIES)[number];

export type ControleurRoutepunt = {
  woning_controlepunt_id: number;
  woning_id: number;
  ruimte_id: number;
  ruimte_naam: string;
  ruimte_type: string;
  ruimte_volgorde: number;
  route_instructie: string | null;
  object_id: number | null;
  object_naam: string | null;
  object_type: string | null;
  object_volgorde: number | null;
  objectnummer: string | null;
  controlepunt_naam: string;
  controlepunt_omschrijving: string | null;
  controlepunt_volgorde: number;
  verplicht: boolean;
  invoertype: string;
  categorie: string;
  foto_verplicht_bij_afwijking: boolean;
  toelichting_verplicht_bij_afwijking: boolean;
  standaard_prioriteit: AfwijkingUrgentie;
};

export type ControleResultaat = {
  id: number;
  controlesessie_id: number;
  inspectie_id: number | null;
  woning_id: number;
  ruimte_id: number;
  object_id: number | null;
  woning_controlepunt_id: number;
  resultaat: ControleResultaatWaarde;
  numerieke_waarde: number | null;
  tekstwaarde: string | null;
  datumwaarde: string | null;
  ruimte_naam_snapshot: string;
  object_naam_snapshot: string | null;
  controlepunt_naam_snapshot: string;
  beoordeeld_at: string;
  beoordeeld_door: string | null;
  opmerkingen: string | null;
};

export type RuimteAkkoordResultaat = {
  controle_resultaat_id: number;
  woning_controlepunt_id: number;
};

export type ControleAfwijking = {
  id: number;
  controle_resultaat_id: number;
  woning_id: number;
  inspectie_id: number | null;
  controlesessie_id: number;
  gebrek_type: GebrekType;
  toelichting: string;
  urgentie: AfwijkingUrgentie;
  opvolging_nodig: boolean;
  melding_maken: boolean;
  taak_maken: boolean;
  status: string;
};

export type ControleurFlowGegevens = {
  sessie: {
    id: number;
    woning_id: number;
    inspectie_id: number | null;
    controleur_id: string | null;
    status: string;
    gestart_at: string | null;
    locatie_status: string;
  };
  woning: {
    id: number;
    dossiernummer: string;
    adres: string;
    postcode: string;
    plaats: string;
  };
  route: ControleurRoutepunt[];
  resultaten: ControleResultaat[];
  afwijkingen: ControleAfwijking[];
  bewoners_aantal: number;
  correctiewaarschuwingen: string[];
  laatste_meterstand: {
    dagstroom_kwh: number | null;
    nachtstroom_kwh: number | null;
    gas_m3: number | null;
    water_m3: number | null;
  } | null;
};
