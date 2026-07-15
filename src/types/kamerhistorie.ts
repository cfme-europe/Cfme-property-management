export type BewonerKamerhistorie = {
  id: number;
  bewoner_id: number;
  verhuurperiode_id: number;
  oude_kamer_id: number;
  nieuwe_kamer_id: number;
  verhuisdatum: string;
  created_at: string;
  oude_kamer_naam: string;
  nieuwe_kamer_naam: string;
};
