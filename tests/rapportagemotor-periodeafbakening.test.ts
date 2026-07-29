import assert from "node:assert/strict";
import test from "node:test";
import { bouwRapportagemotor } from "../src/services/rapportagemotor";

function basisInvoer() {
  return {
    periode: {
      vanaf: "2026-06-01",
      tot_en_met: "2026-06-30",
    },
    vorige_periode: {
      vanaf: "2026-05-01",
      tot_en_met: "2026-05-31",
    },
    inspecties: [],
    meldingen: [],
    meterstanden: [],
    bewoners: [],
  };
}

test("rapportagerisico negeert afwijkingen en taken na de rapportperiode", () => {
  const uitkomst = bouwRapportagemotor({
    ...basisInvoer(),
    afwijkingen: [
      {
        created_at: "2026-07-28T08:00:00.000Z",
        status: "open",
        urgentie: "hoog",
        gebrek_type: "veiligheidsrisico",
        geschatte_kosten: null,
        werkelijke_kosten: null,
        factuur_naar: null,
      },
    ],
    taken: [
      {
        created_at: "2026-07-28T08:00:00.000Z",
        status: "open",
        deadline: "2026-06-15",
      },
    ],
  });

  assert.equal(uitkomst.risico.score, 0);
  assert.deepEqual(uitkomst.risico.factoren, []);
  assert.equal(
    uitkomst.acties.some((actie) =>
      actie.toLowerCase().includes("achterstallige taak"),
    ),
    false,
  );
});

test("rapportagerisico gebruikt rapport-einddatum als peildatum", () => {
  const uitkomst = bouwRapportagemotor({
    ...basisInvoer(),
    afwijkingen: [
      {
        created_at: "2026-06-20T08:00:00.000Z",
        status: "open",
        urgentie: "hoog",
        gebrek_type: "veiligheidsrisico",
        geschatte_kosten: null,
        werkelijke_kosten: null,
        factuur_naar: null,
      },
    ],
    taken: [
      {
        created_at: "2026-06-10T08:00:00.000Z",
        status: "open",
        deadline: "2026-06-20",
      },
    ],
  });

  assert.ok(uitkomst.risico.score > 0);
  assert.ok(
    uitkomst.risico.factoren.some((factor) =>
      factor.includes("hoge urgentie"),
    ),
  );
  assert.ok(
    uitkomst.risico.factoren.some((factor) =>
      factor.toLowerCase().includes("achterstallige taak"),
    ),
  );
});
