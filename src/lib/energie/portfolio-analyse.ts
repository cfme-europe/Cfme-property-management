export type Energiedrager =
  | "elektriciteit"
  | "gas"
  | "water";

export type EnergieAnalyseNiveau =
  | "totaal"
  | "bedrijf"
  | "woning";

export type EnergieMeterstand = {
  woning_id: number;
  opnamedatum: string;
  bewoners_aantal: number;
  dagstroom_kwh: number | null;
  nachtstroom_kwh: number | null;
  elektriciteit_kwh: number | null;
  gas_m3: number | null;
  water_m3: number | null;
};

export type EnergieWoning = {
  id: number;
  adres: string;
  postcode: string;
  plaats: string;
};

export type EnergieBedrijf = {
  id: number;
  naam: string;
};

export type EnergieVerhuurperiode = {
  id: number;
  woning_id: number;
  bedrijf_id: number;
};

export type EnergieBewoner = {
  id: number;
  verhuurperiode_id: number;
  incheckdatum: string;
  uitcheckdatum: string | null;
};

export type EnergieAnalyseSelectie = {
  niveau: EnergieAnalyseNiveau;
  drager: Energiedrager;
  vanaf: string;
  totEnMet: string;
  bedrijfId?: number;
  woningId?: number;
};

export type EnergieAnalyseRij = {
  woning_id: number;
  adres: string;
  postcode: string;
  plaats: string;
  bedrijven: string[];
  totaal: number;
  persoonsdagen: number;
  per_persoon_per_week: number;
  meetperioden: number;
  beschikbare_meetperioden: number;
  dekking_percentage: number;
  afwijking_mediaan_percentage: number | null;
  signaal: "laag" | "normaal" | "verhoogd" | "uitschieter";
  besparingsruimte_tot_mediaan: number;
};

export type EnergieAnalyseTrend = {
  maand: string;
  totaal: number;
  persoonsdagen: number;
  per_persoon_per_week: number;
};

export type EnergiePortfolioAnalyse = {
  selectie: EnergieAnalyseSelectie;
  eenheid: "kWh" | "m³";
  rijen: EnergieAnalyseRij[];
  trends: EnergieAnalyseTrend[];
  totaal: number;
  persoonsdagen: number;
  per_persoon_per_week: number | null;
  gemiddelde_per_persoon_per_week: number | null;
  mediaan_per_persoon_per_week: number | null;
  panden_in_benchmark: number;
  uitschieters: number;
  besparingsruimte_tot_mediaan: number;
  uitgesloten_meetperioden: number;
};

type Brondata = {
  meterstanden: EnergieMeterstand[];
  woningen: EnergieWoning[];
  bedrijven: EnergieBedrijf[];
  verhuurperioden: EnergieVerhuurperiode[];
  bewoners: EnergieBewoner[];
};

type Meetperiode = {
  woningId: number;
  vanDatum: string;
  totDatum: string;
  dagen: number;
  persoonsdagen: number;
  bedrijfIds: number[];
  elektriciteit: number | null;
  gas: number | null;
  water: number | null;
};

const DAG_MILLISECONDEN = 86_400_000;

function datumTijd(waarde: string): number {
  const [jaar, maand, dag] = waarde.split("-").map(Number);
  return Date.UTC(jaar, maand - 1, dag);
}

function dagenTussen(vanaf: string, tot: string): number {
  return Math.max(
    0,
    Math.round((datumTijd(tot) - datumTijd(vanaf)) / DAG_MILLISECONDEN),
  );
}

export function berekenPersoonsdagen(
  bewoners: Array<Pick<EnergieBewoner, "incheckdatum" | "uitcheckdatum">>,
  vanaf: string,
  totExclusief: string,
): number {
  const begin = datumTijd(vanaf);
  const einde = datumTijd(totExclusief);

  return bewoners.reduce((totaal, bewoner) => {
    const overlapBegin = Math.max(begin, datumTijd(bewoner.incheckdatum));
    const overlapEinde = Math.min(
      einde,
      bewoner.uitcheckdatum
        ? datumTijd(bewoner.uitcheckdatum)
        : einde,
    );

    return totaal + Math.max(0, (overlapEinde - overlapBegin) / DAG_MILLISECONDEN);
  }, 0);
}

function verschil(
  vorige: number | null,
  huidige: number | null,
): number | null {
  if (vorige === null || huidige === null || huidige < vorige) {
    return null;
  }

  return huidige - vorige;
}

function elektriciteitsverschil(
  vorige: EnergieMeterstand,
  huidige: EnergieMeterstand,
): number | null {
  const totaal = verschil(
    vorige.elektriciteit_kwh,
    huidige.elektriciteit_kwh,
  );

  if (totaal !== null) {
    return totaal;
  }

  const dag = verschil(vorige.dagstroom_kwh, huidige.dagstroom_kwh);
  const nacht = verschil(vorige.nachtstroom_kwh, huidige.nachtstroom_kwh);

  if (dag === null && nacht === null) {
    return null;
  }

  return (dag ?? 0) + (nacht ?? 0);
}

function mediaan(waarden: number[]): number | null {
  if (waarden.length === 0) return null;

  const gesorteerd = [...waarden].sort((a, b) => a - b);
  const midden = Math.floor(gesorteerd.length / 2);

  return gesorteerd.length % 2 === 0
    ? (gesorteerd[midden - 1] + gesorteerd[midden]) / 2
    : gesorteerd[midden];
}

function kwartiel(waarden: number[], positie: number): number | null {
  if (waarden.length === 0) return null;

  const gesorteerd = [...waarden].sort((a, b) => a - b);
  const index = (gesorteerd.length - 1) * positie;
  const onder = Math.floor(index);
  const boven = Math.ceil(index);

  if (onder === boven) return gesorteerd[onder];

  return (
    gesorteerd[onder] +
    (gesorteerd[boven] - gesorteerd[onder]) * (index - onder)
  );
}

function maakMeetperioden(brondata: Brondata): Meetperiode[] {
  const verhuurPerId = new Map(
    brondata.verhuurperioden.map((periode) => [periode.id, periode]),
  );
  const bewonersPerWoning = new Map<number, Array<EnergieBewoner & { bedrijfId: number }>>();

  for (const bewoner of brondata.bewoners) {
    const verhuur = verhuurPerId.get(bewoner.verhuurperiode_id);
    if (!verhuur) continue;

    const lijst = bewonersPerWoning.get(verhuur.woning_id) ?? [];
    lijst.push({ ...bewoner, bedrijfId: verhuur.bedrijf_id });
    bewonersPerWoning.set(verhuur.woning_id, lijst);
  }

  const standenPerWoning = new Map<number, EnergieMeterstand[]>();
  for (const stand of brondata.meterstanden) {
    const lijst = standenPerWoning.get(stand.woning_id) ?? [];
    lijst.push(stand);
    standenPerWoning.set(stand.woning_id, lijst);
  }

  const periodes: Meetperiode[] = [];

  for (const [woningId, ongesorteerdeStanden] of standenPerWoning) {
    const standen = [...ongesorteerdeStanden].sort(
      (a, b) => datumTijd(a.opnamedatum) - datumTijd(b.opnamedatum),
    );
    const bewoners = bewonersPerWoning.get(woningId) ?? [];

    for (let index = 1; index < standen.length; index += 1) {
      const vorige = standen[index - 1];
      const huidige = standen[index];
      const dagen = dagenTussen(vorige.opnamedatum, huidige.opnamedatum);

      if (dagen <= 0) continue;

      const overlappendeBewoners = bewoners.filter(
        (bewoner) =>
          bewoner.incheckdatum < huidige.opnamedatum &&
          (bewoner.uitcheckdatum === null ||
            bewoner.uitcheckdatum > vorige.opnamedatum),
      );
      const bedrijfIds = Array.from(
        new Set(overlappendeBewoners.map((bewoner) => bewoner.bedrijfId)),
      );

      periodes.push({
        woningId,
        vanDatum: vorige.opnamedatum,
        totDatum: huidige.opnamedatum,
        dagen,
        persoonsdagen: berekenPersoonsdagen(
          overlappendeBewoners,
          vorige.opnamedatum,
          huidige.opnamedatum,
        ),
        bedrijfIds,
        elektriciteit: elektriciteitsverschil(vorige, huidige),
        gas: verschil(vorige.gas_m3, huidige.gas_m3),
        water: verschil(vorige.water_m3, huidige.water_m3),
      });
    }
  }

  return periodes;
}

function binnenPeriode(
  periode: Meetperiode,
  selectie: EnergieAnalyseSelectie,
): boolean {
  return (
    periode.vanDatum >= selectie.vanaf &&
    periode.totDatum <= selectie.totEnMet
  );
}

function pastBinnenScope(
  periode: Meetperiode,
  selectie: EnergieAnalyseSelectie,
): boolean {
  if (selectie.niveau === "woning") {
    return periode.woningId === selectie.woningId;
  }

  if (selectie.niveau === "bedrijf") {
    return (
      periode.bedrijfIds.length === 1 &&
      periode.bedrijfIds[0] === selectie.bedrijfId
    );
  }

  return true;
}

function groepeerPerWoning(
  periodes: Meetperiode[],
  allePeriodes: Meetperiode[],
  selectie: EnergieAnalyseSelectie,
  brondata: Brondata,
): Omit<
  EnergieAnalyseRij,
  | "afwijking_mediaan_percentage"
  | "signaal"
  | "besparingsruimte_tot_mediaan"
>[] {
  const woningMap = new Map(brondata.woningen.map((woning) => [woning.id, woning]));
  const bedrijfMap = new Map(brondata.bedrijven.map((bedrijf) => [bedrijf.id, bedrijf.naam]));
  const perWoning = new Map<number, Meetperiode[]>();

  for (const periode of periodes) {
    const lijst = perWoning.get(periode.woningId) ?? [];
    lijst.push(periode);
    perWoning.set(periode.woningId, lijst);
  }

  return Array.from(perWoning.entries()).flatMap(([woningId, woningPeriodes]) => {
    const woning = woningMap.get(woningId);
    if (!woning) return [];

    const bruikbaar = woningPeriodes.filter(
      (periode) =>
        periode[selectie.drager] !== null && periode.persoonsdagen > 0,
    );

    if (bruikbaar.length === 0) return [];

    const totaal = bruikbaar.reduce(
      (som, periode) => som + (periode[selectie.drager] ?? 0),
      0,
    );
    const persoonsdagen = bruikbaar.reduce(
      (som, periode) => som + periode.persoonsdagen,
      0,
    );
    const beschikbareMeetperioden = allePeriodes.filter(
      (periode) =>
        periode.woningId === woningId &&
        binnenPeriode(periode, selectie) &&
        pastBinnenScope(periode, selectie),
    ).length;
    const bedrijfIds = Array.from(
      new Set(bruikbaar.flatMap((periode) => periode.bedrijfIds)),
    );

    return [
      {
        woning_id: woningId,
        adres: woning.adres,
        postcode: woning.postcode,
        plaats: woning.plaats,
        bedrijven: bedrijfIds
          .map((id) => bedrijfMap.get(id))
          .filter((naam): naam is string => Boolean(naam))
          .sort((a, b) => a.localeCompare(b, "nl")),
        totaal,
        persoonsdagen,
        per_persoon_per_week: totaal / (persoonsdagen / 7),
        meetperioden: bruikbaar.length,
        beschikbare_meetperioden: beschikbareMeetperioden,
        dekking_percentage:
          beschikbareMeetperioden === 0
            ? 0
            : (bruikbaar.length / beschikbareMeetperioden) * 100,
      },
    ];
  });
}

export function bouwEnergiePortfolioAnalyse(
  brondata: Brondata,
  selectie: EnergieAnalyseSelectie,
): EnergiePortfolioAnalyse {
  const meetperioden = maakMeetperioden(brondata);
  const binnenDatumbereik = meetperioden.filter((periode) =>
    binnenPeriode(periode, selectie),
  );
  const scopePeriodes = binnenDatumbereik.filter((periode) =>
    pastBinnenScope(periode, selectie),
  );
  const benchmarkSelectie: EnergieAnalyseSelectie = {
    ...selectie,
    niveau: "totaal",
    bedrijfId: undefined,
    woningId: undefined,
  };
  const benchmarkRijen = groepeerPerWoning(
    binnenDatumbereik,
    meetperioden,
    benchmarkSelectie,
    brondata,
  );
  const kaleRijen = groepeerPerWoning(
    scopePeriodes,
    meetperioden,
    selectie,
    brondata,
  );
  const benchmarkWaarden = benchmarkRijen.map(
    (rij) => rij.per_persoon_per_week,
  );
  const benchmarkMediaan = mediaan(benchmarkWaarden);
  const q1 = kwartiel(benchmarkWaarden, 0.25);
  const q3 = kwartiel(benchmarkWaarden, 0.75);
  const bovengrensUitschieter =
    benchmarkWaarden.length >= 5 && q1 !== null && q3 !== null
      ? q3 + 1.5 * (q3 - q1)
      : null;

  const rijen: EnergieAnalyseRij[] = kaleRijen
    .map((rij) => {
      const afwijking =
        benchmarkMediaan !== null && benchmarkMediaan > 0
          ? ((rij.per_persoon_per_week - benchmarkMediaan) /
              benchmarkMediaan) *
            100
          : null;
      const signaal: EnergieAnalyseRij["signaal"] =
        bovengrensUitschieter !== null &&
        rij.per_persoon_per_week > bovengrensUitschieter
          ? "uitschieter"
          : afwijking !== null && afwijking >= 20
            ? "verhoogd"
            : afwijking !== null && afwijking <= -20
              ? "laag"
              : "normaal";
      const besparingsruimte =
        benchmarkMediaan === null
          ? 0
          : Math.max(
              0,
              (rij.per_persoon_per_week - benchmarkMediaan) *
                (rij.persoonsdagen / 7),
            );

      return {
        ...rij,
        afwijking_mediaan_percentage: afwijking,
        signaal,
        besparingsruimte_tot_mediaan: besparingsruimte,
      };
    })
    .sort((a, b) => b.per_persoon_per_week - a.per_persoon_per_week);

  const bruikbareScopePeriodes = scopePeriodes.filter(
    (periode) =>
      periode[selectie.drager] !== null && periode.persoonsdagen > 0,
  );
  const totaal = bruikbareScopePeriodes.reduce(
    (som, periode) => som + (periode[selectie.drager] ?? 0),
    0,
  );
  const persoonsdagen = bruikbareScopePeriodes.reduce(
    (som, periode) => som + periode.persoonsdagen,
    0,
  );
  const trendMap = new Map<string, { totaal: number; persoonsdagen: number }>();

  for (const periode of bruikbareScopePeriodes) {
    const maand = periode.totDatum.slice(0, 7);
    const huidig = trendMap.get(maand) ?? { totaal: 0, persoonsdagen: 0 };
    huidig.totaal += periode[selectie.drager] ?? 0;
    huidig.persoonsdagen += periode.persoonsdagen;
    trendMap.set(maand, huidig);
  }

  const trends = Array.from(trendMap.entries())
    .map(([maand, waarde]) => ({
      maand,
      totaal: waarde.totaal,
      persoonsdagen: waarde.persoonsdagen,
      per_persoon_per_week:
        waarde.totaal / (waarde.persoonsdagen / 7),
    }))
    .sort((a, b) => a.maand.localeCompare(b.maand));
  const gemiddelde =
    benchmarkWaarden.length === 0
      ? null
      : benchmarkWaarden.reduce((som, waarde) => som + waarde, 0) /
        benchmarkWaarden.length;

  return {
    selectie,
    eenheid: selectie.drager === "elektriciteit" ? "kWh" : "m³",
    rijen,
    trends,
    totaal,
    persoonsdagen,
    per_persoon_per_week:
      persoonsdagen > 0 ? totaal / (persoonsdagen / 7) : null,
    gemiddelde_per_persoon_per_week: gemiddelde,
    mediaan_per_persoon_per_week: benchmarkMediaan,
    panden_in_benchmark: benchmarkRijen.length,
    uitschieters: rijen.filter((rij) => rij.signaal === "uitschieter").length,
    besparingsruimte_tot_mediaan: rijen.reduce(
      (som, rij) => som + rij.besparingsruimte_tot_mediaan,
      0,
    ),
    uitgesloten_meetperioden:
      scopePeriodes.length - bruikbareScopePeriodes.length,
  };
}

export function bepaalEnergieDatumbereik(
  meterstanden: EnergieMeterstand[],
): { vanaf: string; totEnMet: string } | null {
  if (meterstanden.length < 2) return null;

  const datums = meterstanden
    .map((meterstand) => meterstand.opnamedatum)
    .sort();

  return {
    vanaf: datums[0],
    totEnMet: datums.at(-1) ?? datums[0],
  };
}
