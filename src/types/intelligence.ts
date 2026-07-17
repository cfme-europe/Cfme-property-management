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

export type ControlebriefingStatus =
  | "concept"
  | "actief"
  | "vervangen"
  | "vervallen";

export type IntelligenceWerkpuntPrioriteit =
  | "laag"
  | "normaal"
  | "hoog"
  | "spoed";

export type IntelligenceWerkpuntStatus =
  | "concept"
  | "actief"
  | "opgevolgd"
  | "vervallen"
  | "genegeerd";

export type Controlebriefing = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  controlesessie_id: number | null;
  peildatum: string;
  geldig_tot: string | null;
  status: ControlebriefingStatus;
  risicoscore: number;
  risiconiveau: WoningDnaRisiconiveau;
  samenvatting: string;
  advies: string | null;
  bronnen: unknown[];
  kenmerken: Record<string, unknown>;
  gegenereerd_at: string;
};

export type IntelligenceWerkpunt = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  controlebriefing_id: number | null;
  controlesessie_id: number | null;
  bron_type: string;
  bron_id: number | null;
  categorie: string;
  prioriteit: IntelligenceWerkpuntPrioriteit;
  status: IntelligenceWerkpuntStatus;
  titel: string;
  omschrijving: string;
  waarschijnlijkheid: number | null;
  deduplicatie_sleutel: string;
  intern: true;
  details: Record<string, unknown>;
  geactiveerd_at: string | null;
  opgevolgd_at: string | null;
};

export type ControlebriefingMetWerkpunten = {
  briefing: Controlebriefing;
  werkpunten: IntelligenceWerkpunt[];
};
