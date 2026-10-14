import {
  bouwEnergiePortfolioAnalyse,
  type Brondata,
  type EnergieAnalyseRij,
  type EnergieInterval,
  type Energiedrager,
} from "./portfolio-analyse";
import { dagen, datumTijd } from "./rekenregels";
import {
  berekenEnergiekosten,
  type Energiekosten,
  type Tariefplan,
} from "./tarieven";

export type EnergieMaandPeriode = {
  maand: string;
  vanaf: string;
  tot: string;
  dagen: number;
};

export type EnergieMaandParameters = Record<
  string,
  string | string[] | undefined
>;

export const ENERGIE_ANONIEME_SELECTIE_COOKIE =
  "cfme-energie-anonieme-selectie";

export type EnergieMaandWeergave = "intern" | "klant" | "selectie" | "anoniem";

export type EnergieMaandMeting = {
  maand: string;
  vanaf: string;
  tot: string;
  dagen: number;
  verbruik: number | null;
  persoonsdagen: number;
  perPersoonPerWeek: number | null;
  dekking: number;
  status: "volledig" | "gedeeltelijk" | "geen";
  betrouwbaarheid: string | null;
  waarschuwingen: string[];
  kosten: Energiekosten;
  kostenPerPersoonPerWeek: number | null;
  periodes: Array<{
    vanaf: string;
    tot: string;
    verbruik: number;
    bronVanaf: string;
    bronTot: string;
    bronVelden: string[];
    persoonsdagen: number;
    geschat: boolean;
  }>;
  laatsteMeetdatum: string | null;
  naarRato: boolean;
};

export type EnergieMaandWoning = {
  id: number;
  adres: string;
  bedrijfIds: number[];
  bedrijven: string[];
  maanden: EnergieMaandMeting[];
};

export type EnergieMaandAnalyseSelectie = {
  maanden: string[];
  referentiemaand: string;
  drager: Energiedrager;
  bedrijfIds: number[];
  woningIds: number[];
  woningselectie?: "automatisch" | "aangepast" | "leeg";
  maat: "verbruik" | "kosten";
  aggregatie: "persoon" | "pand";
};

export type EnergieMaandAnalyse = {
  selectie: EnergieMaandAnalyseSelectie;
  eenheid: "kWh" | "m³";
  woningen: EnergieMaandWoning[];
  bijgewerktOp: string;
};

export type EnergieAnoniemeMaandMeting = Pick<
  EnergieMaandMeting,
  | "maand"
  | "verbruik"
  | "perPersoonPerWeek"
  | "dekking"
  | "status"
  | "kostenPerPersoonPerWeek"
  | "naarRato"
> & {
  kosten: number | null;
  valuta: string | null;
};

export type EnergieAnoniemeDataset = {
  titel: "Geselecteerde portefeuille";
  selectie: "Geselecteerde panden en maanden";
  product: Energiedrager;
  eenheid: "kWh" | "m³";
  maanden: string[];
  referentiemaand: string;
  maat: "verbruik" | "kosten";
  aggregatie: "persoon" | "pand";
  woningen: Array<{
    pand: string;
    maanden: EnergieAnoniemeMaandMeting[];
  }>;
  bijgewerktOp: string;
};

export function parseEnergieMaand(maand: string): EnergieMaandPeriode {
  if (!/^(?:[1-9]\d{3})-(?:0[1-9]|1[0-2])$/.test(maand)) {
    throw new Error("Selecteer een geldige kalendermaand.");
  }
  const vanaf = `${maand}-01`;
  datumTijd(vanaf);
  const [jaar, maandnummer] = maand.split("-").map(Number);
  const tot = new Date(Date.UTC(jaar, maandnummer, 1))
    .toISOString()
    .slice(0, 10);
  return { maand, vanaf, tot, dagen: dagen(vanaf, tot) };
}

export function controleerEnergieMaandselectie(
  maanden: string[],
  referentiemaand: string | undefined,
) {
  const selectie = [...new Set(maanden)];
  if (!selectie.length) throw new Error("Selecteer minimaal één kalendermaand.");
  if (selectie.length > 36)
    throw new Error("Selecteer maximaal 36 kalendermaanden tegelijk.");
  selectie.forEach(parseEnergieMaand);
  const referentie = referentiemaand || selectie[0];
  if (!selectie.includes(referentie))
    throw new Error("De sorteermaand moet ook geselecteerd zijn.");
  return { maanden: selectie, referentiemaand: referentie };
}

export function herstelEnergieSelectieNaValidatiefout(
  parameters: EnergieMaandParameters,
  code: string,
  cause?: unknown,
): EnergieMaandParameters {
  const restored: EnergieMaandParameters = {};
  for (const key of [
    "bedrijf",
    "woning",
    "woningselectie",
    "maand",
    "maanden_ingediend",
    "referentiemaand",
    "drager",
    "maat",
    "aggregatie",
  ]) {
    const value = parameters[key];
    if (value !== undefined) restored[key] = value;
  }
  if (
    cause instanceof Error &&
    /Ongeldige selectie voor woning|geselecteerd pand .*niet beschikbaar|Een geselecteerd pand hoort niet/.test(
      cause.message,
    )
  ) {
    delete restored.woning;
    restored.woningselectie = "leeg";
  }
  restored.weergave = "selectie";
  restored.fout = code;
  return restored;
}

export function codeerEnergieAnoniemeSelectie(
  selectie: EnergieMaandAnalyseSelectie,
) {
  const parameters = new URLSearchParams();
  selectie.maanden.forEach((maand) => parameters.append("maand", maand));
  selectie.woningIds.forEach((id) => parameters.append("woning", String(id)));
  parameters.set("woningselectie", "aangepast");
  parameters.set("referentiemaand", selectie.referentiemaand);
  parameters.set("drager", selectie.drager);
  parameters.set("maat", selectie.maat);
  parameters.set("aggregatie", selectie.aggregatie);
  parameters.set("weergave", "anoniem");
  return Buffer.from(parameters.toString(), "utf8").toString("base64url");
}

export function decodeerEnergieAnoniemeSelectie(
  value: string,
): EnergieMaandParameters {
  if (!/^[A-Za-z0-9_-]+$/.test(value))
    throw new Error("De anonieme selectie is ongeldig of verlopen.");
  const parameters = new URLSearchParams(
    Buffer.from(value, "base64url").toString("utf8"),
  );
  const selectie: EnergieMaandParameters = {};
  parameters.forEach((item, key) => {
    const current = selectie[key];
    selectie[key] =
      current === undefined
        ? item
        : Array.isArray(current)
          ? [...current, item]
          : [current, item];
  });
  if (selectie.weergave !== "anoniem")
    throw new Error("De opgeslagen selectie is geen anonieme presentatie.");
  return selectie;
}

export function leesEnergieMaandSelectie(
  parameters: EnergieMaandParameters,
  bron: Pick<Brondata, "bedrijven" | "woningen" | "verhuurperioden">,
) {
  const single = (key: string, fallback: string) => {
    const value = parameters[key];
    if (Array.isArray(value))
      throw new Error(`Parameter ${key} mag slechts eenmaal voorkomen.`);
    return value ?? fallback;
  };
  const list = (key: string) => {
    const value = parameters[key];
    return [...new Set((Array.isArray(value) ? value : value ? [value] : [])
      .flatMap((item) => item.split(","))
      .filter(Boolean))];
  };
  const positiveIds = (key: string, allowed: Set<number>) =>
    list(key).map((value) => {
      const id = Number(value);
      if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || !allowed.has(id))
        throw new Error(`Ongeldige selectie voor ${key}.`);
      return id;
    });
  const rawMonths = list("maand");
  if (!rawMonths.length && single("maanden_ingediend", "0") === "1")
    throw new Error("Selecteer minimaal één kalendermaand.");
  const { maanden, referentiemaand } = controleerEnergieMaandselectie(
    rawMonths.length ? rawMonths : ["2026-09"],
    single("referentiemaand", rawMonths[0] ?? "2026-09"),
  );
  const rawProduct = single("drager", "elektriciteit");
  const products: Energiedrager[] = [
    "elektriciteit",
    "dagstroom",
    "nachtstroom",
    "gas",
    "water",
  ];
  if (!products.includes(rawProduct as Energiedrager))
    throw new Error("Selecteer een bekend energieproduct.");
  const maat = single("maat", "verbruik");
  if (maat !== "verbruik" && maat !== "kosten")
    throw new Error("Selecteer Verbruik of Kosten.");
  const aggregatie = single("aggregatie", "persoon");
  if (aggregatie !== "persoon" && aggregatie !== "pand")
    throw new Error("Selecteer Per persoon of Totaal pand.");
  const weergave = single("weergave", "intern");
  if (!["intern", "klant", "selectie", "anoniem"].includes(weergave))
    throw new Error("Selecteer een geldige weergave.");
  const bedrijfIds = positiveIds(
    "bedrijf",
    new Set(bron.bedrijven.map((bedrijf) => bedrijf.id)),
  );
  const woningIds = positiveIds(
    "woning",
    new Set(bron.woningen.map((woning) => woning.id)),
  );
  const rawWoningselectie = single(
    "woningselectie",
    woningIds.length ||
      weergave === "selectie" ||
      weergave === "anoniem"
      ? "aangepast"
      : "automatisch",
  );
  if (
    rawWoningselectie !== "automatisch" &&
    rawWoningselectie !== "aangepast" &&
    rawWoningselectie !== "leeg"
  )
    throw new Error("Ongeldige pandselectie.");

  const relevanteWoningIds = new Set(
    bron.woningen
      .filter(
        (woning) =>
          !bedrijfIds.length ||
          maanden.some((maand) => {
            const periode = parseEnergieMaand(maand);
            return bron.verhuurperioden.some(
              (verhuur) =>
                verhuur.woning_id === woning.id &&
                bedrijfIds.includes(verhuur.bedrijf_id) &&
                (!verhuur.startdatum || verhuur.startdatum < periode.tot) &&
                (!verhuur.werkelijke_einddatum ||
                  verhuur.werkelijke_einddatum > periode.vanaf),
            );
          }),
      )
      .map((woning) => woning.id),
  );

  let woningselectie = rawWoningselectie as
    | "automatisch"
    | "aangepast"
    | "leeg";
  let geselecteerdeWoningIds: number[];

  if (weergave === "selectie" || weergave === "anoniem") {
    const toegankelijkeBedrijven = new Set(
      bron.bedrijven.map((bedrijf) => bedrijf.id),
    );
    const relatiesPerWoning = new Map<number, Set<number>>();
    for (const woningId of woningIds) {
      const relaties = new Set(
        bron.verhuurperioden
          .filter(
            (verhuur) =>
              verhuur.woning_id === woningId &&
              toegankelijkeBedrijven.has(verhuur.bedrijf_id) &&
              maanden.some((maand) => {
                const periode = parseEnergieMaand(maand);
                return (
                  (!verhuur.startdatum || verhuur.startdatum < periode.tot) &&
                  (!verhuur.werkelijke_einddatum ||
                    verhuur.werkelijke_einddatum > periode.vanaf)
                );
              }),
          )
          .map((verhuur) => verhuur.bedrijf_id),
      );
      if (!relaties.size)
        throw new Error(
          "Een geselecteerd pand is niet beschikbaar voor de gekozen maanden.",
        );
      relatiesPerWoning.set(woningId, relaties);
    }
    if (weergave === "anoniem" && !woningIds.length)
      throw new Error("Selecteer minimaal één pand.");
    geselecteerdeWoningIds = woningIds;
    woningselectie = woningIds.length ? "aangepast" : "leeg";
    bedrijfIds.splice(
      0,
      bedrijfIds.length,
      ...new Set(
        [...relatiesPerWoning.values()].flatMap((bedrijven) => [...bedrijven]),
      ),
    );
  } else if (woningselectie === "automatisch") {
    geselecteerdeWoningIds = [...relevanteWoningIds];
  } else if (woningselectie === "leeg") {
    geselecteerdeWoningIds = [];
  } else {
    const nietRelevant = woningIds.some(
      (woningId) => !relevanteWoningIds.has(woningId),
    );
    if (nietRelevant)
      throw new Error(
        "Een geselecteerd pand hoort niet bij de gekozen klant(en) in deze periode.",
      );
    geselecteerdeWoningIds = woningIds;
    if (!geselecteerdeWoningIds.length) woningselectie = "leeg";
  }

  if (
    weergave === "klant" &&
    bedrijfIds.length !== 1
  )
    throw new Error("Klantversie vereist één geselecteerde klant.");
  if (bedrijfIds.length && woningIds.length) {
    for (const woningId of geselecteerdeWoningIds) {
      const hoortBijSelectie = maanden.some((maand) => {
        const periode = parseEnergieMaand(maand);
        return bron.verhuurperioden.some(
          (verhuur) =>
            verhuur.woning_id === woningId &&
            bedrijfIds.includes(verhuur.bedrijf_id) &&
            (!verhuur.startdatum || verhuur.startdatum < periode.tot) &&
            (!verhuur.werkelijke_einddatum ||
              verhuur.werkelijke_einddatum > periode.vanaf),
        );
      });
      if (!hoortBijSelectie)
        throw new Error("Een geselecteerd pand hoort niet bij de gekozen klant(en) in deze periode.");
    }
  }
  return {
    selectie: {
      maanden,
      referentiemaand,
      drager: rawProduct as Energiedrager,
      bedrijfIds,
      woningIds: geselecteerdeWoningIds,
      woningselectie,
      maat,
      aggregatie,
    } satisfies EnergieMaandAnalyseSelectie,
    weergave: weergave as EnergieMaandWeergave,
  };
}

function productHeeftMeting(
  rij: EnergieAnalyseRij,
  drager: Energiedrager,
): boolean {
  return rij.intervallen.length > 0 || rij.meldingen.length > 0 ||
    (drager === "elektriciteit" &&
      rij.intervallen.some((interval) =>
        interval.bronVelden?.includes("elektriciteit_kwh"),
      ));
}

function laatsteMeetdatum(intervallen: EnergieInterval[]): string | null {
  return (
    intervallen
      .map((interval) => interval.bronTot)
      .sort()
      .at(-1) ?? null
  );
}

export function bouwEnergieMaandAnalyse(
  bron: Brondata,
  tarieven: Tariefplan[],
  selectie: EnergieMaandAnalyseSelectie,
  bijgewerktOp = new Date().toISOString().slice(0, 10),
): EnergieMaandAnalyse {
  const maanden = controleerEnergieMaandselectie(
    selectie.maanden,
    selectie.referentiemaand,
  );
  const beschikbareBrondata: Brondata = {
    ...bron,
    meterstanden: bron.meterstanden.filter(
      (meter) => meter.opnamedatum <= bijgewerktOp,
    ),
  };
  const woningIds = [...new Set(selectie.woningIds)];
  const bedrijfIds = [...new Set(selectie.bedrijfIds)];
  const referentie = maanden.referentiemaand;
  const resultaten = maanden.maanden.map((maand) => {
    const periode = parseEnergieMaand(maand);
    const analyse = bouwEnergiePortfolioAnalyse(beschikbareBrondata, {
      niveau: "totaal",
      drager: selectie.drager,
      vanaf: periode.vanaf,
      totEnMet: periode.tot,
      ...(bedrijfIds.length ? { bedrijfIds } : {}),
      ...(woningIds.length ? { woningIds } : {}),
      modus: "schatting",
      kwaliteit: "alle",
      minimaleDekking: 0,
      archief: true,
    });
    return { periode, analyse };
  });

  const explicietLeeg =
    selectie.woningselectie === "leeg" ||
    ((selectie.woningselectie === "aangepast" ||
      selectie.woningselectie === "automatisch") &&
      !woningIds.length);
  const selectedWoningen = bron.woningen.filter(
    (woning) =>
      (!explicietLeeg &&
        (!woningIds.length || woningIds.includes(woning.id))) &&
      (!bedrijfIds.length ||
        bron.verhuurperioden.some(
          (verhuur) =>
            verhuur.woning_id === woning.id &&
            bedrijfIds.includes(verhuur.bedrijf_id),
        )),
  );

  const woningen = selectedWoningen.map((woning): EnergieMaandWoning => ({
    id: woning.id,
    adres: woning.adres,
    bedrijfIds: [
      ...new Set(
        bron.verhuurperioden
          .filter(
            (verhuur) =>
              verhuur.woning_id === woning.id &&
              (!bedrijfIds.length || bedrijfIds.includes(verhuur.bedrijf_id)),
          )
          .map((verhuur) => verhuur.bedrijf_id),
      ),
    ],
    bedrijven: [
      ...new Set(
        bron.verhuurperioden
          .filter(
            (verhuur) =>
              verhuur.woning_id === woning.id &&
              (!bedrijfIds.length || bedrijfIds.includes(verhuur.bedrijf_id)),
          )
          .map(
            (verhuur) =>
              bron.bedrijven.find((bedrijf) => bedrijf.id === verhuur.bedrijf_id)
                ?.naam ?? "Onbekende klant",
          ),
      ),
    ],
    maanden: resultaten.map(({ periode, analyse }): EnergieMaandMeting => {
      const rij = analyse.rijen.find((item) => item.woning_id === woning.id);
      const intervallen =
        rij?.intervallen.filter(
          (interval) => interval.betrouwbaar && interval.waarde !== null,
        ) ?? [];
      const dekking = rij?.dekking_percentage ?? 0;
      const verbruik = rij?.totaal ?? null;
      const status: EnergieMaandMeting["status"] =
        verbruik === null || !rij || !productHeeftMeting(rij, selectie.drager)
          ? "geen"
          : dekking >= 100
            ? "volledig"
            : "gedeeltelijk";
      const kosten = berekenEnergiekosten(
        rij?.intervallen ?? [],
        tarieven,
        selectie.drager,
        analyse.eenheid,
        selectie.drager === "dagstroom"
          ? "dag"
          : selectie.drager === "nachtstroom"
            ? "nacht"
            : undefined,
      );
      const persoonsdagen = rij?.persoonsdagen ?? 0;
      return {
        maand: periode.maand,
        vanaf: periode.vanaf,
        tot: periode.tot,
        dagen: periode.dagen,
        verbruik,
        persoonsdagen,
        betrouwbaarheid: rij?.betrouwbaarheid ?? null,
        waarschuwingen: [...new Set(rij?.meldingen ?? [])],
        perPersoonPerWeek:
          status === "volledig" && rij ? rij.per_persoon_per_week : null,
        dekking,
        status,
        kosten,
        kostenPerPersoonPerWeek:
          status === "volledig" &&
          persoonsdagen > 0 &&
          kosten.totaal !== null
            ? kosten.totaal / (persoonsdagen / 7)
            : null,
        periodes: intervallen.map((interval) => ({
          vanaf: interval.vanDatum,
          tot: interval.totDatum,
          verbruik: interval.waarde!,
          bronVanaf: interval.bronVanaf,
          bronTot: interval.bronTot,
          bronVelden: interval.bronVelden ?? [],
          persoonsdagen: interval.persoonsdagen,
          geschat: interval.geschat,
        })),
        laatsteMeetdatum: laatsteMeetdatum(rij?.intervallen ?? []),
        naarRato: intervallen.some((interval) => interval.geschat),
      };
    }),
  }));

  return {
    selectie: { ...selectie, ...maanden, woningIds, bedrijfIds },
    eenheid: ["elektriciteit", "dagstroom", "nachtstroom"].includes(
      selectie.drager,
    )
      ? "kWh"
      : "m³",
    woningen: sorteerEnergieMaandWoningen(
      woningen,
      referentie,
      selectie.maat,
      selectie.aggregatie,
    ),
    bijgewerktOp,
  };
}

export function waardeEnergieMaand(
  maand: EnergieMaandMeting,
  maat: "verbruik" | "kosten",
  aggregatie: "persoon" | "pand",
): number | null {
  if (maat === "verbruik") {
    return aggregatie === "persoon"
      ? maand.perPersoonPerWeek
      : maand.verbruik;
  }
  return aggregatie === "persoon"
    ? maand.kostenPerPersoonPerWeek
    : maand.kosten.totaal;
}

export function sorteerEnergieMaandWoningen(
  woningen: EnergieMaandWoning[],
  referentiemaand: string,
  maat: "verbruik" | "kosten",
  aggregatie: "persoon" | "pand",
) {
  return [...woningen].sort((a, b) => {
    const maandA = a.maanden.find((maand) => maand.maand === referentiemaand);
    const maandB = b.maanden.find((maand) => maand.maand === referentiemaand);
    const waardeA = maandA
      ? waardeEnergieMaand(maandA, maat, aggregatie)
      : null;
    const waardeB = maandB
      ? waardeEnergieMaand(maandB, maat, aggregatie)
      : null;
    if (waardeA === null) return waardeB === null ? a.adres.localeCompare(b.adres) : 1;
    if (waardeB === null) return -1;
    return waardeB - waardeA || a.adres.localeCompare(b.adres);
  });
}

export function maximumEnergieMaandwaarde(
  woningen: EnergieMaandWoning[],
  maat: "verbruik" | "kosten",
  aggregatie: "persoon" | "pand",
): number {
  return Math.max(
    0,
    ...woningen.flatMap((woning) =>
      woning.maanden
        .filter((month) => month.status === "volledig")
        .map((month) => waardeEnergieMaand(month, maat, aggregatie))
        .filter((value): value is number => value !== null),
    ),
  );
}

export function bouwAnoniemeEnergieDataset(
  analyse: EnergieMaandAnalyse,
): EnergieAnoniemeDataset {
  const pandLabels = new Map<number, string>();
  [...analyse.woningen]
    .sort((a, b) => a.id - b.id)
    .forEach((woning, index) =>
      pandLabels.set(woning.id, `Pand ${String(index + 1).padStart(2, "0")}`),
    );
  return {
    titel: "Geselecteerde portefeuille",
    selectie: "Geselecteerde panden en maanden",
    product: analyse.selectie.drager,
    eenheid: analyse.eenheid,
    maanden: [...analyse.selectie.maanden],
    referentiemaand: analyse.selectie.referentiemaand,
    maat: analyse.selectie.maat,
    aggregatie: analyse.selectie.aggregatie,
    woningen: analyse.woningen.map((woning) => ({
        pand: pandLabels.get(woning.id) ?? "Pand 01",
        maanden: woning.maanden.map((maand) => ({
          maand: maand.maand,
          verbruik: maand.verbruik,
          perPersoonPerWeek: maand.perPersoonPerWeek,
          dekking: maand.dekking,
          status: maand.status,
          kosten: maand.kosten.totaal,
          valuta: maand.kosten.valuta,
          kostenPerPersoonPerWeek: maand.kostenPerPersoonPerWeek,
          naarRato: maand.naarRato,
        })),
      })),
    bijgewerktOp: analyse.bijgewerktOp,
  };
}
