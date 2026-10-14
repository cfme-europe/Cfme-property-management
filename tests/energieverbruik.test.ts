import assert from "node:assert/strict";
import test from "node:test";
import { berekenVerbruiksperiodes } from "../src/services/energieverbruik";
import type { Meterstand } from "../src/types/meterstand";

const meter = (
  id: number,
  opnamedatum: string,
  dagstroom: number,
): Meterstand => ({
  id,
  created_at: "",
  updated_at: "",
  woning_id: 1,
  opnamedatum,
  bewoners_aantal: 4,
  dagstroom_kwh: dagstroom,
  nachtstroom_kwh: 0,
  elektriciteit_kwh: dagstroom,
  gas_m3: null,
  water_m3: null,
  opgenomen_door: null,
  opmerkingen: null,
});

test("legacy property trends use shared prorated intervals and no inferred person norm", () => {
  const periods = berekenVerbruiksperiodes(
    [meter(1, "2026-08-29", 0), meter(2, "2026-09-13", 150)],
    "2026-09-01",
    "2026-09-13",
  );

  assert.equal(periods.length, 1);
  assert.equal(periods[0].van_datum, "2026-09-01");
  assert.equal(periods[0].tot_datum, "2026-09-13");
  assert.equal(periods[0].aantal_dagen, 12);
  assert.equal(periods[0].dagstroom.totaal, 120);
  assert.equal(periods[0].dagstroom.per_week, 70);
  assert.equal(periods[0].elektriciteit.totaal, 120);
  assert.equal(periods[0].gemiddeld_bewoners_aantal, null);
  assert.equal(periods[0].dagstroom.per_bewoner_per_week, null);
});

test("multiple measurement intervals prorate independently into a half-open report period", () => {
  const periods = berekenVerbruiksperiodes(
    [
      meter(1, "2026-08-29", 0),
      meter(2, "2026-09-13", 150),
      meter(3, "2026-09-25", 270),
    ],
    "2026-09-01",
    "2026-09-15",
  );

  assert.equal(periods.length, 2);
  assert.equal(
    periods.reduce((sum, period) => sum + (period.dagstroom.totaal ?? 0), 0),
    140,
  );
  assert.equal(
    periods.reduce((sum, period) => sum + period.aantal_dagen, 0),
    14,
  );
});
