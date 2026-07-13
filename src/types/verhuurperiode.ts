import type { Bedrijf } from "./bedrijf";

export type VerhuurperiodeStatus =
  | "concept"
  | "aangeboden"
  | "actief"
  | "opgezegd"
  | "beëindigd"
  | "geannuleerd";

export type Verhuurperiode = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  bedrijf_id: number;
  referentie: string | null;
  aanbiedingsdatum: string | null;
  acceptatiedatum: string | null;
  startdatum: string;
  geplande_einddatum: string | null;
  opzegdatum: string | null;
  werkelijke_einddatum: string | null;
  opleverdatum: string | null;
  maandhuur: number;
  borg: number | null;
  facturatie_dag: number;
  status: VerhuurperiodeStatus;
  begininspectie_verplicht: boolean;
  eindinspectie_verplicht: boolean;
  opmerkingen: string | null;
  bedrijf?: Bedrijf | null;
};
