import assert from "node:assert/strict";
import test from "node:test";
import {
  beschikbareEnergieWoningen,
  EnergieSelectieValidatieFout,
  leesSelectie,
} from "../src/lib/energie/selectie";
import type { Brondata } from "../src/lib/energie/portfolio-analyse";

function bron(): Brondata {
  return {
    woningen: [
      {
        id: 1,
        adres: "Actief pand 1",
        postcode: "",
        plaats: "",
        status: "actief",
      },
      {
        id: 2,
        adres: "Gearchiveerd pand",
        postcode: "",
        plaats: "",
        status: "gearchiveerd",
      },
      {
        id: 3,
        adres: "Actief pand 3",
        postcode: "",
        plaats: "",
        status: "actief",
      },
    ],
    bedrijven: [
      { id: 10, naam: "Klant 10" },
      { id: 20, naam: "Klant 20" },
    ],
    verhuurperioden: [
      {
        id: 100,
        woning_id: 1,
        bedrijf_id: 10,
        startdatum: "2025-01-01",
        werkelijke_einddatum: "2026-02-01",
      },
      {
        id: 200,
        woning_id: 2,
        bedrijf_id: 10,
        startdatum: "2026-02-01",
        werkelijke_einddatum: null,
      },
      {
        id: 300,
        woning_id: 3,
        bedrijf_id: 20,
        startdatum: "2026-03-01",
        werkelijke_einddatum: null,
      },
    ],
    bewoners: [],
    meterstanden: [],
  };
}

const periode = {
  vanaf: "2026-02-01",
  tot: "2026-03-15",
  producten_ingediend: "1",
  drager: "elektriciteit",
};

test("alle relevante panden vereist geen expliciete pandkeuze", () => {
  const { selectie } = leesSelectie(
    { ...periode, niveau: "totaal" },
    bron(),
  );

  assert.deepEqual(selectie.bedrijfIds, []);
  assert.deepEqual(selectie.woningIds, []);
});

test("een klantselectie zonder pandbeperking neemt alle relevante panden mee", () => {
  const { selectie } = leesSelectie(
    {
      ...periode,
      niveau: "bedrijf",
      bedrijf: "10",
    },
    bron(),
  );

  assert.deepEqual(selectie.bedrijfIds, [10]);
  assert.deepEqual(selectie.woningIds, []);
});

test("selectievalidatie meldt het klant- of pandveld en behoudt selectiecontext", () => {
  assert.throws(
    () => leesSelectie({ ...periode, niveau: "bedrijf" }, bron()),
    (error: unknown) =>
      error instanceof EnergieSelectieValidatieFout &&
      error.veld === "bedrijf" &&
      /minimaal één klant/.test(error.message),
  );

  assert.throws(
    () => leesSelectie({ ...periode, niveau: "woning" }, bron()),
    (error: unknown) =>
      error instanceof EnergieSelectieValidatieFout &&
      error.veld === "woning" &&
      /minimaal één pand/.test(error.message),
  );
});

test("datumvalidatie koppelt foutmeldingen aan het ongeldige datumveld", () => {
  assert.throws(
    () =>
      leesSelectie(
        {
          niveau: "totaal",
          vanaf: "2026-02-30",
          tot: "2026-03-15",
        },
        bron(),
      ),
    (error: unknown) =>
      error instanceof EnergieSelectieValidatieFout &&
      error.veld === "vanaf",
  );
  assert.throws(
    () =>
      leesSelectie(
        {
          niveau: "totaal",
          vanaf: "2026-03-15",
          tot: "2026-03-01",
        },
        bron(),
      ),
    (error: unknown) =>
      error instanceof EnergieSelectieValidatieFout &&
      error.veld === "tot",
  );
});

test("een expliciet ingediende lege productselectie schakelt niets automatisch in", () => {
  assert.throws(
    () =>
      leesSelectie(
        { ...periode, niveau: "totaal", drager: undefined },
        bron(),
      ),
    (error: unknown) =>
      error instanceof EnergieSelectieValidatieFout &&
      error.veld === "drager" &&
      /minimaal één energieproduct/.test(error.message),
  );
});

test("eerste paginalaad behoudt elektriciteit als standaardproduct", () => {
  const { dragers } = leesSelectie(
    {
      niveau: "totaal",
      vanaf: periode.vanaf,
      tot: periode.tot,
    },
    bron(),
  );

  assert.deepEqual(dragers, ["elektriciteit"]);
});

test("beschikbare panden volgen klant, halfopen periode en archiefkeuze", () => {
  const data = bron();
  const filters = {
    bedrijfIds: [10],
    vanaf: periode.vanaf,
    totEnMet: periode.tot,
    archief: false,
  };

  assert.deepEqual(beschikbareEnergieWoningen(data, filters), []);
  assert.deepEqual(
    beschikbareEnergieWoningen(data, { ...filters, archief: true }).map(
      (woning) => woning.id,
    ),
    [2],
  );
  assert.deepEqual(
    beschikbareEnergieWoningen(data, {
      ...filters,
      bedrijfIds: [20],
    }).map((woning) => woning.id),
    [3],
  );
});
