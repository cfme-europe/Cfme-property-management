export type ControleAfwijkingStatus =
  | "open"
  | "in_opvolging"
  | "opgelost"
  | "geaccepteerd"
  | "niet_relevant";

export type FactuurOntvanger =
  | "cfme"
  | "hurend_bedrijf"
  | "eigenaar"
  | "nog_te_bepalen";

export type HerstelbewijsStatus =
  | "niet_vereist"
  | "vereist"
  | "aangeleverd"
  | "goedgekeurd"
  | "afgekeurd";

export type ControleAfwijkingBeheer = {
  id: number;
  created_at: string;
  woning_id: number;
  inspectie_id: number | null;
  controlesessie_id: number;
  gebrek_type: string;
  toelichting: string;
  urgentie: "laag" | "normaal" | "hoog" | "spoed";
  status: ControleAfwijkingStatus;
  melding_id: number | null;
  taak_id: number | null;
  verantwoordelijke: string | null;
  deadline: string | null;
  hercontrole_nodig: boolean;
  hercontrole_voor: string | null;
  herstelbewijs_verplicht: boolean;
  herstelbewijs_omschrijving: string | null;
  herstelbewijs_status: HerstelbewijsStatus;
  herstelbewijs_beoordeeld_at: string | null;
  herstelbewijs_beoordeeld_door: string | null;
  herstelbewijs_aantal: number;
  melding_status: string | null;
  taak_status: string | null;
  taak_deadline: string | null;
  doorlooptijd_dagen: number;
  over_deadline: boolean;
  terugkeer_aantal: number;
  opgelost_at: string | null;
  oplossing: string | null;
  geschatte_kosten: number | null;
  werkelijke_kosten: number | null;
  factuur_naar: FactuurOntvanger | null;
  financieel_gevolg: string | null;
  operationeel_gevolg: string | null;
  resultaat: {
    ruimte_naam_snapshot: string;
    object_naam_snapshot: string | null;
    controlepunt_naam_snapshot: string;
  } | null;
};

export type ControleAfwijkingBeheerInvoer = {
  status: ControleAfwijkingStatus;
  verantwoordelijke: string | null;
  deadline: string | null;
  hercontrole_nodig: boolean;
  hercontrole_voor: string | null;
  herstelbewijs_verplicht: boolean;
  herstelbewijs_omschrijving: string | null;
  herstelbewijs_status: HerstelbewijsStatus;
  oplossing: string | null;
  geschatte_kosten: number | null;
  werkelijke_kosten: number | null;
  factuur_naar: FactuurOntvanger;
  financieel_gevolg: string | null;
  operationeel_gevolg: string | null;
};
