export type OpvolgBronType = "afwijking" | "melding" | "taak";

export type OpvolgStatus =
  | "open"
  | "in_behandeling"
  | "afgehandeld"
  | "niet_relevant";

export type OpvolgItem = {
  sleutel: string;
  bron_type: OpvolgBronType;
  bron_id: number;
  woning_id: number;
  titel: string;
  omschrijving: string;
  categorie: string;
  prioriteit: "laag" | "normaal" | "hoog" | "spoed";
  status: OpvolgStatus;
  aangemaakt_op: string;
  verantwoordelijke: string | null;
  deadline: string | null;
  oplossing: string | null;
  inspectie_id: number | null;
  afwijking_id: number | null;
  melding_id: number | null;
  taak_ids: number[];
  bewijs_aantal: number;
};

export type OpvolgItemInvoer = {
  status: OpvolgStatus;
  verantwoordelijke: string | null;
  deadline: string | null;
  oplossing: string | null;
};
