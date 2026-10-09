export type InspectieFotoType =
  | "situatie"
  | "voor_herstel"
  | "na_herstel"
  | "herstelbewijs";

export type InspectieFoto = {
  id: number;
  created_at: string;
  inspectie_id: number;
  controle_resultaat_id?: number | null;
  controle_afwijking_id?: number | null;
  bestandspad: string;
  bestandsnaam: string;
  mime_type: string;
  bestandsgrootte: number;
  omschrijving: string | null;
  foto_type: InspectieFotoType;
  volgorde: number;
  tijdelijke_url?: string | null;
};

export type InspectieFotoUpload = {
  inspectie_id: number;
  controle_resultaat_id?: number | null;
  controle_afwijking_id?: number | null;
  bestand: File;
  omschrijving?: string | null;
  foto_type?: InspectieFotoType;
};
