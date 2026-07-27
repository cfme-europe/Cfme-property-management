export type Meterstand = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  controlesessie_id?: number | null;
  opnamedatum: string;
  bewoners_aantal: number;
  dagstroom_kwh: number | null;
  nachtstroom_kwh: number | null;
  elektriciteit_kwh: number | null;
  gas_m3: number | null;
  water_m3: number | null;
  opgenomen_door: string | null;
  opmerkingen: string | null;
  analyse_status?:
    | "onvoldoende_data"
    | "normaal"
    | "verhoogd"
    | "kritiek"
    | "onwaarschijnlijk";
  analyse_resultaat?: Record<string, unknown>;
  verklaring_code?: string | null;
  verklaring_toelichting?: string | null;
  opvolging_nodig?: boolean;
  geanalyseerd_at?: string | null;
};

export type MeterstandInvoer = {
  woning_id: number;
  controlesessie_id?: number | null;
  opnamedatum: string;
  bewoners_aantal: number;
  dagstroom_kwh: number | null;
  nachtstroom_kwh: number | null;
  gas_m3: number | null;
  water_m3: number | null;
  opgenomen_door: string | null;
  opmerkingen: string | null;
};
