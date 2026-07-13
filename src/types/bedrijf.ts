export type Bedrijf = {
  id: number;
  created_at: string;
  updated_at: string;
  naam: string;
  klantnummer: string | null;
  kvk_nummer: string | null;
  btw_nummer: string | null;
  contactpersoon: string | null;
  telefoon: string | null;
  email: string | null;
  factuur_email: string | null;
  factuuradres: string | null;
  postcode: string | null;
  plaats: string | null;
  actief: boolean;
  opmerkingen: string | null;
};
