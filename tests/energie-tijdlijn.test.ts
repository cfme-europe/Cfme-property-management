import test from "node:test";
import assert from "node:assert/strict";
import { bouwTijdlijn, combineerTijdlijn, tijdlijnBereik, tijdlijnWaarde, tijdlijnVerschil, tijdlijnVerbinding, type TijdlijnPunt } from "../src/lib/energie/tijdlijn";
import type { Brondata } from "../src/lib/energie/portfolio-analyse";

const punt = (verbruik: number | null, pd: number): TijdlijnPunt => ({
  maand: "2026-01", vanaf: "2026-01-01", tot: "2026-02-01", lopend: false,
  verbruik, normaalVerbruik: verbruik ?? 0, persoonsdagen: pd, onbekend: false,
  dekking: verbruik === null ? 0 : 100, naarRato: false, waarschuwingen: [], bronnen: [],
});
test("tijdlijn weegt groepsverbruik op persoonsdagen, geen gemiddelde van pandnormen", () => {
  const p = combineerTijdlijn([punt(70, 7), punt(70, 70)]);
  assert.equal(tijdlijnWaarde(p, "elektriciteit", false), 140);
  assert.equal(tijdlijnWaarde(p, "elektriciteit", true), 140 / 77 * 7);
  assert.equal(tijdlijnWaarde(p, "water", true), 140 / 77 * 1000);
  assert.equal(tijdlijnWaarde(combineerTijdlijn([punt(70, 7), punt(null, 0)]), "gas", true), null);
  assert.equal(combineerTijdlijn([]), null);
});
test("lopende maand en referentiemaand hebben dezelfde exclusieve kalendergrens", () => {
  assert.equal(tijdlijnBereik(2026, 10, "2026-11-13").tot, "2026-11-13");
  assert.equal(tijdlijnBereik(2025, 10, "2026-11-13", 2026).tot, "2025-11-13");
  assert.equal(tijdlijnBereik(2025, 11, "2026-11-13", 2026).toekomst, true);
  assert.equal(tijdlijnBereik(2023, 1, "2024-02-29", 2024).tot, "2023-03-01");
});
test("verschillen vereisen vergelijkbare dekking en geen nulreferentie", () => {
  assert.equal(tijdlijnVerschil(punt(120, 31), punt(100, 31), "gas", false), 20);
  assert.equal(tijdlijnVerschil(punt(120, 31), punt(0, 31), "gas", false), null);
  assert.equal(tijdlijnVerschil({ ...punt(120, 31), dekking: 50 }, punt(100, 31), "gas", false), null);
  assert.equal(tijdlijnVerschil(punt(120, 31), { ...punt(100, 31), tot: "2026-01-13" }, "gas", false), null);
});
test("alle drie producten behouden dezelfde meetperiode, bewonershistorie en gaten", () => {
  const bron: Brondata = {
    woningen: [{ id: 1, adres: "Test", postcode: "", plaats: "" }], bedrijven: [{ id: 1, naam: "Klant" }],
    verhuurperioden: [{ id: 1, woning_id: 1, bedrijf_id: 1, startdatum: "2025-01-01" }],
    bewoners: [{ id: 1, verhuurperiode_id: 1, incheckdatum: "2025-01-01", uitcheckdatum: null }],
    meterstanden: [
      { id: 1, woning_id: 1, opnamedatum: "2026-01-01", bewoners_aantal: 99, dagstroom_kwh: 100, nachtstroom_kwh: 100, elektriciteit_kwh: 200, gas_m3: 100, water_m3: 100 },
      { id: 2, woning_id: 1, opnamedatum: "2026-02-01", bewoners_aantal: 99, dagstroom_kwh: 131, nachtstroom_kwh: 131, elektriciteit_kwh: 262, gas_m3: 131, water_m3: 103.1 },
    ],
  };
  const p = bouwTijdlijn(bron, 2026, "2026-11-13")[0];
  assert.equal(p.producten.elektriciteit[0].verbruik, 62);
  assert.equal(p.producten.gas[0].verbruik, 31);
  assert.ok(Math.abs(p.producten.water[0].verbruik! - 3.1) < 1e-8);
  assert.equal(p.producten.elektriciteit[0].persoonsdagen, 31);
  assert.equal(p.producten.gas[1].verbruik, null, "geen extrapolatie na laatste opname");
  assert.equal(p.producten.gas[11].verbruik, null, "geen toekomstige meetwaarden");
  assert.equal(bouwTijdlijn(bron, 2026, "2026-11-13", [99])[0].producten.gas[0].verbruik, null);
});

test("meerdere panden behouden een zichtbare gedeeltelijke lijn zonder gaten of onbekende bezetting in te vullen", () => {
  const a = combineerTijdlijn([punt(70, 7), punt(null, 0)]);
  const b = combineerTijdlijn([punt(90, 7), punt(40, 7)]);
  assert.equal(tijdlijnVerbinding(a, b, "elektriciteit", false), "gedeeltelijk");
  assert.equal(tijdlijnVerbinding(a, b, "elektriciteit", true), null);
  assert.equal(tijdlijnVerbinding(punt(null, 0), b, "gas", false), null);
  assert.equal(tijdlijnVerbinding(null, b, "water", false), null);
  assert.equal(tijdlijnVerbinding(punt(0, 7), b, "gas", false), "volledig");
  assert.equal(tijdlijnVerbinding({ ...punt(70, 7), lopend: true }, b, "water", false), "gedeeltelijk");
  assert.equal(tijdlijnVerschil(a, b, "elektriciteit", false), null);
});
