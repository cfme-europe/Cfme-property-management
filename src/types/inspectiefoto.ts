export type InspectieFoto = {
  id: number;
  created_at: string;
  inspectie_id: number;
  bestandspad: string;
  bestandsnaam: string;
  mime_type: string;
  bestandsgrootte: number;
  omschrijving: string | null;
  volgorde: number;
  tijdelijke_url?: string | null;
};

export type InspectieFotoUpload = {
  inspectie_id: number;
  bestand: File;
  omschrijving?: string | null;
};
