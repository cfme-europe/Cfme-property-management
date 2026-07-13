export type JsonWaarde =
  | string
  | number
  | boolean
  | null
  | JsonWaarde[]
  | { [sleutel: string]: JsonWaarde };

export type MaandrapportageStatus =
  | "concept"
  | "definitief"
  | "verzonden";

export type Maandrapportage = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  verhuurperiode_id: number | null;
  rapportjaar: number;
  rapportmaand: number;
  titel: string;
  status: MaandrapportageStatus;
  ontvanger_naam: string | null;
  ontvanger_email: string | null;
  opmerkingen: string | null;
  rapport_data: { [sleutel: string]: JsonWaarde };
  gegenereerd_at: string | null;
  verzonden_at: string | null;
};

export type MaandrapportageInvoer = {
  woning_id: number;
  verhuurperiode_id: number | null;
  rapportjaar: number;
  rapportmaand: number;
  titel: string;
  status: MaandrapportageStatus;
  ontvanger_naam: string | null;
  ontvanger_email: string | null;
  opmerkingen: string | null;
  rapport_data: { [sleutel: string]: JsonWaarde };
};
