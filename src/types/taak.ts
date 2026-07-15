export type TaakCategorie =
  | "inspectie"
  | "schade"
  | "onderhoud"
  | "veiligheid"
  | "schoonmaak"
  | "installatie"
  | "administratie"
  | "overig";

export type TaakPrioriteit =
  | "laag"
  | "normaal"
  | "hoog"
  | "spoed";

export type TaakStatus =
  | "open"
  | "in_behandeling"
  | "afgerond"
  | "geannuleerd";

export type Taak = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  inspectie_id: number | null;
  melding_id: number | null;
  titel: string;
  omschrijving: string | null;
  categorie: TaakCategorie;
  prioriteit: TaakPrioriteit;
  status: TaakStatus;
  startdatum: string | null;
  deadline: string | null;
  afgerond_op: string | null;
  toegewezen_aan: string | null;
  externe_referentie: string | null;
  opmerkingen: string | null;
};

export type TaakInvoer = {
  woning_id: number;
  inspectie_id: number | null;
  melding_id: number | null;
  titel: string;
  omschrijving: string | null;
  categorie: TaakCategorie;
  prioriteit: TaakPrioriteit;
  status: TaakStatus;
  startdatum: string | null;
  deadline: string | null;
  afgerond_op: string | null;
  toegewezen_aan: string | null;
  externe_referentie: string | null;
  opmerkingen: string | null;
};
