export type PredictiveSignaalType =
  | "lekkagerisico"
  | "terugkerende_schade"
  | "verhoogd_energieverbruik"
  | "ongebruikelijke_controletijd"
  | "verslechterende_woningconditie"
  | "onderhoudsbehoefte"
  | "prioriteit_hercontrole";

export type PredictiveSignaalNiveau =
  | "laag"
  | "middel"
  | "hoog"
  | "kritiek";

export type PredictiveBetrouwbaarheid =
  | "onvoldoende"
  | "beperkt"
  | "redelijk"
  | "hoog";

export type PredictiveBewijs = {
  bron: string;
  omschrijving: string;
  aantal_waarnemingen: number;
  periode_vanaf: string | null;
  periode_tot_en_met: string | null;
};

export type PredictiveSignaal = {
  type: PredictiveSignaalType;
  titel: string;
  niveau: PredictiveSignaalNiveau;
  score: number;
  waarschijnlijkheid_percentage: number | null;
  betrouwbaarheid: PredictiveBetrouwbaarheid;
  datadekking_percentage: number;
  voldoende_historie: boolean;
  onzekerheid: string;
  berekening: string;
  signaal: string;
  advies: string;
  bewijzen: PredictiveBewijs[];
  geen_feitelijke_conclusie: true;
};

export type PredictiveWoning = {
  woning_id: number;
  adres: string;
  postcode: string;
  plaats: string;
  prioriteit_score: number;
  hoogste_niveau: PredictiveSignaalNiveau;
  voldoende_historie: boolean;
  signalen: PredictiveSignaal[];
};

export type PredictiveIntelligenceSamenvatting = {
  woningen_geanalyseerd: number;
  woningen_met_signalen: number;
  woningen_onvoldoende_historie: number;
  kritieke_signalen: number;
  hoge_signalen: number;
  hercontroles_met_prioriteit: number;
};

export type PredictiveIntelligenceResultaat = {
  gegenereerd_op: string;
  modelversie: 1;
  uitgangspunt: string;
  samenvatting: PredictiveIntelligenceSamenvatting;
  woningen: PredictiveWoning[];
};
