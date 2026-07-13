export type Meterstand = {
  id: number;
  created_at: string;
  updated_at: string;
  woning_id: number;
  opnamedatum: string;
  bewoners_aantal: number;
  elektriciteit_kwh: number | null;
  gas_m3: number | null;
  water_m3: number | null;
  opgenomen_door: string | null;
  opmerkingen: string | null;
};

export type MeterstandInvoer = {
  woning_id: number;
  opnamedatum: string;
  bewoners_aantal: number;
  elektriciteit_kwh: number | null;
  gas_m3: number | null;
  water_m3: number | null;
  opgenomen_door: string | null;
  opmerkingen: string | null;
};
