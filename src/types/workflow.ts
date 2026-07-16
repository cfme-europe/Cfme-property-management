export type WorkflowStatus =
  | "nieuw"
  | "verwerken"
  | "verwerkt"
  | "mislukt"
  | "genegeerd";

export type WorkflowPrioriteit =
  | "laag"
  | "normaal"
  | "hoog"
  | "spoed";

export type WorkflowActieStatus =
  | "gepland"
  | "uitgevoerd"
  | "mislukt"
  | "overgeslagen";

export type WorkflowJson =
  | string
  | number
  | boolean
  | null
  | WorkflowJson[]
  | { [sleutel: string]: WorkflowJson };

export type WorkflowGebeurtenis = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number | null;
  controlesessie_id: number | null;
  gebeurtenis_type: string;
  bron_type: string;
  bron_id: number | null;
  status: WorkflowStatus;
  prioriteit: WorkflowPrioriteit;
  deduplicatie_sleutel: string;
  payload: Record<string, WorkflowJson>;
  verwerkt_at: string | null;
  foutmelding: string | null;
};

export type WorkflowGebeurtenisInvoer = {
  woning_id: number | null;
  controlesessie_id: number | null;
  gebeurtenis_type: string;
  bron_type: string;
  bron_id: number | null;
  prioriteit: WorkflowPrioriteit;
  deduplicatie_sleutel: string;
  payload?: Record<string, WorkflowJson>;
};

export type WorkflowActie = {
  id: number;
  created_at: string;
  updated_at: string;
  gebeurtenis_id: number;
  taak_id: number | null;
  actie_type: string;
  status: WorkflowActieStatus;
  resultaat: Record<string, WorkflowJson>;
  uitgevoerd_at: string | null;
  foutmelding: string | null;
};
