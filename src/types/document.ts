export type DocumentType =
  | "contract"
  | "certificering"
  | "keuring"
  | "inspectie"
  | "verzekering"
  | "factuur"
  | "rapportage"
  | "handleiding"
  | "identificatie"
  | "overig";

export type DocumentStatus =
  | "actief"
  | "gearchiveerd";

export type DocumentVertrouwelijkheid =
  | "intern"
  | "vertrouwelijk"
  | "extern_geschikt";

export type DocumentOverzicht = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  titel: string;
  document_type: DocumentType;
  omschrijving: string | null;
  status: DocumentStatus;
  vertrouwelijkheid: DocumentVertrouwelijkheid;
  gearchiveerd_op: string | null;
  archiefreden: string | null;
  aangemaakt_door: string | null;
  gewijzigd_door: string | null;
  laatste_versie_id: number | null;
  laatste_versienummer: number | null;
  laatste_versie_created_at: string | null;
  laatste_bestandspad: string | null;
  laatste_bestandsnaam: string | null;
  laatste_mime_type: string | null;
  laatste_bestandsgrootte: number | null;
  laatste_versie_opmerking: string | null;
  aantal_versies: number;
};

export type DocumentVersie = {
  id: number;
  created_at: string;
  document_id: number;
  versienummer: number;
  bestandspad: string;
  bestandsnaam: string;
  mime_type: string;
  bestandsgrootte: number;
  versie_opmerking: string | null;
  geupload_door: string | null;
};
