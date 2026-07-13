export type MeldingCategorie =
  | "schade"
  | "onderhoud"
  | "veiligheid"
  | "schoonmaak"
  | "installatie"
  | "overig";

export type MeldingPrioriteit =
  | "laag"
  | "normaal"
  | "hoog"
  | "spoed";

export type MeldingStatus =
  | "open"
  | "in_behandeling"
  | "opgelost";

export type FactuurOntvanger =
  | "cfme"
  | "hurend_bedrijf"
  | "eigenaar"
  | "nog_te_bepalen";

export type Melding = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  inspectie_id: number | null;
  titel: string;
  omschrijving: string;
  categorie: MeldingCategorie;
  prioriteit: MeldingPrioriteit;
  status: MeldingStatus;
  melddatum: string;
  oplosdatum: string | null;
  verantwoordelijke: string | null;
  oplossing: string | null;
  factuur_naar: FactuurOntvanger | null;
  extern_referentienummer: string | null;
  opmerkingen: string | null;
};

export type MeldingInvoer = {
  woning_id: number;
  inspectie_id: number | null;
  titel: string;
  omschrijving: string;
  categorie: MeldingCategorie;
  prioriteit: MeldingPrioriteit;
  status: MeldingStatus;
  melddatum: string;
  oplosdatum: string | null;
  verantwoordelijke: string | null;
  oplossing: string | null;
  factuur_naar: FactuurOntvanger | null;
  extern_referentienummer: string | null;
  opmerkingen: string | null;
};
