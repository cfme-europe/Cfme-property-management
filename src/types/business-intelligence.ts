import type {
  DashboardEnergieAfwijking,
  DashboardMelding,
  DashboardTaak,
  DashboardWoningRisico,
} from "@/services/dashboard";
import type {
  PlanningStatus,
  WoningPlanningIntelligence,
} from "@/types/planning-intelligence";

export type CockpitWoning = {
  id: number;
  adres: string;
  postcode: string;
  plaats: string;
};

export type CockpitAandachtspunt = {
  woning: CockpitWoning;
  urgentie: "kritiek" | "hoog" | "normaal";
  score: number;
  oorzaken: string[];
};

export type CockpitOverbezetting = {
  woning: CockpitWoning;
  bewoners: number;
  capaciteit: number;
  overschrijding: number;
};

export type CockpitRapportage = {
  id: number;
  woning_id: number;
  titel: string;
  status: string;
  rapportjaar: number;
  rapportmaand: number;
  ontvanger_naam: string | null;
  woning: CockpitWoning | null;
  achterstallig: boolean;
};

export type CockpitKosten = {
  totaal: number;
  registraties: number;
};

export type BusinessIntelligenceCockpit = {
  kpis: {
    controles_vandaag: number;
    woningen_met_aandacht: number;
    energie_afwijkingen: number;
    open_spoedmeldingen: number;
    achterstallige_taken: number;
    overbezette_woningen: number;
    verlopen_compliance: number;
    kosten_totaal: number;
    rapportages_gereed: number;
    rapportages_achterstallig: number;
  };
  planning: WoningPlanningIntelligence[];
  aandachtspunten: CockpitAandachtspunt[];
  spoedmeldingen: DashboardMelding[];
  achterstalligeTaken: DashboardTaak[];
  energieAfwijkingen: DashboardEnergieAfwijking[];
  woningRisicos: DashboardWoningRisico[];
  overbezetting: CockpitOverbezetting[];
  rapportages: CockpitRapportage[];
  kosten: CockpitKosten;
};

export const PLANNING_STATUS_LABELS: Record<
  PlanningStatus,
  string
> = {
  niet_ingepland: "Niet ingepland",
  geen_controleur: "Geen controleur",
  achterstallig: "Achterstallig",
  vandaag: "Vandaag",
  binnen_7_dagen: "Binnen 7 dagen",
  binnen_14_dagen: "Binnen 14 dagen",
  op_schema: "Op schema",
};
