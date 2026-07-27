export type ComplianceStatus =
  | "compliant"
  | "waarschuwing"
  | "verlopen"
  | "ontbreekt"
  | "onvolledig"
  | "onbekend";

export type ComplianceVerplichtingType =
  | "certificering"
  | "document";

export type ComplianceObjectOptie = {
  id: number;
  woning_id: number;
  ruimte_id: number;
  ruimte_naam: string;
  object_type: string;
  naam: string;
  objectnummer: string | null;
  merk: string | null;
  model: string | null;
  serienummer: string | null;
};

export type ObjectComplianceRegel = {
  object_id: number;
  woning_id: number;
  ruimte_id: number;
  ruimte_naam: string;
  object_type: string;
  object_naam: string;
  objectnummer: string | null;
  merk: string | null;
  model: string | null;
  serienummer: string | null;
  verplichting_id: number;
  verplichting_naam: string;
  verplichting_omschrijving: string | null;
  verplichting_type: ComplianceVerplichtingType;
  certificering_type: string | null;
  document_type: string | null;
  waarschuwingsdagen: number;
  verplicht: boolean;
  certificering_id: number | null;
  geldig_tot: string | null;
  certificering_actief: boolean | null;
  certificering_status: string | null;
  document_id: number | null;
  document_status: string | null;
  laatste_versie_id: number | null;
  laatste_versie_created_at: string | null;
  compliance_status: ComplianceStatus;
  resterende_dagen: number | null;
};

export type WoningComplianceSamenvatting = {
  woning_id: number;
  aantal_verplichtingen: number;
  compliant: number;
  waarschuwingen: number;
  verlopen: number;
  ontbrekend: number;
  compliance_status:
    | "compliant"
    | "aandacht"
    | "niet_compliant";
};


export type ComplianceWerkpunt = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  object_id: number;
  ruimte_id: number;
  ruimte_naam: string;
  object_type: string;
  object_naam: string;
  objectnummer: string | null;
  verplichting_id: number;
  verplichting_naam: string;
  verplichting_type: ComplianceVerplichtingType;
  certificering_type: string | null;
  document_type: string | null;
  titel: string;
  omschrijving: string | null;
  bron_status:
    | "waarschuwing"
    | "verlopen"
    | "ontbreekt"
    | "onvolledig";
  prioriteit:
    | "laag"
    | "normaal"
    | "hoog"
    | "spoed";
  status:
    | "open"
    | "opgelost"
    | "genegeerd";
  deadline: string | null;
  opgelost_op: string | null;
  genegeerd_op: string | null;
  taak_id: number | null;
  taak_status: string | null;
  taak_deadline: string | null;
};
