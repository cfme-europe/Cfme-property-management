export type CertificeringType =
  | "scope"
  | "brandblusser"
  | "cv"
  | "rookmelder"
  | "overig";

export type CertificeringStatus =
  | "geldig"
  | "verloopt_binnenkort"
  | "verlopen"
  | "ingetrokken";

export type Certificering = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  object_id: number | null;
  object_naam: string | null;
  object_type: string | null;
  objectnummer: string | null;
  ruimte_id: number | null;
  ruimte_naam: string | null;
  type: CertificeringType;
  naam: string;
  installatie_omschrijving: string | null;
  certificaatnummer: string | null;
  keuringsinstantie: string | null;
  keuringsdatum: string;
  geldig_tot: string;
  waarschuwingsdagen: number;
  actief: boolean;
  ingetrokken_op: string | null;
  reden_inhouding: string | null;
  opmerkingen: string | null;
  aangemaakt_door: string | null;
  gewijzigd_door: string | null;
  compliance_status: CertificeringStatus;
  resterende_dagen: number;
};

export type CertificeringInvoer = {
  woning_id: number;
  object_id: number | null;
  type: CertificeringType;
  naam: string;
  installatie_omschrijving: string | null;
  certificaatnummer: string | null;
  keuringsinstantie: string | null;
  keuringsdatum: string;
  geldig_tot: string;
  waarschuwingsdagen: number;
  actief: boolean;
  ingetrokken_op: string | null;
  reden_inhouding: string | null;
  opmerkingen: string | null;
};
