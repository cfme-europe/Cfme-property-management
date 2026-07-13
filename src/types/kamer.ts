export type Kamer = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  naam: string;
  verdieping: string | null;
  capaciteit: number;
  actief: boolean;
  opmerkingen: string | null;
};

export type KamerInvoer = {
  woning_id: number;
  naam: string;
  verdieping: string | null;
  capaciteit: number;
  actief: boolean;
  opmerkingen: string | null;
};
