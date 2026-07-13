export type InspectieType =
  | "begininspectie"
  | "periodiek"
  | "eindinspectie"
  | "incident";

export type InspectieStatus =
  | "open"
  | "afgerond";

export type AlgemeneToestand =
  | "goed"
  | "aandacht_nodig"
  | "slecht";

export type Inspectie = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  verhuurperiode_id: number | null;
  type: InspectieType;
  inspectiedatum: string;
  status: InspectieStatus;
  algemene_toestand: AlgemeneToestand;
  orde_netheid_score: number;
  schade_aanwezig: boolean;
  schade_omschrijving: string | null;
  uitgevoerd_door: string | null;
  opmerkingen: string | null;
  afgerond_at: string | null;
};

export type InspectieInvoer = {
  woning_id: number;
  verhuurperiode_id: number | null;
  type: InspectieType;
  inspectiedatum: string;
  status: InspectieStatus;
  algemene_toestand: AlgemeneToestand;
  orde_netheid_score: number;
  schade_aanwezig: boolean;
  schade_omschrijving: string | null;
  uitgevoerd_door: string | null;
  opmerkingen: string | null;
};
