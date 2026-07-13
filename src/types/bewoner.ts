import type { Huurder } from "@/types/huurder";
import type { Kamer } from "@/types/kamer";

export type BewonerStatus = "actief" | "uitgecheckt";

export type Bewoner = {
  id: number;
  created_at: string;
  updated_at: string;
  verhuurperiode_id: number;
  huurder_id: number | null;
  kamer_id: number | null;
  voornaam: string;
  tussenvoegsel: string | null;
  achternaam: string;
  incheckdatum: string;
  uitcheckdatum: string | null;
  status: BewonerStatus;
  opmerkingen: string | null;
  huurder?: Huurder | null;
  kamer?: Kamer | null;
};

export type BewonerInvoer = {
  verhuurperiode_id: number;
  huurder_id: number | null;
  kamer_id: number | null;
  voornaam: string;
  tussenvoegsel: string | null;
  achternaam: string;
  incheckdatum: string;
  uitcheckdatum: string | null;
  status: BewonerStatus;
  opmerkingen: string | null;
};
