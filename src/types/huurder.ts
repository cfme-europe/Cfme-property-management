export type HuurderDocumentType =
  | "identiteitskaart"
  | "paspoort"
  | "verblijfsdocument"
  | "overig";

export type Huurder = {
  id: number;
  created_at: string;
  updated_at: string;
  verhuurperiode_id: number;
  voornaam: string;
  tussenvoegsel: string | null;
  achternaam: string;
  geboortedatum: string | null;
  nationaliteit: string | null;
  telefoon: string | null;
  email: string | null;
  document_type: HuurderDocumentType | null;
  documentnummer: string | null;
  opmerkingen: string | null;
};

export type HuurderInvoer = {
  verhuurperiode_id: number;
  voornaam: string;
  tussenvoegsel: string | null;
  achternaam: string;
  geboortedatum: string | null;
  nationaliteit: string | null;
  telefoon: string | null;
  email: string | null;
  document_type: HuurderDocumentType | null;
  documentnummer: string | null;
  opmerkingen: string | null;
};
