import assert from "node:assert/strict";
import test from "node:test";
import { bouwRapportagemotor } from "../src/services/rapportagemotor";

const basis = {
  periode: {
    vanaf: "2026-07-01",
    tot_en_met: "2026-07-31",
  },
  vorige_periode: {
    vanaf: "2026-06-01",
    tot_en_met: "2026-06-30",
  },
  inspecties: [
    { inspectiedatum: "2026-06-10" },
    { inspectiedatum: "2026-07-10" },
    { inspectiedatum: "2026-07-24" },
  ],
  meldingen: [
    {
      melddatum: "2026-06-12",
      oplosdatum: null,
      status: "open",
    },
    {
      melddatum: "2026-07-12",
      oplosdatum: null,
      status: "open",
    },
  ],
  meterstanden: [
    {
      id: 1,
      created_at: "",
      updated_at: "",
      woning_id: 1,
      opnamedatum: "2026-06-15",
      bewoners_aantal: 2,
      dagstroom_kwh: 100,
      nachtstroom_kwh: 50,
      elektriciteit_kwh: null,
      gas_m3: 20,
      water_m3: 10,
      opgenomen_door: null,
      opmerkingen: null,
    },
    {
      id: 2,
      created_at: "",
      updated_at: "",
      woning_id: 1,
      opnamedatum: "2026-06-30",
      bewoners_aantal: 2,
      dagstroom_kwh: 130,
      nachtstroom_kwh: 65,
      elektriciteit_kwh: null,
      gas_m3: 25,
      water_m3: 13,
      opgenomen_door: null,
      opmerkingen: null,
    },
    {
      id: 3,
      created_at: "",
      updated_at: "",
      woning_id: 1,
      opnamedatum: "2026-07-31",
      bewoners_aantal: 2,
      dagstroom_kwh: 230,
      nachtstroom_kwh: 115,
      elektriciteit_kwh: null,
      gas_m3: 45,
      water_m3: 25,
      opgenomen_door: null,
      opmerkingen: null,
    },
  ],
  bewoners: [
    {
      incheckdatum: "2026-01-01",
      uitcheckdatum: null,
    },
    {
      incheckdatum: "2026-01-01",
      uitcheckdatum: null,
    },
  ],
  afwijkingen: [
    {
      created_at: "2026-07-10T10:00:00Z",
      status: "open",
      urgentie: "hoog",
      gebrek_type: "veiligheidsrisico",
      geschatte_kosten: 150,
      werkelijke_kosten: null,
      factuur_naar: "eigenaar",
    },
  ],
  taken: [
    {
      created_at: "2026-07-10T10:00:00Z",
      status: "open",
      deadline: "2026-07-12",
    },
  ],
};

test("vergelijkt huidige en vorige kalendermaand", () => {
  const uitkomst = bouwRapportagemotor(basis);

  assert.equal(uitkomst.vergelijking.inspecties.huidig, 2);
  assert.equal(uitkomst.vergelijking.inspecties.vorig, 1);
  assert.equal(
    uitkomst.vergelijking.inspecties.procentueel,
    100,
  );
});

test("berekent energie per persoon per week met persoonsdagen", () => {
  const uitkomst = bouwRapportagemotor(basis);

  assert.equal(
    uitkomst.energie.elektriciteit.totaal,
    150,
  );
  assert.ok(
    uitkomst.energie.elektriciteit
      .per_persoon_per_week !== null,
  );
});

test("telt werkelijke en geschatte kosten niet dubbel", () => {
  const uitkomst = bouwRapportagemotor(basis);

  assert.equal(uitkomst.kosten.werkelijk, 0);
  assert.equal(uitkomst.kosten.geschat, 150);
  assert.equal(uitkomst.kosten.totaal_indicatie, 150);
  assert.equal(
    uitkomst.kosten.per_factuurontvanger.eigenaar,
    150,
  );
});

test("risicoscore is uitlegbaar en begrensd", () => {
  const uitkomst = bouwRapportagemotor(basis);

  assert.ok(uitkomst.risico.score > 0);
  assert.ok(uitkomst.risico.score <= 10);
  assert.ok(uitkomst.risico.factoren.length > 0);
});
