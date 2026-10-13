import {
  controleerPeriode,
  dagen,
  datumTijd,
  gedekteDagen,
  kwartiel,
  verschil,
} from "./rekenregels";
import { elektriciteitsMeting, type RegisterType } from "./metingen";
export type Energiedrager = "elektriciteit" | "gas" | "water";
export type EnergieAnalyseNiveau = "totaal" | "bedrijf" | "woning";
export type EnergieMeterstand = {
  id?: number;
  woning_id: number;
  opnamedatum: string;
  bewoners_aantal: number;
  dagstroom_kwh: number | null;
  nachtstroom_kwh: number | null;
  elektriciteit_kwh: number | null;
  elektriciteit_dag_kwh?: number | null;
  elektriciteit_nacht_kwh?: number | null;
  gas_m3: number | null;
  water_m3: number | null;
  analyse_status?: string;
  analyse_resultaat?: unknown;
  opvolging_nodig?: boolean;
  updated_at?: string;
  meteruitzonderingen?: unknown;
};
export type EnergieWoning = {
  id: number;
  adres: string;
  postcode: string;
  plaats: string;
  status?: string;
};
export type EnergieBedrijf = { id: number; naam: string };
export type EnergieVerhuurperiode = {
  id: number;
  woning_id: number;
  bedrijf_id: number;
  startdatum?: string;
  werkelijke_einddatum?: string | null;
};
export type EnergieBewoner = {
  id: number;
  verhuurperiode_id: number;
  incheckdatum: string;
  uitcheckdatum: string | null;
};
export type Meterconfiguratie = {
  id?: string;
  voorganger_id?: string | null;
  woning_id: number;
  product: string;
  vanaf: string;
  tot: string | null;
  registertype: RegisterType;
  meteridentiteit: string;
};
export type EnergieAnalyseSelectie = {
  niveau: EnergieAnalyseNiveau;
  drager: Energiedrager;
  vanaf: string;
  totEnMet: string;
  bedrijfId?: number;
  woningId?: number;
  bedrijfIds?: number[];
  woningIds?: number[];
  modus?: "exact" | "schatting";
  minimaleDekking?: number;
  archief?: boolean;
  kwaliteit?: "alle" | "betrouwbaar" | "controleren";
};
export type EnergieInterval = {
  woningId: number;
  vanDatum: string;
  totDatum: string;
  bronVanaf: string;
  bronTot: string;
  bronIds: number[];
  dagen: number;
  persoonsdagen: number;
  bedrijfIds: number[];
  waarde: number | null;
  dag: number | null;
  nacht: number | null;
  meteridentiteit?: string | null;
  geschat: boolean;
  meldingen: string[];
  bezettingsconflict: boolean;
  betrouwbaar: boolean;
  anomalie: string | null;
};
export type EnergieAnalyseRij = {
  woning_id: number;
  adres: string;
  postcode: string;
  plaats: string;
  bedrijven: string[];
  totaal: number | null;
  persoonsdagen: number;
  per_persoon_per_week: number | null;
  meetperioden: number;
  beschikbare_meetperioden: number;
  dekking_percentage: number;
  exacte_dekking_percentage: number;
  afwijking_mediaan_percentage: number | null;
  signaal: "laag" | "normaal" | "verhoogd" | "uitschieter" | "onvoldoende_data";
  besparingsruimte_tot_mediaan: number;
  betrouwbaarheid:
    "exact" | "gedeeltelijk" | "geschat" | "controleren" | "onvoldoende_data";
  meldingen: string[];
  intervallen: EnergieInterval[];
  benchmark_geschikt: boolean;
};
export type EnergieAnalyseTrend = {
  woning_id: number;
  adres: string;
  periode: string;
  totaal: number;
  persoonsdagen: number;
  per_persoon_per_week: number | null;
  geschat: boolean;
};
export type EnergiePortfolioAnalyse = {
  selectie: EnergieAnalyseSelectie;
  eenheid: "kWh" | "m³";
  rijen: EnergieAnalyseRij[];
  trends: EnergieAnalyseTrend[];
  totaal: number | null;
  persoonsdagen: number;
  per_persoon_per_week: number | null;
  gemiddelde_per_persoon_per_week: number | null;
  mediaan_per_persoon_per_week: number | null;
  panden_in_benchmark: number;
  uitschieters: number;
  besparingsruimte_tot_mediaan: number;
  uitgesloten_meetperioden: number;
  dekking_percentage: number;
  benchmark_toelichting: string;
};
export type Brondata = {
  meterstanden: EnergieMeterstand[];
  woningen: EnergieWoning[];
  bedrijven: EnergieBedrijf[];
  verhuurperioden: EnergieVerhuurperiode[];
  bewoners: EnergieBewoner[];
  meterconfiguraties?: Meterconfiguratie[];
};
export function berekenPersoonsdagen(
  bewoners: Array<Pick<EnergieBewoner, "incheckdatum" | "uitcheckdatum">>,
  vanaf: string,
  totExclusief: string,
): number {
  return bewoners.reduce(
    (som, b) =>
      som +
      Math.max(
        0,
        (Math.min(
          datumTijd(totExclusief),
          datumTijd(b.uitcheckdatum ?? totExclusief),
        ) -
          Math.max(datumTijd(vanaf), datumTijd(b.incheckdatum))) /
          86400000,
      ),
    0,
  );
}
function bewonersVoorWoning(bron: Brondata, id: number) {
  return bron.bewoners.flatMap((b) => {
    const huur = bron.verhuurperioden.find(
      (v) => v.id === b.verhuurperiode_id && v.woning_id === id,
    );
    if (!huur) return [];
    const start =
      huur.startdatum && huur.startdatum > b.incheckdatum
        ? huur.startdatum
        : b.incheckdatum;
    const eind =
      [b.uitcheckdatum, huur.werkelijke_einddatum]
        .filter((s): s is string => !!s)
        .sort()[0] ?? null;
    return eind && eind <= start
      ? []
      : [{ ...b, incheckdatum: start, uitcheckdatum: eind }];
  });
}
function object(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}
function status(m: EnergieMeterstand, drager: string): string | null {
  const r = object(m.analyse_resultaat);
  const dragers = r.dragers;
  const per = Array.isArray(dragers)
    ? dragers.find((d) => object(d).drager === drager)
    : object(dragers)[drager];
  const s = object(per).status ?? object(r[drager]).status;
  // Never assign a gas anomaly to electricity through the global worst status.
  return typeof s === "string" ? s : null;
}
export function maakMeetperioden(
  bron: Brondata,
  sel: EnergieAnalyseSelectie,
): EnergieInterval[] {
  const result: EnergieInterval[] = [];
  for (const woning of bron.woningen) {
    const bewoners = bewonersVoorWoning(bron, woning.id);
    const standen = bron.meterstanden
      .filter(
        (m) =>
          m.woning_id === woning.id &&
          (sel.drager === "gas"
            ? m.gas_m3 !== null
            : sel.drager === "water"
              ? m.water_m3 !== null
              : m.elektriciteit_kwh !== null ||
                m.dagstroom_kwh !== null ||
                m.nachtstroom_kwh !== null),
      )
      .sort((a, b) => a.opnamedatum.localeCompare(b.opnamedatum));
    const datumAantal = new Map<string, number>();
    for (const m of standen)
      datumAantal.set(m.opnamedatum, (datumAantal.get(m.opnamedatum) ?? 0) + 1);
    const dubbeleDatums = new Set(
      [...datumAantal].filter(([, n]) => n > 1).map(([d]) => d),
    );
    for (let n = 1; n < standen.length; n++) {
      const a = standen[n - 1],
        b = standen[n];
      if (dagen(a.opnamedatum, b.opnamedatum) <= 0) continue;
      if (b.opnamedatum <= sel.vanaf || a.opnamedatum >= sel.totEnMet) continue;
      const van = a.opnamedatum < sel.vanaf ? sel.vanaf : a.opnamedatum,
        tot = b.opnamedatum > sel.totEnMet ? sel.totEnMet : b.opnamedatum;
      const geschat = van !== a.opnamedatum || tot !== b.opnamedatum;
      if (geschat && sel.modus !== "schatting") continue;
      const configs = (bron.meterconfiguraties ?? []).filter(
        (c) =>
          c.woning_id === woning.id &&
          c.product === sel.drager &&
          c.vanaf <= a.opnamedatum &&
          (!c.tot || c.tot >= b.opnamedatum),
      );
      const electric = elektriciteitsMeting(
        a,
        b,
        configs.length === 1 ? configs[0].registertype : undefined,
      );
      const meldingen =
        sel.drager === "elektriciteit" ? [...electric.meldingen] : [];
      if (dubbeleDatums.has(a.opnamedatum) || dubbeleDatums.has(b.opnamedatum))
        meldingen.push("Dubbele meteropname op dezelfde datum");
      if (
        (bron.meterconfiguraties ?? []).some(
          (c) =>
            c.woning_id === woning.id &&
            c.product === sel.drager &&
            c.vanaf > a.opnamedatum &&
            c.vanaf < b.opnamedatum,
        )
      )
        meldingen.push("Meterwissel binnen meetinterval");
      if (configs.length > 1) meldingen.push("Overlappende meterconfiguraties");
      const bronWaarde =
        sel.drager === "elektriciteit"
          ? electric.waarde
          : verschil(
              sel.drager === "gas" ? a.gas_m3 : a.water_m3,
              sel.drager === "gas" ? b.gas_m3 : b.water_m3,
            );
      if (bronWaarde === null)
        meldingen.push("Ontbrekende of teruglopende meterstand");
      const aanwezig = (d: string) =>
        bewoners.filter(
          (x) =>
            x.incheckdatum <= d && (!x.uitcheckdatum || x.uitcheckdatum > d),
        ).length;
      const conflict =
        aanwezig(a.opnamedatum) !== a.bewoners_aantal ||
        aanwezig(b.opnamedatum) !== b.bewoners_aantal;
      if (conflict)
        meldingen.push(
          "Bewonersadministratie en meteropname spreken elkaar tegen",
        );
      const pd = berekenPersoonsdagen(bewoners, van, tot);
      if (pd === 0)
        meldingen.push(
          "Geen geregistreerde bewonersdagen; persoonsnorm onbekend",
        );
      const huur = bron.verhuurperioden.filter(
        (v) =>
          v.woning_id === woning.id &&
          (!v.startdatum || v.startdatum < tot) &&
          (!v.werkelijke_einddatum || v.werkelijke_einddatum > van),
      );
      const bedrijfIds = [...new Set(huur.map((v) => v.bedrijf_id))];
      const anomalie = status(b, sel.drager);
      const beginOnwaarschijnlijk = status(a, sel.drager) === "onwaarschijnlijk";
      if(beginOnwaarschijnlijk) meldingen.push("Beginopname heeft onwaarschijnlijk verbruik; controle vereist");
      if (anomalie === "onwaarschijnlijk")
        meldingen.push("Onwaarschijnlijk verbruik: controle vereist");
      if (b.opvolging_nodig)
        meldingen.push(
          "Opvolging bij meteropname geregistreerd; zie status per energiedrager",
        );
      const betrouwbaar =
        bronWaarde !== null &&
        anomalie !== "onwaarschijnlijk" && !beginOnwaarschijnlijk &&
        !meldingen.some((m) =>
          /Meterwissel|Dubbele|Overlappende|configuratie|Tegenstrijdige|Totaalmeter wijkt/.test(
            m,
          ),
        );
      const factor = dagen(van, tot) / dagen(a.opnamedatum, b.opnamedatum);
      result.push({
        woningId: woning.id,
        vanDatum: van,
        totDatum: tot,
        bronVanaf: a.opnamedatum,
        bronTot: b.opnamedatum,
        bronIds: [a.id, b.id].filter((i): i is number => i !== undefined),
        dagen: dagen(van, tot),
        persoonsdagen: pd,
        bedrijfIds,
        waarde: bronWaarde === null ? null : bronWaarde * factor,
        dag: electric.dag === null ? null : electric.dag * factor,
        nacht: electric.nacht === null ? null : electric.nacht * factor,
        meteridentiteit:
          configs.length === 1 ? configs[0].meteridentiteit : null,
        geschat,
        meldingen,
        bezettingsconflict: conflict,
        betrouwbaar,
        anomalie,
      });
    }
  }
  return result;
}
export function bouwEnergiePortfolioAnalyse(
  bron: Brondata,
  sel: EnergieAnalyseSelectie,
): EnergiePortfolioAnalyse {
  controleerPeriode(sel.vanaf, sel.totEnMet);
  const min = sel.minimaleDekking ?? 100;
  if (!Number.isFinite(min) || min < 0 || min > 100)
    throw new Error("Dekking moet tussen 0 en 100 liggen.");
  const bedrijven =
    sel.niveau === "woning"
      ? []
      : (sel.bedrijfIds ??
        (sel.niveau === "bedrijf" && sel.bedrijfId ? [sel.bedrijfId] : []));
  const woningen =
    sel.woningIds ??
    (sel.niveau === "woning" && sel.woningId ? [sel.woningId] : []);
  const selected = bron.woningen.filter(
    (w) =>
      (sel.archief || !w.status || w.status === "actief") &&
      (!bedrijven.length ||
        bron.verhuurperioden.some(
          (v) =>
            v.woning_id === w.id &&
            bedrijven.includes(v.bedrijf_id) &&
            (!v.startdatum || v.startdatum < sel.totEnMet) &&
            (!v.werkelijke_einddatum || v.werkelijke_einddatum > sel.vanaf),
        )),
  );
  const intervals = maakMeetperioden({ ...bron, woningen: selected }, sel);
  const rijen: EnergieAnalyseRij[] = selected.map((w) => {
    const all = intervals.filter((i) => i.woningId === w.id);
    const accepted = all.filter(
      (i) =>
        !bedrijven.length ||
        (i.bedrijfIds.length === 1 && bedrijven.includes(i.bedrijfIds[0])),
    );
    const usable = accepted.filter((i) => i.waarde !== null && i.betrouwbaar);
    const meldingen = [...new Set(all.flatMap((i) => i.meldingen))];
    if (accepted.length !== all.length)
      meldingen.push(
        "Interval met klantwissel niet exact aan één klant toerekenbaar",
      );
    const totaal = usable.length
        ? usable.reduce((s, i) => s + i.waarde!, 0)
        : null,
      pd = usable.reduce((s, i) => s + i.persoonsdagen, 0);
    const norm =
      pd > 0 && !usable.some((i) => i.bezettingsconflict)
        ? totaal! / (pd / 7)
        : null;
    const dekking =
        (100 * gedekteDagen(usable)) / dagen(sel.vanaf, sel.totEnMet),
      exact =
        (100 * gedekteDagen(usable.filter((i) => !i.geschat))) /
        dagen(sel.vanaf, sel.totEnMet);
    const kwaliteit: EnergieAnalyseRij["betrouwbaarheid"] = all.some(
      (i) => !i.betrouwbaar || i.bezettingsconflict,
    )
      ? "controleren"
      : !usable.length
        ? "onvoldoende_data"
        : usable.some((i) => i.geschat)
          ? "geschat"
          : dekking < 100
            ? "gedeeltelijk"
            : "exact";
    return {
      woning_id: w.id,
      adres: w.adres,
      postcode: w.postcode,
      plaats: w.plaats,
      bedrijven: [...new Set(accepted.flatMap((i) => i.bedrijfIds))].map(
        (id) =>
          bron.bedrijven.find((b) => b.id === id)?.naam ?? "Onbekende klant",
      ),
      totaal,
      persoonsdagen: pd,
      per_persoon_per_week: norm,
      meetperioden: usable.length,
      beschikbare_meetperioden: all.length,
      dekking_percentage: dekking,
      exacte_dekking_percentage: exact,
      afwijking_mediaan_percentage: null,
      signaal: "onvoldoende_data",
      besparingsruimte_tot_mediaan: 0,
      betrouwbaarheid: kwaliteit,
      meldingen,
      intervallen: all.map((i) =>
        accepted.includes(i)
          ? i
          : {
              ...i,
              betrouwbaar: false,
              meldingen: [
                ...i.meldingen,
                "Niet aan geselecteerde klant toerekenbaar",
              ],
            },
      ),
      benchmark_geschikt:
        norm !== null &&
        dekking >= min &&
        kwaliteit !== "controleren" &&
        kwaliteit !== "geschat",
    };
  });
  // Only identical observed windows form a cohort, even with a lowered exploratory threshold.
  const windows = (r: EnergieAnalyseRij) =>
    r.intervallen
      .filter((i) => i.betrouwbaar && i.waarde !== null)
      .map((i) => `${i.vanDatum}:${i.totDatum}`)
      .join("|");
  const groups = new Map<string, EnergieAnalyseRij[]>();
  for (const r of rijen.filter((r) => r.benchmark_geschikt)) {
    const key = r.dekking_percentage === 100 ? "volledig" : windows(r);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const cohort =
    [...groups.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  const eligible = new Set(cohort.map((r) => r.woning_id));
  const rates = cohort.map((r) => r.per_persoon_per_week!);
  const median = rates.length >= 5 ? kwartiel(rates, 0.5) : null,
    q1 = kwartiel(rates, 0.25),
    q3 = kwartiel(rates, 0.75);
  for (const r of rijen) {
    r.benchmark_geschikt = eligible.has(r.woning_id);
    if (!r.benchmark_geschikt || median === null || median <= 0) continue;
    r.afwijking_mediaan_percentage =
      (100 * (r.per_persoon_per_week! - median)) / median;
    r.signaal =
      q1 !== null &&
      q3 !== null &&
      q3 > q1 &&
      r.per_persoon_per_week! > q3 + 1.5 * (q3 - q1)
        ? "uitschieter"
        : r.afwijking_mediaan_percentage >= 20
          ? "verhoogd"
          : r.afwijking_mediaan_percentage <= -20
            ? "laag"
            : "normaal";
    r.besparingsruimte_tot_mediaan = Math.max(
      0,
      ((r.per_persoon_per_week! - median) * r.persoonsdagen) / 7,
    );
  }
  const scopeRijen = rijen.filter(
    (r) => !woningen.length || woningen.includes(r.woning_id),
  );
  const filtered = scopeRijen.filter(
    (r) =>
      !sel.kwaliteit ||
      sel.kwaliteit === "alle" ||
      (sel.kwaliteit === "controleren"
        ? r.betrouwbaarheid === "controleren"
        : r.betrouwbaarheid !== "controleren" &&
          r.betrouwbaarheid !== "onvoldoende_data"),
  );
  filtered.sort(
    (a, b) => (b.per_persoon_per_week ?? -1) - (a.per_persoon_per_week ?? -1),
  );
  const present = filtered.filter((r) => r.totaal !== null),
    totaal = present.length ? present.reduce((s, r) => s + r.totaal!, 0) : null,
    pd = present.reduce((s, r) => s + r.persoonsdagen, 0);
  // Exact mode displays actual measurement windows, never falsely assigns a whole interval to its end month.
  const trends = filtered
    .flatMap((r) =>
      r.intervallen
        .filter((i) => i.betrouwbaar && i.waarde !== null)
        .map((i) => ({
          woning_id: r.woning_id,
          adres: r.adres,
          periode: `${i.vanDatum} → ${i.totDatum}`,
          totaal: i.waarde!,
          persoonsdagen: i.persoonsdagen,
          per_persoon_per_week:
            i.bezettingsconflict || !i.persoonsdagen
              ? null
              : i.waarde! / (i.persoonsdagen / 7),
          geschat: i.geschat,
        })),
    )
    .sort(
      (a, b) =>
        a.periode.localeCompare(b.periode) ||
        a.woning_id - b.woning_id,
    );
  return {
    selectie: sel,
    eenheid: sel.drager === "elektriciteit" ? "kWh" : "m³",
    rijen: filtered,
    trends,
    totaal,
    persoonsdagen: pd,
    per_persoon_per_week:
      pd > 0 && present.every((r) => r.per_persoon_per_week !== null)
        ? totaal! / (pd / 7)
        : null,
    gemiddelde_per_persoon_per_week:
      rates.length >= 5
        ? rates.reduce((a, b) => a + b, 0) / rates.length
        : null,
    mediaan_per_persoon_per_week: median,
    panden_in_benchmark: rates.length,
    uitschieters: filtered.filter((r) => r.signaal === "uitschieter").length,
    besparingsruimte_tot_mediaan: filtered.reduce(
      (s, r) => s + r.besparingsruimte_tot_mediaan,
      0,
    ),
    uitgesloten_meetperioden: filtered.reduce(
      (s, r) => s + r.beschikbare_meetperioden - r.meetperioden,
      0,
    ),
    dekking_percentage: scopeRijen.length
      ? scopeRijen.reduce((s, r) => s + r.dekking_percentage, 0) /
        scopeRijen.length
      : 0,
    benchmark_toelichting:
      median === null
        ? "Minimaal vijf betrouwbare panden met hetzelfde meetvenster nodig."
        : min < 100
          ? "Verkennende vergelijking op gelijk meetvenster; gedeeltelijke kalenderdekking."
          : "Portefeuillemediaan binnen de klantselectie: minimaal vijf panden met volledige kalenderdekking; gebouw- en gebruiksverschillen blijven relevant.",
  };
}
export function bepaalEnergieDatumbereik(
  meterstanden: EnergieMeterstand[],
): { vanaf: string; totEnMet: string } | null {
  const dates = meterstanden.map((m) => m.opnamedatum).sort();
  if (dates.length < 2 || dates[0] === dates.at(-1)) return null;
  return { vanaf: dates[0], totEnMet: dates.at(-1)! };
}
