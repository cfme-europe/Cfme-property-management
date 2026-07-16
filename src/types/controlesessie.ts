export type ControlesessieStatus =
  | "gepland"
  | "bezig"
  | "afgerond"
  | "geannuleerd";

export type LocatieStatus =
  | "niet_geprobeerd"
  | "beschikbaar"
  | "niet_beschikbaar"
  | "toestemming_geweigerd"
  | "fout";

export type Controlesessie = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  inspectie_id: number | null;
  controleur_id: string | null;
  status: ControlesessieStatus;
  gepland_voor: string | null;
  gestart_at: string | null;
  afgerond_at: string | null;
  gemiddelde_controletijd_minuten: number | null;
  locatie_status: LocatieStatus;
  start_latitude: number | null;
  start_longitude: number | null;
  start_nauwkeurigheid_meter: number | null;
  start_afstand_tot_woning_meter: number | null;
  opmerkingen: string | null;
};

export type ControlesessieInvoer = {
  woning_id: number;
  inspectie_id: number | null;
  controleur_id: string | null;
  status: ControlesessieStatus;
  gepland_voor: string | null;
  gemiddelde_controletijd_minuten: number | null;
  locatie_status: LocatieStatus;
  start_latitude: number | null;
  start_longitude: number | null;
  start_nauwkeurigheid_meter: number | null;
  start_afstand_tot_woning_meter: number | null;
  opmerkingen: string | null;
};

export type ControlesessieLocatieInvoer = {
  locatie_status: LocatieStatus;
  start_latitude: number | null;
  start_longitude: number | null;
  start_nauwkeurigheid_meter: number | null;
  start_afstand_tot_woning_meter: number | null;
};
