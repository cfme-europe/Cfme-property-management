export type Gebruikersrol =
  | "admin"
  | "medewerker"
  | "planner"
  | "controleur"
  | "administratie"
  | "management"
  | "lezen";

export type Gebruikersprofiel = {
  id: string;
  created_at: string;
  updated_at: string;
  email: string | null;
  volledige_naam: string | null;
  rol: Gebruikersrol;
  actief: boolean;
};
