import test from "node:test";
import assert from "node:assert/strict";
import {
  berekenBruikbareVerbruiksraming,
  bouwEnergiePortfolioAnalyse,
  berekenPersoonsdagen,
  type Brondata,
  type EnergieMeterstand,
  type EnergieInterval,
  normaliseerMeterconfiguraties,
  ongedekteMeetperioden,
  sorteerEnergieAnalyseRijenOpVerbruiksraming,
} from "../src/lib/energie/portfolio-analyse";
import {
  datumTijd,
  ENERGIE_ANALYSE_STARTDATUM,
  gedekteDagen,
  kwartiel,
} from "../src/lib/energie/rekenregels";
import { elektriciteitsMeting } from "../src/lib/energie/metingen";
import {
  berekenEnergiekosten,
  valideerTarief,
  vindGeldendTarief,
  type Tariefplan,
} from "../src/lib/energie/tarieven";
import { leesAlleRijen } from "../src/lib/energie/paginering";
import {
  bouwEnergieSnapshot,
  klantSnapshot,
} from "../src/lib/energie/snapshot";
import { leesSelectie } from "../src/lib/energie/selectie";
import { beoordeelMaatregel } from "../src/lib/energie/resultaten";
import {
  alleKlantversieOnderdelen,
  leesKlantversieOnderdelen,
} from "../src/lib/rapportages/klantversie-onderdelen";
import { jsPDF } from "jspdf";
import { tekenEnergieRapportPagina } from "../src/lib/energie/rapport-pdf";
const stand = (
  id: number,
  date: string,
  kwh: number,
  residents = 8,
): EnergieMeterstand => ({
  id,
  woning_id: 16,
  opnamedatum: date,
  bewoners_aantal: residents,
  dagstroom_kwh: kwh,
  nachtstroom_kwh: 0,
  elektriciteit_kwh: kwh,
  gas_m3: null,
  water_m3: null,
});
function bron(): Brondata {
  return {
    woningen: [
      { id: 16, adres: "Testpand", postcode: "", plaats: "", status: "actief" },
    ],
    bedrijven: [{ id: 4, naam: "Klant" }],
    verhuurperioden: [
      { id: 12, woning_id: 16, bedrijf_id: 4, startdatum: "2026-08-01" },
    ],
    bewoners: Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      verhuurperiode_id: 12,
      incheckdatum: "2026-08-01",
      uitcheckdatum: null,
    })),
    meterstanden: [
      stand(58, "2026-09-07", 63890),
      stand(75, "2026-09-23", 64654),
    ],
  };
}
const sel = {
  niveau: "totaal" as const,
  drager: "elektriciteit" as const,
  vanaf: "2026-09-01",
  totEnMet: "2026-10-01",
};
const analyse = (b = bron(), s = sel) => bouwEnergiePortfolioAnalyse(b, s);
test("golden Meerstraat:764 / (128/7), 16/30 calendar coverage, no misleading benchmark", () => {
  const a = analyse();
  assert.equal(a.totaal, 764);
  assert.equal(a.persoonsdagen, 128);
  assert.equal(a.per_persoon_per_week, null);
  const verbruiksraming = berekenBruikbareVerbruiksraming(a.rijen[0], 30);
  assert.ok(verbruiksraming);
  assert.ok(Math.abs(verbruiksraming.per_persoon_per_week - 764 / (128 / 7)) < 1e-10);
  assert.ok(Math.abs(verbruiksraming.per_persoon_per_periode - (764 * 30) / 128) < 1e-10);
  assert.ok(Math.abs(a.dekking_percentage - (16 / 30) * 100) < 1e-10);
  assert.equal(a.rijen[0].betrouwbaarheid, "gedeeltelijk");
  assert.equal(a.mediaan_per_persoon_per_week, null);
});
test("reports uncovered dates outside the measured window rather than extrapolating coverage", () => {
  const rij = analyse().rijen[0];

  assert.deepEqual(
    ongedekteMeetperioden(
      rij.intervallen,
      "2026-09-01",
      "2026-10-01",
    ).map(({ vanDatum, totDatum }) => [vanDatum, totDatum]),
    [
      ["2026-09-01", "2026-09-07"],
      ["2026-09-23", "2026-10-01"],
    ],
  );
});
test("inclusive end-date form input becomes one exclusive analysis boundary", () => {
  const parsed = leesSelectie(
    {
      vanaf: "2026-09-01",
      tot_en_met: "2026-10-09",
      drager: "elektriciteit",
    },
    bron(),
  );
  assert.equal(parsed.selectie.totEnMet, "2026-10-10");
  assert.throws(
    () =>
      leesSelectie(
        {
          vanaf: "2026-09-01",
          tot: "2026-10-10",
          tot_en_met: "2026-10-09",
        },
        bron(),
      ),
    /één einddatumparameter/,
  );
});
test("an August high-consumption warning remains included while October stays uncovered", () => {
  const b = bron();
  b.bewoners = Array.from({ length: 7 }, (_, index) => ({
    id: index + 1,
    verhuurperiode_id: 12,
    incheckdatum: "2026-08-01",
    uitcheckdatum: null,
  }));
  b.meterstanden = [
    {
      ...stand(50, "2026-08-25", 1000, 7),
      analyse_resultaat: {
        dragers: [{ drager: "elektriciteit", status: "onwaarschijnlijk" }],
      },
      opvolging_nodig: true,
    },
    stand(73, "2026-09-23", 1527, 7),
    stand(81, "2026-10-05", 1728, 7),
  ];

  const result = analyse(b, {
    ...sel,
    vanaf: "2026-09-01",
    totEnMet: "2026-10-10",
  });
  const rij = result.rijen[0];
  const verbruiksraming = berekenBruikbareVerbruiksraming(rij, 39);

  assert.equal(rij.persoonsdagen, 238);
  assert.ok(Math.abs(rij.dekking_percentage - (34 / 39) * 100) < 1e-10);
  assert.ok(Math.abs(rij.totaal! - 600.7931034482759) < 1e-9);
  assert.equal(rij.per_persoon_per_week, null);
  assert.ok(verbruiksraming);
  assert.ok(Math.abs(verbruiksraming.per_persoon_per_week - 17.6703853955375) < 1e-9);
  assert.ok(Math.abs(verbruiksraming.per_persoon_per_periode - (600.7931034482759 * 39) / 238) < 1e-10);
  assert.match(rij.meldingen.join(" "), /Beginopname heeft onwaarschijnlijk verbruik/);
  assert.match(rij.meldingen.join(" "), /Opvolging is bij een grensopname gemarkeerd/);
  assert.equal(rij.intervallen[0].betrouwbaar, true);
  assert.equal(rij.intervallen[1].totDatum, "2026-10-05");
});
test("legacy electricity totals remain usable for the three historic register layouts", () => {
  const buildings: Array<{
    id: number;
    adres: string;
    occupants: number;
    expectedPersonDays: number;
    expectedTotal: number;
    readings: [string, number][];
  }> = [
    {
      id: 18,
      adres: "Bundesstrasse 157",
      occupants: 10,
      expectedPersonDays: 350,
      expectedTotal: 11191 / 13,
      readings: [
        ["2026-08-25", 11858],
        ["2026-09-07", 12148],
        ["2026-09-18", 12433],
        ["2026-10-06", 12875],
      ],
    },
    {
      id: 20,
      adres: "Grunstrasse 24",
      occupants: 7,
      expectedPersonDays: 245,
      expectedTotal: 8812 / 13,
      readings: [
        ["2026-08-25", 57247],
        ["2026-09-07", 57472],
        ["2026-09-18", 57674],
        ["2026-10-06", 58046],
      ],
    },
    {
      id: 22,
      adres: "heidestrasse 4",
      occupants: 5,
      expectedPersonDays: 175,
      expectedTotal: 6703 / 13,
      readings: [
        ["2026-08-25", 76220],
        ["2026-09-07", 76425],
        ["2026-09-22", 76680],
        ["2026-10-06", 76846],
      ],
    },
  ];
  const b: Brondata = {
    woningen: buildings.map(({ id, adres }) => ({
      id,
      adres,
      postcode: "",
      plaats: "",
      status: "actief",
    })),
    bedrijven: [{ id: 4, naam: "Testklant" }],
    verhuurperioden: buildings.map(({ id }) => ({
      id: id + 100,
      woning_id: id,
      bedrijf_id: 4,
      startdatum: "2026-08-20",
    })),
    bewoners: buildings.flatMap(({ id, occupants }) =>
      Array.from({ length: occupants }, (_, index) => ({
        id: id * 100 + index,
        verhuurperiode_id: id + 100,
        incheckdatum: "2026-08-20",
        uitcheckdatum: null,
      })),
    ),
    meterstanden: buildings.flatMap(({ id, occupants, readings }) =>
      readings.map(([date, value], index) => ({
        ...stand(id * 10 + index, date, value, occupants),
        woning_id: id,
        dagstroom_kwh: value,
        nachtstroom_kwh: null,
        elektriciteit_kwh: value,
      })),
    ),
  };

  const result = bouwEnergiePortfolioAnalyse(b, {
    ...sel,
    vanaf: "2026-09-01",
    totEnMet: "2026-10-06",
    woningIds: buildings.map(({ id }) => id),
    minimaleDekking: 0,
  });

  assert.deepEqual(
    result.rijen.map((row) => row.adres).sort(),
    ["Bundesstrasse 157", "Grunstrasse 24", "heidestrasse 4"],
  );
  for (const row of result.rijen) {
    const expected = buildings.find((building) => building.id === row.woning_id);
    assert.ok(expected);
    assert.equal(row.dekking_percentage, 100);
    assert.equal(row.persoonsdagen, expected.expectedPersonDays);
    assert.ok(row.totaal !== null);
    assert.ok(Math.abs(row.totaal - expected.expectedTotal) < 1e-9);
    assert.ok(row.per_persoon_per_week !== null);
    assert.ok(row.intervallen.every((interval) => interval.waarde !== null));
    assert.ok(
      row.intervallen.every((interval) =>
        interval.bronVelden?.includes("elektriciteit_kwh"),
      ),
    );
    assert.ok(
      row.intervallen.some((interval) =>
        interval.meldingen.some((melding) =>
          melding.includes("dag-/nachtverdeling is niet bevestigd"),
        ),
      ),
    );
    const cost = berekenEnergiekosten(
      row.intervallen,
      [],
      "elektriciteit",
      "kWh",
    );
    assert.equal(cost.totaal, null);
    assert.ok(cost.ontbrekend.length > 0);
    assert.ok(berekenBruikbareVerbruiksraming(row, 35));
  }
});
test("explicit electricity register configuration overrides the historic total fallback", () => {
  const start = {
      dagstroom_kwh: 11858,
      nachtstroom_kwh: null,
      elektriciteit_kwh: 11858,
    },
    end = {
      dagstroom_kwh: 12148,
      nachtstroom_kwh: null,
      elektriciteit_kwh: 12148,
    };

  assert.equal(elektriciteitsMeting(start, end).waarde, 290);
  assert.deepEqual(elektriciteitsMeting(start, end).bronVelden, [
    "elektriciteit_kwh",
  ]);
  assert.equal(elektriciteitsMeting(start, end, "totaal").waarde, 290);
  assert.equal(elektriciteitsMeting(start, end, "dag_nacht").waarde, null);
  assert.equal(elektriciteitsMeting(start, end, "enkel").waarde, 290);
});
test("water-only anomaly statuses never exclude normal electricity intervals", () => {
  const fixtures: Array<{
    woningId: number;
    adres: string;
    occupants: number;
    generalStatus: string;
    waterStatus: string;
    readings: [string, number][];
    warningReadingId: number;
  }> = [
    {
      woningId: 20,
      adres: "Grunstrasse 24",
      occupants: 7,
      generalStatus: "kritiek",
      waterStatus: "kritiek",
      readings: [
        ["2026-08-25", 57247],
        ["2026-09-07", 57472],
        ["2026-09-18", 57674],
        ["2026-10-06", 58046],
      ],
      warningReadingId: 62,
    },
    {
      woningId: 22,
      adres: "heidestrasse 4",
      occupants: 5,
      generalStatus: "verhoogd",
      waterStatus: "verhoogd",
      readings: [
        ["2026-08-25", 76220],
        ["2026-09-07", 76425],
        ["2026-09-22", 76680],
        ["2026-10-06", 76846],
      ],
      warningReadingId: 72,
    },
  ];
  for (const {
    woningId,
    adres,
    occupants,
    generalStatus,
    waterStatus,
    readings,
    warningReadingId,
  } of fixtures) {
    const b = bron();
    b.woningen[0].id = woningId;
    b.woningen[0].adres = adres;
    b.verhuurperioden[0].woning_id = woningId;
    b.bewoners = Array.from({ length: occupants }, (_, index) => ({
      id: 2000 + index,
      verhuurperiode_id: 12,
      incheckdatum: "2026-08-20",
      uitcheckdatum: null,
    }));
    b.meterstanden = readings.map(([date, value], index) => {
      const id =
        woningId === 20 ? 60 + index : 70 + index;
      const warning = id === warningReadingId;
      return {
        ...stand(id, date, value, occupants),
        woning_id: woningId,
        dagstroom_kwh: value,
        nachtstroom_kwh: null,
        elektriciteit_kwh: value,
        ...(warning
          ? {
              analyse_status: generalStatus,
              opvolging_nodig: true,
              analyse_resultaat: {
                dragers: [
                  { drager: "elektriciteit", status: "normaal" },
                  { drager: "water", status: waterStatus },
                ],
              },
            }
          : {}),
      };
    });

    const result = bouwEnergiePortfolioAnalyse(b, {
      ...sel,
      vanaf: "2026-09-01",
      totEnMet: "2026-10-06",
    });
    assert.equal(result.rijen[0].adres, adres);
    assert.equal(result.rijen[0].dekking_percentage, 100);
    assert.ok(result.totaal !== null && result.totaal > 0);
    assert.ok(
      result.rijen[0].intervallen.every((interval) => interval.betrouwbaar),
    );
    assert.ok(
      result.rijen[0].intervallen.some((interval) =>
        interval.meldingen.some((melding) =>
          melding.includes("Opvolging is bij een grensopname gemarkeerd"),
        ),
      ),
    );
  }
});
test("Heirstraat uses dated occupancy, prorated consumption, and keeps occupant mismatch visible without hiding the bar", () => {
  const readings = [
    ["2026-08-26", 63827],
    ["2026-09-07", 63950],
    ["2026-09-18", 64120],
    ["2026-10-05", 64397],
  ] as const;
  const b: Brondata = {
    woningen: [
      {
        id: 14,
        adres: "Heirstraat",
        postcode: "",
        plaats: "",
        status: "actief",
      },
    ],
    bedrijven: [{ id: 4, naam: "Testklant" }],
    verhuurperioden: [
      {
        id: 114,
        woning_id: 14,
        bedrijf_id: 4,
        startdatum: "2026-08-22",
      },
    ],
    bewoners: Array.from({ length: 9 }, (_, index) => ({
      id: 1400 + index,
      verhuurperiode_id: 114,
      incheckdatum: "2026-08-22",
      uitcheckdatum: index < 2 ? "2026-10-01" : null,
    })),
    meterstanden: readings.map(([date, value], index) => ({
      ...stand(140 + index, date, value, 7),
      woning_id: 14,
      dagstroom_kwh: value,
      nachtstroom_kwh: null,
      elektriciteit_kwh: value,
    })),
  };

  const result = bouwEnergiePortfolioAnalyse(b, {
    ...sel,
    vanaf: "2026-09-01",
    totEnMet: "2026-10-05",
    woningIds: [14],
  });
  const row = result.rijen[0];
  const estimate = berekenBruikbareVerbruiksraming(row, 34);

  assert.equal(row.persoonsdagen, 298);
  assert.equal(row.totaal, 508.5);
  assert.equal(row.dekking_percentage, 100);
  assert.ok(row.intervallen.some((interval) => interval.bezettingsconflict));
  assert.match(
    row.meldingen.join(" "),
    /meteropname 7, bewonersregister 9/,
  );
  assert.ok(estimate);
  assert.equal(
    estimate.per_persoon_per_week,
    508.5 / (298 / 7),
  );
});
test("selecting only dates after the last valid reading remains uncovered, without an extrapolated consumption value", () => {
  const b = bron();
  b.meterstanden = [
    stand(1, "2026-08-25", 100),
    stand(2, "2026-10-06", 200),
  ];

  const result = bouwEnergiePortfolioAnalyse(b, {
    ...sel,
    vanaf: "2026-10-07",
    totEnMet: "2026-10-14",
  });
  const row = result.rijen[0];

  assert.equal(row.totaal, null);
  assert.equal(row.persoonsdagen, 0);
  assert.equal(row.dekking_percentage, 0);
  assert.equal(row.intervallen.length, 0);
  assert.equal(berekenBruikbareVerbruiksraming(row, 7), null);
  assert.deepEqual(
    ongedekteMeetperioden(
      row.intervallen,
      "2026-10-07",
      "2026-10-14",
    ).map(({ vanDatum, totDatum }) => [vanDatum, totDatum]),
    [["2026-10-07", "2026-10-14"]],
  );
});
test("horizontal consumption-bar sorting uses displayed values and puts rows without values last", () => {
  const result = bouwEnergiePortfolioAnalyse(
    {
      ...bron(),
      meterstanden: [
        stand(1, "2026-09-01", 100),
        stand(2, "2026-09-08", 200),
      ],
    },
    { ...sel, vanaf: "2026-09-01", totEnMet: "2026-09-08" },
  );
  const row = result.rijen[0];
  const withoutConsumption = {
    ...row,
    woning_id: 99,
    adres: "Geen bruikbare meting",
    totaal: null,
    persoonsdagen: 0,
    meetperioden: 0,
    intervallen: [],
  };

  assert.deepEqual(
    sorteerEnergieAnalyseRijenOpVerbruiksraming(
      [{ ...row, woning_id: 2, adres: "Lagere balk", totaal: 100 }, {
        ...row,
        woning_id: 3,
        adres: "Hogere balk",
        totaal: 200,
      }, withoutConsumption],
      7,
    ).map((item) => item.adres),
    ["Hogere balk", "Lagere balk", "Geen bruikbare meting"],
  );
});
test("exact boundaries and missing boundaries are distinct", () => {
  const a = analyse(bron(), {
    ...sel,
    vanaf: "2026-09-07",
    totEnMet: "2026-09-23",
  });
  assert.equal(a.dekking_percentage, 100);
  assert.equal(a.rijen[0].betrouwbaarheid, "exact");
  const b = bron();
  b.meterstanden.pop();
  assert.equal(analyse(b).totaal, null);
  assert.equal(analyse(b).rijen.length, 1);
});
test("overlapping half-open intervals contribute covered days only once", () => {
  assert.equal(
    gedekteDagen([
      { vanDatum: "2026-09-01", totDatum: "2026-09-10" },
      { vanDatum: "2026-09-05", totDatum: "2026-09-15" },
      { vanDatum: "2026-09-15", totDatum: "2026-09-21" },
    ]),
    20,
  );
});
test("historical readings remain selectable while the default analysis starts on September 1", () => {
  const b = bron();
  const standaard = leesSelectie({}, b).selectie;
  assert.equal(standaard.vanaf, "2026-09-01");
  assert.equal(standaard.totEnMet, "2026-09-24");
  assert.equal(
    leesSelectie(
      { vanaf: "2026-08-31", tot: "2026-09-23", drager: "elektriciteit" },
      b,
    ).selectie.vanaf,
    "2026-08-31",
  );
  const historical = analyse(b, {
    ...sel,
    vanaf: "2026-08-31",
    totEnMet: "2026-09-23",
  });
  assert.equal(historical.totaal, 764);
  assert.ok(Math.abs(historical.dekking_percentage - (16 / 23) * 100) < 1e-10);
});
test("Aug 29–Sep 13 interval prorates to 120 kWh and fully covers Sep 1–13", () => {
  const b = bron();
  b.meterstanden = [
    stand(1, "2026-08-29", 0),
    stand(2, "2026-09-13", 150),
  ];
  const result = analyse(b, {
    ...sel,
    vanaf: "2026-09-01",
    totEnMet: "2026-09-13",
  });
  assert.equal(result.totaal, 120);
  assert.equal(result.dekking_percentage, 100);
});
test("boundary intervals are proportionally allocated by default and fully cover time", () => {
  const b = bron();
  b.bewoners = b.bewoners.slice(0, 2);
  b.meterstanden = [
    stand(1, "2026-08-25", 100, 2),
    stand(2, "2026-09-11", 270, 2),
    stand(3, "2026-09-21", 370, 2),
  ];
  const keuze = {
    ...sel,
    vanaf: ENERGIE_ANALYSE_STARTDATUM,
    totEnMet: "2026-09-21",
  };
  const resultaat = analyse(b, keuze);
  assert.equal(resultaat.totaal, 200);
  assert.equal(resultaat.persoonsdagen, 40);
  assert.equal(resultaat.dekking_percentage, 100);
  assert.equal(resultaat.rijen[0].betrouwbaarheid, "exact");
  assert.ok(resultaat.trends.some((interval) => interval.geschat));
});
test("selected period boundaries are proportionally allocated without extrapolation", () => {
  const b = bron();
  const result = analyse(b, {
    ...sel,
    vanaf: "2026-09-10",
    totEnMet: "2026-09-20",
  });
  assert.equal(result.totaal, 477.5);
  assert.equal(result.dekking_percentage, 100);
  assert.equal(result.rijen[0].betrouwbaarheid, "exact");
  assert.equal(result.rijen[0].exacte_dekking_percentage, 0);
  assert.ok(
    Math.abs(
      bouwEnergiePortfolioAnalyse(b, { ...sel, modus: "schatting" })
        .dekking_percentage -
        (16 / 30) * 100,
    ) < 1e-10,
  );
});
test("Heirstraat golden:9×11=99 vs7×11=77, no authoritative normalized output", () => {
  const b = bron();
  b.bewoners.push({ ...b.bewoners[0], id: 9 });
  b.meterstanden = [
    stand(61, "2026-09-07", 63950, 7),
    stand(71, "2026-09-18", 64120, 7),
  ];
  const a = analyse(b);
  assert.equal(a.totaal, 170);
  assert.equal(a.persoonsdagen, 99);
  assert.equal(a.per_persoon_per_week, null);
  assert.match(
    a.rijen[0].meldingen.join(),
    /spreken elkaar tegen op 2026-09-07: meteropname 7, bewonersregister 9/,
  );
  assert.equal(170 / (77 / 7), 170 / 11);
});
test("dated resident turnover sums to 298 person-days without comparing a period average to snapshots", () => {
  const b = bron();
  b.bewoners = [
    ...Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      verhuurperiode_id: 12,
      incheckdatum: "2026-09-01",
      uitcheckdatum: "2026-09-30",
    })),
    ...Array.from({ length: 8 }, (_, index) => ({
      id: index + 11,
      verhuurperiode_id: 12,
      incheckdatum: "2026-09-30",
      uitcheckdatum: null,
    })),
  ];
  b.meterstanden = [
    stand(1, "2026-09-01", 0, 10),
    stand(2, "2026-10-01", 300, 8),
  ];
  const result = analyse(b, {
    ...sel,
    vanaf: "2026-09-01",
    totEnMet: "2026-10-01",
  });

  assert.equal(result.rijen[0].persoonsdagen, 298);
  assert.equal(result.rijen[0].intervallen[0].bezettingsconflict, false);
  assert.equal(result.rijen[0].per_persoon_per_week, 300 / (298 / 7));
  assert.doesNotMatch(result.rijen[0].meldingen.join(" "), /spreken elkaar tegen/);
});
test("boundary occupancy switch never counts a person twice", () => {
  assert.equal(
    berekenPersoonsdagen(
      [
        { incheckdatum: "2026-09-01", uitcheckdatum: "2026-09-10" },
        { incheckdatum: "2026-09-10", uitcheckdatum: null },
      ],
      "2026-09-01",
      "2026-10-01",
    ),
    30,
  );
});
test("zero residents preserves consumption", () => {
  const b = bron();
  b.bewoners = [];
  b.meterstanden.forEach((m) => (m.bewoners_aantal = 0));
  const a = analyse(b);
  assert.equal(a.totaal, 764);
  assert.equal(a.per_persoon_per_week, null);
});
test("lease dates clip occupancy; client change cannot silently allocate", () => {
  const b = bron();
  b.verhuurperioden[0].werkelijke_einddatum = "2026-09-15";
  b.verhuurperioden.push({
    id: 13,
    woning_id: 16,
    bedrijf_id: 5,
    startdatum: "2026-09-15",
  });
  const a = bouwEnergiePortfolioAnalyse(b, {
    ...sel,
    niveau: "bedrijf",
    bedrijfId: 4,
  });
  assert.equal(a.totaal, null);
  assert.match(a.rijen[0].meldingen.join(), /klantwissel/);
});
test("declining meters, duplicates and meter changes are excluded", () => {
  const b = bron();
  b.meterstanden[1].dagstroom_kwh = 10;
  b.meterstanden[1].elektriciteit_kwh = 10;
  assert.equal(analyse(b).totaal, null);
  const c = bron();
  c.meterstanden.push({ ...c.meterstanden[0], id: 59 });
  assert.equal(analyse(c).totaal, null);
  const d = bron();
  d.meterconfiguraties = [
    {
      woning_id: 16,
      product: "elektriciteit",
      meteridentiteit: "new",
      registertype: "enkel",
      vanaf: "2026-09-15",
      tot: null,
    },
  ];
  assert.equal(analyse(d).totaal, null);
});
test("historic total columns stay usable without inventing a missing night register", () => {
  const a = stand(1, "2026-01-01", 100),
    b = stand(2, "2026-01-08", 170);
  a.nachtstroom_kwh = null;
  b.nachtstroom_kwh = null;
  assert.equal(elektriciteitsMeting(a, b).waarde, 70);
  assert.equal(elektriciteitsMeting(a, b).nacht, null);
  assert.deepEqual(elektriciteitsMeting(a, b).bronVelden, [
    "elektriciteit_kwh",
  ]);
  assert.equal(elektriciteitsMeting(a, b, "enkel").waarde, 70);
  a.elektriciteit_kwh = null;
  b.elektriciteit_kwh = null;
  assert.equal(elektriciteitsMeting(a, b).waarde, null);
  b.nachtstroom_kwh = 20;
  assert.equal(elektriciteitsMeting(a, b, "dag_nacht").waarde, null);
});
test("configured total registers use total-only readings without inventing day/night values", () => {
  const b = bron();
  b.meterstanden = [
    { ...stand(58, "2026-09-07", 63890), dagstroom_kwh: null, nachtstroom_kwh: null },
    { ...stand(75, "2026-09-23", 64654), dagstroom_kwh: null, nachtstroom_kwh: null },
  ];
  b.meterconfiguraties = [
    {
      id: "total-register",
      woning_id: 16,
      product: "elektriciteit",
      meteridentiteit: "hoofd-elektra",
      registertype: "totaal",
      vanaf: "2026-01-01",
      tot: null,
    },
  ];

  const resultaat = analyse(b);

  assert.equal(resultaat.totaal, 764);
  assert.equal(resultaat.rijen[0].meetperioden, 1);
  assert.equal(resultaat.rijen[0].intervallen[0].dag, null);
  assert.equal(resultaat.rijen[0].intervallen[0].nacht, null);
  assert.equal(resultaat.rijen[0].betrouwbaarheid, "gedeeltelijk");
});
test("successor meter configuration preserves the predecessor's historical range", () => {
  const normalized = normaliseerMeterconfiguraties([
    {
      id: "old",
      woning_id: 16,
      product: "elektriciteit",
      meteridentiteit: "oud",
      registertype: "totaal",
      vanaf: "2026-01-01",
      tot: null,
    },
    {
      id: "new",
      voorganger_id: "old",
      woning_id: 16,
      product: "elektriciteit",
      meteridentiteit: "nieuw",
      registertype: "dag_nacht",
      vanaf: "2026-09-01",
      tot: null,
    },
  ]);

  assert.equal(normalized[0].tot, "2026-09-01");
  assert.equal(normalized[1].tot, null);
});
test("independent total and conflicting total/register families", () => {
  const a = stand(1, "2026-01-01", 100),
    b = stand(2, "2026-01-08", 170);
  a.dagstroom_kwh = null;
  a.nachtstroom_kwh = null;
  b.dagstroom_kwh = null;
  b.nachtstroom_kwh = null;
  assert.equal(elektriciteitsMeting(a, b, "totaal").waarde, 70);
  const c = stand(1, "2026-01-01", 100),
    d = stand(2, "2026-01-08", 170);
  d.elektriciteit_kwh = 500;
  assert.equal(elektriciteitsMeting(c, d).waarde, null);
});
test("product warnings do not invalidate a positive electricity meter delta", () => {
  const b = bron();
  b.meterstanden[1].analyse_status = "onwaarschijnlijk";
  b.meterstanden[1].opvolging_nodig = true;
  b.meterstanden[1].analyse_resultaat = {
    dragers: [
      { drager: "gas", status: "onwaarschijnlijk" },
      { drager: "elektriciteit", status: "kritiek" },
    ],
  };
  assert.equal(analyse(b).totaal, 764);
  b.meterstanden[1].analyse_resultaat = {
    dragers: [{ drager: "elektriciteit", status: "onwaarschijnlijk" }],
  };
  assert.equal(analyse(b).totaal, 764);
});
test("strict calendar validation includes leap days and URL arrays", () => {
  assert.throws(() => datumTijd("2026-02-30"));
  assert.throws(() => datumTijd("2026-02-29"));
  assert.ok(datumTijd("2024-02-29"));
  assert.throws(() =>
    leesSelectie({ vanaf: ["2026-09-01", "2026-09-02"] }, bron()),
  );
  assert.throws(() =>
    leesSelectie({ vanaf: "2026-10-01", tot: "2026-09-01" }, bron()),
  );
  assert.throws(() => leesSelectie({ woning: "9999" }, bron()));
});
test("housing mode clears an irrelevant client; archives explicit", () => {
  const s = leesSelectie(
    { niveau: "woning", woning: "16", bedrijf: "9999" },
    bron(),
  );
  assert.deepEqual(s.selectie.bedrijfIds, []);
  const b = bron();
  b.woningen[0].status = "gearchiveerd";
  assert.equal(analyse(b).rijen.length, 0);
  assert.equal(
    bouwEnergiePortfolioAnalyse(b, { ...sel, archief: true }).rijen.length,
    1,
  );
});
test("golden median and interpolated IQR; insufficient cohorts never signal", () => {
  assert.equal(kwartiel([10, 11, 12, 13, 100], 0.5), 12);
  assert.equal(kwartiel([10, 11, 12, 13, 100], 0.25), 11);
  assert.equal(kwartiel([10, 11, 12, 13, 100], 0.75), 13);
  assert.equal(analyse().rijen[0].signaal, "onvoldoende_data");
});
const interval: EnergieInterval = {
  woningId: 16,
  vanDatum: "2026-01-25",
  totDatum: "2026-02-05",
  bronVanaf: "2026-01-25",
  bronTot: "2026-02-05",
  bronIds: [1, 2],
  dagen: 11,
  persoonsdagen: 11,
  bedrijfIds: [4],
  waarde: 110,
  dag: 110,
  nacht: 0,
  geschat: false,
  meldingen: [],
  bezettingsconflict: false,
  betrouwbaar: true,
  anomalie: null,
};
const tariff = (
  id: string,
  van: string,
  tot: string | null,
  price: string,
): Tariefplan => ({
  id,
  product: "elektriciteit",
  eenheid: "kWh",
  valuta: "EUR",
  vanaf: van,
  tot,
  woning_id: null,
  bedrijf_id: null,
  bron: "Fictief testtarief",
  componenten: [
    {
      soort: "variabel",
      prijs: price,
      btw_percentage: "21",
      inclusief_btw: false,
    },
    {
      soort: "vast_dag",
      prijs: "0.5",
      btw_percentage: "21",
      inclusief_btw: false,
    },
  ],
});
test("tariff boundary prorates variable and fixed costs without missing tariff coverage", () => {
  const plans = [
    tariff("a", "2026-01-01", "2026-02-01", "0.2"),
    tariff("b", "2026-02-01", null, "0.3"),
  ];
  const costs = berekenEnergiekosten(
    [interval],
    plans,
    "elektriciteit",
    "kWh",
  );
  assert.equal(costs.variabel, 26);
  assert.equal(costs.vast, 5.5);
  assert.equal(costs.regels[0].hoeveelheid, 70);
  assert.equal(costs.regels[2].hoeveelheid, 40);
  assert.equal(costs.geschat, true);
  assert.ok(Math.abs(costs.totaal! - 38.115) < 1e-9);
  assert.equal(costs.ontbrekend.length, 0);
});
test("inserting a historical price preserves the already scheduled future price", () => {
  const plans = [
    tariff("old", "2026-01-01", null, "0.1"),
    {
      ...tariff("future", "2026-03-01", null, "0.4"),
      voorganger_id: "old",
    },
    {
      ...tariff("new", "2026-02-01", null, "0.2"),
      voorganger_id: null,
    },
  ];
  assert.equal(
    vindGeldendTarief(plans, "elektriciteit", 16, 4, "2026-01-31")?.id,
    "old",
  );
  assert.equal(
    vindGeldendTarief(plans, "elektriciteit", 16, 4, "2026-02-15")?.id,
    "new",
  );
  assert.equal(
    vindGeldendTarief(plans, "elektriciteit", 16, 4, "2026-03-10")?.id,
    "future",
  );
});
test("Sep 7 tariff change prorates selected 120 kWh into €12 and €18", () => {
  const b = bron();
  b.meterstanden = [
    stand(1, "2026-08-29", 0),
    stand(2, "2026-09-13", 150),
  ];
  const selected = analyse(b, {
    ...sel,
    vanaf: "2026-09-01",
    totEnMet: "2026-09-13",
  });
  const plans = [
    tariff("before", "2026-08-01", "2026-09-07", "0.2"),
    tariff("after", "2026-09-07", null, "0.3"),
  ].map((plan) => ({
    ...plan,
    componenten: [
      {
        ...plan.componenten[0],
        btw_percentage: "0",
      },
    ],
  }));
  const costs = berekenEnergiekosten(
    selected.rijen.flatMap((row) => row.intervallen),
    plans,
    "elektriciteit",
    "kWh",
  );
  assert.equal(selected.totaal, 120);
  assert.equal(costs.variabel, 30);
  assert.equal(costs.regels.reduce((sum, row) => sum + row.hoeveelheid, 0), 120);
  assert.equal(costs.totaal, 30);
});
test("day and night tariff costs remain separate and total without duplicate fixed charges", () => {
  const intervalWithRegisters = {
    ...interval,
    vanDatum: "2026-09-01",
    totDatum: "2026-09-11",
    bronVanaf: "2026-09-01",
    bronTot: "2026-09-11",
    dagen: 10,
    waarde: 150,
    dag: 100,
    nacht: 50,
  };
  const plan = tariff("registers", "2026-01-01", null, "0.2");
  plan.componenten = [
    { ...plan.componenten[0], soort: "dag", prijs: "0.2", btw_percentage: "0" },
    { ...plan.componenten[0], soort: "nacht", prijs: "0.3", btw_percentage: "0" },
    { ...plan.componenten[1], soort: "vast_maand", prijs: "31" },
  ];
  const day = berekenEnergiekosten(
    [intervalWithRegisters],
    [plan],
    "dagstroom",
    "kWh",
    "dag",
  );
  const night = berekenEnergiekosten(
    [intervalWithRegisters],
    [plan],
    "nachtstroom",
    "kWh",
    "nacht",
  );
  const total = berekenEnergiekosten(
    [intervalWithRegisters],
    [plan],
    "elektriciteit",
    "kWh",
  );
  assert.equal(day.variabel, 20);
  assert.equal(night.variabel, 15);
  assert.equal(day.vast, 0);
  assert.equal(night.vast, 0);
  assert.equal(total.variabel, 35);
  assert.ok(Math.abs(total.vast - 10.333333323) < 1e-9);
});
test("missing tariffs never become zero; scope precedence and overlaps", () => {
  assert.equal(
    berekenEnergiekosten([interval], [], "elektriciteit", "kWh").totaal,
    null,
  );
  const p = tariff("a", "2026-01-01", null, ".2".replace(/^\./, "0."));
  p.componenten = p.componenten.slice(0, 1);
  const w = {
    ...p,
    id: "w",
    woning_id: 16,
    componenten: [{ ...p.componenten[0], prijs: "0.1" }],
  };
  assert.equal(
    berekenEnergiekosten([interval], [p, w], "elektriciteit", "kWh")
      .variabel,
    11,
  );
  assert.equal(
    berekenEnergiekosten(
      [interval],
      [p, { ...p, id: "duplicate" }],
      "elektriciteit",
      "kWh",
    ).totaal,
    null,
  );
});
test("partial-use estimate remains available when tariff prices are missing", () => {
  const partial = analyse();
  const row = partial.rijen[0];
  const estimate = berekenBruikbareVerbruiksraming(row, 30);
  const costs = berekenEnergiekosten(
    row.intervallen,
    [],
    "elektriciteit",
    "kWh",
  );

  assert.ok(estimate);
  assert.ok(estimate.per_persoon_per_week > 0);
  assert.equal(costs.totaal, null);
  assert.ok(costs.ontbrekend.length > 0);
});
test("an explicitly registered zero price is valid and differs from no tariff", () => {
  const plan = tariff("zero", "2026-01-01", null, "0");
  plan.componenten = [plan.componenten[0]];
  assert.doesNotThrow(() => valideerTarief(plan));
  assert.equal(
    berekenEnergiekosten([interval], [plan], "elektriciteit", "kWh").totaal,
    0,
  );
  assert.equal(
    berekenEnergiekosten([interval], [], "elektriciteit", "kWh").totaal,
    null,
  );
});
test("inclusive VAT exact cent arithmetic", () => {
  const p = tariff("a", "2026-01-01", null, "0.121");
  p.componenten = [{ ...p.componenten[0], inclusief_btw: true }];
  const k = berekenEnergiekosten(
    [{ ...interval, totDatum: "2026-01-26", dagen: 1, waarde: 100 }],
    [p],
    "elektriciteit",
    "kWh",
  );
  assert.equal(k.variabel, 10);
  assert.equal(k.btw, 2.1);
  assert.equal(k.totaal, 12.1);
});
test("paginates 1501 records even under a server cap lower than requested", async () => {
  const rows = Array.from({ length: 1501 }, (_, id) => ({ id }));
  const all = await leesAlleRijen(async (a, b) => ({
    data: rows.slice(a, Math.min(b + 1, a + 100)),
    error: null,
  }));
  assert.equal(all.length, 1501);
  assert.equal(all.at(-1)?.id, 1500);
});
test("pagination refuses duplicate pages or errors", async () => {
  await assert.rejects(
    () => leesAlleRijen(async () => ({ data: [{ id: 1 }], error: null })),
    /veranderden/,
  );
  await assert.rejects(
    () =>
      leesAlleRijen(async () => ({ data: null, error: { message: "failed" } })),
    /failed/,
  );
});
test("snapshot replay is independent of subsequent corrections and customer allowlist", () => {
  const b = bron();
  const snapshot = bouwEnergieSnapshot(
    b,
    [],
    sel,
    ["elektriciteit"],
    "2026-10-13T12:00:00Z",
    "user",
    "commit",
  );
  const saved = JSON.parse(JSON.stringify(snapshot));
  assert.equal(saved.klant.producten[0].vorige_norm, null);
  assert.equal(saved.klant.producten[0].verbruik, 764);
  b.meterstanden[1].dagstroom_kwh = 70000;
  assert.equal(saved.klant.producten[0].verbruik, 764);
  const publicModel = klantSnapshot({
    ...saved.klant,
    interne_notitie: "GEHEIM",
    bewoners: [{ naam: "Privé" }],
    producten: saved.klant.producten.map((p: Record<string, unknown>) => ({
      ...p,
      kosten: { ...(p.kosten as object), geheim: "GEHEIM" },
    })),
  });
  assert.doesNotMatch(JSON.stringify(publicModel), /GEHEIM|Privé/);
  assert.equal(saved.intern.bronnen.meterstanden[1].dagstroom_kwh, 64654);
});
test("snapshot report values match the shared analysis and suppress incomplete person costs", () => {
  const b = bron();
  const fullPeriod = {
    ...sel,
    vanaf: "2026-09-07",
    totEnMet: "2026-09-23",
  };
  const plan = tariff("report", "2026-01-01", null, "0.2");
  plan.componenten = [{ ...plan.componenten[0], btw_percentage: "0" }];
  const snapshot = bouwEnergieSnapshot(
    b,
    [plan],
    fullPeriod,
    ["elektriciteit"],
    "2026-10-13T12:00:00Z",
    "user",
    "commit",
  ).klant.producten[0];
  const shared = analyse(b, fullPeriod);
  assert.equal(snapshot.verbruik, shared.totaal);
  assert.equal(
    snapshot.verbruik_per_persoon_per_periode,
    shared.totaal! / (shared.persoonsdagen / 16),
  );
  assert.equal(snapshot.kosten.totaal, 152.8);
  assert.equal(
    snapshot.kosten_per_persoon_per_week,
    152.8 / (shared.persoonsdagen / 7),
  );

  const incomplete = bouwEnergieSnapshot(
    b,
    [plan],
    sel,
    ["elektriciteit"],
    "2026-10-13T12:00:00Z",
    "user",
    "commit",
  ).klant.producten[0];
  assert.equal(incomplete.dekking, (16 / 30) * 100);
  assert.equal(incomplete.kosten_per_persoon_per_week, null);

  const zonderBewoners = bron();
  zonderBewoners.bewoners = [];
  const occupancyMissing = bouwEnergieSnapshot(
    zonderBewoners,
    [plan],
    fullPeriod,
    ["elektriciteit"],
    "2026-10-13T12:00:00Z",
    "user",
    "commit",
  ).klant.producten[0];
  assert.equal(occupancyMissing.dekking, 100);
  assert.equal(occupancyMissing.norm, null);
  assert.equal(occupancyMissing.kosten_per_persoon_per_week, null);
});
test("an intervention never automatically proves savings", () => {
  const r = analyse(bron(), {
    ...sel,
    vanaf: "2026-09-07",
    totEnMet: "2026-09-23",
  }).rijen[0];
  const effect = beoordeelMaatregel(
    r,
    { ...r, totaal: 382, per_persoon_per_week: 20.890625 },
    { vanaf: "2026-09-07", tot: "2026-09-23" },
    { vanaf: "2026-09-23", tot: "2026-10-09" },
  );
  assert.equal(effect.verbruiksvermindering, 382);
  assert.equal(effect.geverifieerde_besparing, null);
});
test("energy supplement is opt-in and adds exactly one PDF page", () => {
  assert.equal(alleKlantversieOnderdelen().has("energie_intelligence"), false);
  assert.equal(
    leesKlantversieOnderdelen("energie_intelligence").has(
      "energie_intelligence",
    ),
    true,
  );
  const doc = new jsPDF();
  doc.addPage();
  assert.equal(doc.getNumberOfPages(), 2);
  const s = bouwEnergieSnapshot(
    bron(),
    [],
    sel,
    ["elektriciteit", "gas", "water"],
    "2026-10-13T12:00:00Z",
    "user",
    "commit",
  );
  tekenEnergieRapportPagina(doc, s.klant, "Testpand");
  assert.equal(doc.getNumberOfPages(), 3);
});
test("monthly fixed fee does not make unchanged unit cost estimated", () => {
  const p = tariff("m", "2026-01-01", null, "0.2");
  p.componenten[1] = { ...p.componenten[1], soort: "vast_maand", prijs: "31" };
  const k = berekenEnergiekosten([interval], [p], "elektriciteit", "kWh");
  assert.equal(k.variabel, 22);
  assert.equal(k.geschat, false);
  assert.ok(k.totaal !== null);
  assert.ok(Math.abs(k.vast - (7 + 4.428571445)) < 1e-9);
});
test("different calendar windows are not a single benchmark cohort", () => {
  const b = bron();
  for (let i = 0; i < 5; i++) {
    const id = 20 + i;
    b.woningen.push({ id, adres: `Pand ${id}`, postcode: "", plaats: "" });
    b.verhuurperioden.push({ id, woning_id: id, bedrijf_id: 4 });
    b.bewoners.push({
      id: id * 10,
      verhuurperiode_id: id,
      incheckdatum: "2026-08-01",
      uitcheckdatum: null,
    });
    b.meterstanden.push(
      {
        ...stand(id * 10, `2026-09-${String(1 + i).padStart(2, "0")}`, 10, 1),
        woning_id: id,
      },
      {
        ...stand(
          id * 10 + 1,
          `2026-09-${String(11 + i).padStart(2, "0")}`,
          20,
          1,
        ),
        woning_id: id,
      },
    );
  }
  const a = bouwEnergiePortfolioAnalyse(b, { ...sel, minimaleDekking: 30 });
  assert.equal(a.mediaan_per_persoon_per_week, null);
});
test("trend intervals retain their property and measured-period identity", () => {
  const b = bron();
  b.woningen.push({
    id: 17,
    adres: "Tweede pand",
    postcode: "",
    plaats: "",
    status: "actief",
  });
  b.verhuurperioden.push({
    id: 13,
    woning_id: 17,
    bedrijf_id: 4,
    startdatum: "2026-08-01",
  });
  b.bewoners.push({
    id: 99,
    verhuurperiode_id: 13,
    incheckdatum: "2026-08-01",
    uitcheckdatum: null,
  });
  b.meterstanden.push(
    { ...stand(80, "2026-09-10", 0, 1), woning_id: 17 },
    { ...stand(81, "2026-09-26", 200, 1), woning_id: 17 },
  );

  const trends = analyse(b).trends;

  assert.equal(trends.length, 2);
  assert.deepEqual(
    trends.map(({ woning_id, periode, totaal }) => ({
      woning_id,
      periode,
      totaal,
    })),
    [
      { woning_id: 16, periode: "2026-09-07 → 2026-09-23", totaal: 764 },
      { woning_id: 17, periode: "2026-09-10 → 2026-09-26", totaal: 200 },
    ],
  );
  assert.deepEqual(
    trends.map((trend) => trend.per_persoon_per_week),
    [41.78125, 87.5],
  );
});
