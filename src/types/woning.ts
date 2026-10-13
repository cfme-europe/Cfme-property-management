export type WoningStatus = "actief" | "gearchiveerd";

export type Woning = {
  id: number;
  created_at: string;
  dossiernummer: string;
  adres: string;
  postcode: string;
  plaats: string;
  status: WoningStatus;
  gearchiveerd_op: string | null;
  archiefreden: string | null;
  gearchiveerd_door: string | null;
  gearchiveerd_door_naam: string | null;
};
