export type PlanningStatus =
  | "niet_ingepland"
  | "geen_controleur"
  | "achterstallig"
  | "vandaag"
  | "binnen_7_dagen"
  | "binnen_14_dagen"
  | "op_schema";

export type WoningPlanningIntelligence = {
  woning_id: number;
  adres: string;
  postcode: string;
  plaats: string;
  toewijzing_id: number | null;
  rayon_id: number | null;
  rayon_naam: string | null;
  rayon_code: string | null;
  controleur_id: string | null;
  controleur_naam: string | null;
  controleur_email: string | null;
  controlefrequentie_dagen: number | null;
  geldig_vanaf: string | null;
  laatste_controle_op: string | null;
  volgende_controle_op: string | null;
  dagen_tot_controle: number | null;
  planning_status: PlanningStatus;
  planning_prioriteit: number;
};

export type RayonPlanningSamenvatting = {
  rayon_id: number;
  rayon_naam: string;
  rayon_code: string;
  standaard_controleur_id: string | null;
  aantal_woningen: number;
  achterstallig: number;
  vandaag: number;
  binnen_7_dagen: number;
  binnen_14_dagen: number;
  zonder_controleur: number;
  werkvoorraad_7_dagen: number;
};

export type ControleurPlanningSamenvatting = {
  controleur_id: string;
  controleur_naam: string | null;
  controleur_email: string | null;
  aantal_woningen: number;
  achterstallig: number;
  vandaag: number;
  binnen_7_dagen: number;
  binnen_14_dagen: number;
  werkvoorraad_7_dagen: number;
};

export type PlanningIntelligenceSamenvatting = {
  aantal_woningen: number;
  niet_ingepland: number;
  zonder_controleur: number;
  achterstallig: number;
  vandaag: number;
  binnen_7_dagen: number;
  binnen_14_dagen: number;
  op_schema: number;
};
