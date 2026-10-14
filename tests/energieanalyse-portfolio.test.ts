import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  berekenPersoonsdagen,
  bouwEnergiePortfolioAnalyse,
  type EnergieMeterstand,
} from "../src/lib/energie/portfolio-analyse";

test("telt bewonersdagen halfopen zodat een wisseldag nooit dubbel telt", () => {
  const dagen = berekenPersoonsdagen(
    [
      { incheckdatum: "2026-01-01", uitcheckdatum: null },
      { incheckdatum: "2026-01-15", uitcheckdatum: "2026-01-20" },
      { incheckdatum: "2026-02-01", uitcheckdatum: null },
    ],
    "2026-01-01",
    "2026-02-01",
  );

  assert.equal(dagen, 36);
});

function stand(
  woningId: number,
  datum: string,
  elektriciteit: number,
): EnergieMeterstand {
  return {
    woning_id: woningId,
    opnamedatum: datum,
    bewoners_aantal: woningId === 1 ? 2 : 1,
    dagstroom_kwh: elektriciteit,
    nachtstroom_kwh: 0,
    elektriciteit_kwh: elektriciteit,
    gas_m3: null,
    water_m3: null,
  };
}

function brondata(verbruiken: number[]) {
  return {
    meterstanden: verbruiken.flatMap((verbruik, index) => [
      stand(index + 1, "2026-09-01", 0),
      stand(index + 1, "2026-09-08", verbruik),
    ]),
    woningen: verbruiken.map((_, index) => ({
      id: index + 1,
      adres: `Teststraat ${index + 1}`,
      postcode: "1000 AA",
      plaats: "Teststad",
    })),
    bedrijven: [
      { id: 1, naam: "Klant A" },
      { id: 2, naam: "Klant B" },
    ],
    verhuurperioden: verbruiken.map((_, index) => ({
      id: index + 1,
      woning_id: index + 1,
      bedrijf_id: index < 2 ? 1 : 2,
    })),
    bewoners: verbruiken.flatMap((_, index) => {
      const aantal = index === 0 ? 2 : 1;
      return Array.from({ length: aantal }, (__, bewonerIndex) => ({
        id: index * 10 + bewonerIndex + 1,
        verhuurperiode_id: index + 1,
        incheckdatum: "2026-09-01",
        uitcheckdatum: null,
      }));
    }),
  };
}

test("berekent portefeuillewaarde gewogen uit totaal verbruik en persoonsdagen", () => {
  const analyse = bouwEnergiePortfolioAnalyse(brondata([100, 100]), {
    niveau: "totaal",
    drager: "elektriciteit",
    vanaf: "2026-09-01",
    totEnMet: "2026-09-08",
  });

  assert.equal(analyse.totaal, 200);
  assert.equal(analyse.persoonsdagen, 21);
  assert.equal(analyse.per_persoon_per_week, 200 / 3);
  assert.notEqual(
    analyse.per_persoon_per_week,
    analyse.rijen.reduce(
      (som, rij) => som + (rij.per_persoon_per_week ?? 0),
      0,
    ) / analyse.rijen.length,
  );
});
test("sorts visible consumption values descending and leaves missing values last", () => {
  const data = brondata([100, 20, 50]);
  data.bewoners = data.bewoners.filter(
    (resident) => resident.verhuurperiode_id !== 2,
  );
  const analyse = bouwEnergiePortfolioAnalyse(data, {
    niveau: "totaal",
    drager: "elektriciteit",
    vanaf: "2026-09-01",
    totEnMet: "2026-09-08",
  });

  assert.deepEqual(
    analyse.rijen.map((rij) => rij.woning_id),
    [1, 3, 2],
  );
  assert.equal(analyse.rijen[2].per_persoon_per_week, null);
});

test("filtert klant exact via bewoner en verhuurperiode", () => {
  const analyse = bouwEnergiePortfolioAnalyse(brondata([10, 20, 30]), {
    niveau: "bedrijf",
    bedrijfId: 1,
    drager: "elektriciteit",
    vanaf: "2026-09-01",
    totEnMet: "2026-09-08",
  });

  assert.deepEqual(
    analyse.rijen.map((rij) => rij.woning_id).sort((a, b) => a - b),
    [1, 2],
  );
});

test("markeert statistische uitschieters pas met voldoende vergelijkbare panden", () => {
  const analyse = bouwEnergiePortfolioAnalyse(brondata([10, 11, 12, 13, 100]), {
    niveau: "totaal",
    drager: "elektriciteit",
    vanaf: "2026-09-01",
    totEnMet: "2026-09-08",
  });

  assert.equal(analyse.panden_in_benchmark, 5);
  assert.equal(analyse.rijen[0].woning_id, 5);
  assert.equal(analyse.rijen[0].signaal, "uitschieter");
});

test("bedrijvenoverzicht ontsluit de energieanalyse", async () => {
  const bron = await readFile("src/app/bedrijven/page.tsx", "utf8");
  const formulier = await readFile(
    "src/components/energie/EnergieAnalyseFilterFormulier.tsx",
    "utf8",
  );

  assert.match(bron, /href="\/bedrijven\/energieanalyse"/);
  assert.match(formulier, /Analyse toepassen/);
});

test("energieanalyse biedt compacte kalendermaandkeuzes voor tablet en desktop", async () => {
  const serverPagina = await readFile(
    "src/app/bedrijven/energieanalyse/page.tsx",
    "utf8",
  );
  const analysePagina = await readFile(
    "src/components/energie/EnergieMaandAnalysePagina.tsx",
    "utf8",
  );
  const selectie = await readFile(
    "src/components/energie/EnergieMaandSelectie.tsx",
    "utf8",
  );
  const beheerpagina = await readFile(
    "src/app/bedrijven/energieanalyse/beheer/page.tsx",
    "utf8",
  );
  const exportRoute = await readFile(
    "src/app/bedrijven/energieanalyse/export/route.ts",
    "utf8",
  );
  const presentationRoute = await readFile(
    "src/app/bedrijven/energieanalyse/presentatie/route.ts",
    "utf8",
  );
  const maandAnalyse = await readFile(
    "src/lib/energie/maand-analyse.ts",
    "utf8",
  );
  const afzender = await readFile("src/lib/energie/afzender.ts", "utf8");
  const grafiekkleuren = await readFile(
    "src/lib/energie/maand-kleuren.ts",
    "utf8",
  );
  assert.match(serverPagina, /EnergieMaandAnalysePagina/);
  assert.match(analysePagina, /EnergieMaandSelectie/);
  assert.doesNotMatch(selectie, /type="month"/);
  assert.match(selectie, /aria-label="Maand toevoegen"/);
  assert.match(selectie, /aria-label="Jaar toevoegen"/);
  assert.match(selectie, /name="referentiemaand"/);
  assert.match(selectie, /Niet-aaneengesloten maanden zijn toegestaan/);
  assert.match(selectie, /name="woning"/);
  assert.match(selectie, /\/bedrijven\/energieanalyse\/presentatie/);
  assert.match(selectie, /name="drager"/);
  assert.match(selectie, /Per persoon/);
  assert.match(selectie, /Totaal pand/);
  assert.match(selectie, /router\.push/);
  assert.match(analysePagina, /Gesorteerd op/);
  assert.match(analysePagina, /href="\/bedrijven\/energieanalyse\/beheer"/);
  assert.match(analysePagina, /Beheer gegevens/);
  assert.match(analysePagina, /action="\/bedrijven\/energieanalyse\/export"/);
  assert.match(analysePagina, /method="post"/);
  assert.match(exportRoute, /export async function POST/);
  assert.match(exportRoute, /Gesorteerd op/);
  assert.match(exportRoute, /ENERGIE_REKENREGELS/);
  assert.match(presentationRoute, /httpOnly: true/);
  assert.match(presentationRoute, /weergave=anoniem/);
  assert.match(presentationRoute, /"geen-panden"/);
  assert.match(presentationRoute, /NextResponse\.redirect/);
  assert.match(maandAnalyse, /Selecteer minimaal één pand/);
  assert.match(selectie, /validationErrorRef\.current\?\.focus\(\)/);
  assert.match(analysePagina, /Presentatie niet beschikbaar/);
  assert.match(analysePagina, /new URLSearchParams\("weergave=anoniem"\)/);
  assert.doesNotMatch(analysePagina, /home\.klant|home\.adres/);
  assert.doesNotMatch(exportRoute, /home\.klant/);
  assert.match(exportRoute, /label: home\.pand/);
  assert.match(exportRoute, /cfme-anonieme-energiepresentatie/);
  assert.match(analysePagina, /maximumEnergieMaandwaarde/);
  assert.match(exportRoute, /maximumEnergieMaandwaarde/);
  assert.match(analysePagina, /MonthLegend/);
  assert.match(exportRoute, /kleurEnergieMaand/);
  assert.match(afzender, /Verhuur door Mooi Valkenburg BV · Onderdeel van CFME/);
  assert.match(analysePagina, /EnergieAfzender/);
  assert.match(exportRoute, /ENERGIE_AFZENDER/);
  assert.equal((grafiekkleuren.match(/"#/g) ?? []).length, 12);
  assert.match(beheerpagina, /Meterstanden/);
  assert.match(beheerpagina, /Bewoning/);
  assert.match(beheerpagina, /Prijzen/);
  assert.match(beheerpagina, /Maatregelen/);
});
test("home analysis keeps data administration behind one management link", async () => {
  const page = await readFile(
    "src/components/energie/EnergieMaandAnalysePagina.tsx",
    "utf8",
  );
  assert.match(
    page,
    /href="\/bedrijven\/energieanalyse\/beheer"[\s\S]*?Beheer gegevens/,
  );
  assert.doesNotMatch(page, /Prijzen invoeren/);
});
