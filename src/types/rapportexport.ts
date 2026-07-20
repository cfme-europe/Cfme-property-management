import type { JsonWaarde } from "@/types/maandrapportage";

export type RapportexportFormaat =
  | "pdf"
  | "xlsx";

export type RapportexportStatus =
  | "aangemaakt"
  | "gereed"
  | "mislukt";

export type Rapportexport = {
  id: number;
  created_at: string;
  updated_at: string;
  maandrapportage_id: number;
  templateversie_id: number;
  exportformaat: RapportexportFormaat;
  status: RapportexportStatus;
  bestandsnaam: string;
  mime_type: string;
  gegenereerd_at: string | null;
  gegenereerd_door: string | null;
  foutmelding: string | null;
  metadata: Record<string, JsonWaarde>;
};

export type RapportexportStartInvoer = {
  maandrapportage_id: number;
  templateversie_id: number;
  exportformaat: RapportexportFormaat;
  bestandsnaam: string;
  mime_type: string;
  metadata?: Record<string, JsonWaarde>;
};
