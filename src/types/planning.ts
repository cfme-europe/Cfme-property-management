export type ProfielSamenvatting = {
  id: string;
  email: string | null;
  volledige_naam: string | null;
  rol:
    | "admin"
    | "medewerker"
    | "planner"
    | "controleur"
    | "administratie"
    | "management"
    | "lezen";
  actief: boolean;
};

export type Rayon = {
  id: number;
  created_at: string;
  updated_at: string;
  naam: string;
  code: string;
  omschrijving: string | null;
  standaard_controleur_id: string | null;
  standaard_controlefrequentie_dagen: number;
  actief: boolean;
};

export type WoningRayonToewijzing = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  rayon_id: number;
  standaard_controleur_id: string | null;
  controlefrequentie_dagen: number | null;
  geldig_vanaf: string;
  geldig_tot: string | null;
  actief: boolean;
  reden: string | null;
  opmerkingen: string | null;
};

export type ActieveWoningplanning = {
  woning_id: number;
  rayon_id: number;
  rayon_naam: string;
  rayon_code: string;
  controleur_id: string | null;
  controleur_naam: string | null;
  controleur_email: string | null;
  controlefrequentie_dagen: number;
  geldig_vanaf: string;
};

export type RayonInvoer = {
  naam: string;
  code: string;
  omschrijving: string | null;
  standaard_controleur_id: string | null;
  standaard_controlefrequentie_dagen: number;
  actief: boolean;
};

export type WoningRayonToewijzingInvoer = {
  woning_id: number;
  rayon_id: number;
  standaard_controleur_id: string | null;
  controlefrequentie_dagen: number | null;
  geldig_vanaf: string;
  reden: string | null;
  opmerkingen: string | null;
};
