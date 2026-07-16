export type WoningDnaRisiconiveau =
  | "laag"
  | "middel"
  | "hoog"
  | "kritiek";

export type WoningDnaSnapshot = {
  id: number;
  created_at: string;
  woning_id: number;
  peildatum: string;
  inspecties_aantal: number;
  gemiddelde_orde_netheid: number | null;
  inspecties_met_schade: number;
  meldingen_open: number;
  meldingen_hoog_spoed: number;
  taken_open: number;
  taken_over_deadline: number;
  gemiddelde_controletijd_minuten: number | null;
  risicoscore: number;
  risiconiveau: WoningDnaRisiconiveau;
  sterke_punten: string[];
  aandachtspunten: string[];
  kenmerken: Record<string, unknown>;
  berekend_at: string;
};
