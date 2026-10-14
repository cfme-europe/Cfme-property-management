import type {
  Brondata,
  EnergieAnalyseSelectie,
  Energiedrager,
} from "./portfolio-analyse";
import { bepaalEnergieDatumbereik } from "./portfolio-analyse";
import {
  controleerPeriode,
  datumTijd,
  volgendeDag,
  ENERGIE_ANALYSE_STARTDATUM,
} from "./rekenregels";
export type Parameters = Record<string, string | string[] | undefined>;
export type EnergieSelectieVeld =
  | "algemeen"
  | "niveau"
  | "bedrijf"
  | "woning"
  | "drager"
  | "vanaf"
  | "tot"
  | "modus"
  | "dekking"
  | "kwaliteit";

export class EnergieSelectieValidatieFout extends Error {
  constructor(
    readonly veld: EnergieSelectieVeld,
    message: string,
  ) {
    super(message);
    this.name = "EnergieSelectieValidatieFout";
  }
}

export function beschikbareEnergieWoningen(
  bron: Pick<Brondata, "woningen" | "verhuurperioden">,
  selectie: {
    bedrijfIds: number[];
    vanaf: string;
    totEnMet: string;
    archief: boolean;
  },
) {
  return bron.woningen.filter(
    (woning) =>
      (selectie.archief || !woning.status || woning.status === "actief") &&
      (!selectie.bedrijfIds.length ||
        bron.verhuurperioden.some(
          (verhuurperiode) =>
            verhuurperiode.woning_id === woning.id &&
            selectie.bedrijfIds.includes(verhuurperiode.bedrijf_id) &&
            (!verhuurperiode.startdatum ||
              verhuurperiode.startdatum < selectie.totEnMet) &&
            (!verhuurperiode.werkelijke_einddatum ||
              verhuurperiode.werkelijke_einddatum > selectie.vanaf),
        )),
  );
}

export function leesSelectie(
  p: Parameters,
  bron: Brondata,
): { selectie: EnergieAnalyseSelectie; dragers: Energiedrager[] } {
  const one = (
    key: string,
    fallback: string,
    veld: EnergieSelectieVeld = "algemeen",
  ) => {
    const v = p[key];
    if (Array.isArray(v))
      throw new EnergieSelectieValidatieFout(
        veld,
        `Parameter ${key} mag slechts eenmaal voorkomen.`,
      );
    return v ?? fallback;
  };
  const lijst = (key: string) => {
    const raw = p[key];
    return (Array.isArray(raw) ? raw : raw ? [raw] : [])
      .flatMap((v) => v.split(","))
      .filter(Boolean);
  };
  const ids = (key: string, valid: Set<number>) => [
    ...new Set(
      lijst(key).map((v) => {
        const n = Number(v);
        if (!/^\d+$/.test(v) || !valid.has(n))
          throw new EnergieSelectieValidatieFout(
            key === "bedrijf" ? "bedrijf" : "woning",
            `Ongeldige selectie voor ${key}.`,
          );
        return n;
      }),
    ),
  ];
  const bereik = bepaalEnergieDatumbereik(bron.meterstanden);
  const minimaleEinddatum = bereik
    ? volgendeDag(bereik.vanaf)
    : volgendeDag(new Date().toISOString().slice(0, 10));
  const standaardTot =
    bereik?.totEnMet
      ? volgendeDag(bereik.totEnMet)
      : minimaleEinddatum;
  const niveau = one("niveau", "totaal", "niveau");
  if (!["totaal", "bedrijf", "woning"].includes(niveau))
    throw new EnergieSelectieValidatieFout("niveau", "Ongeldig selectieniveau.");
  const vanaf = one("vanaf", ENERGIE_ANALYSE_STARTDATUM, "vanaf");
  const inclusiveEndSubmitted = p.tot_en_met !== undefined;
  if (inclusiveEndSubmitted && p.tot !== undefined)
    throw new EnergieSelectieValidatieFout(
      "tot",
      "Gebruik één einddatumparameter.",
    );
  const endParameter = inclusiveEndSubmitted
    ? one("tot_en_met", "", "tot")
    : one("tot", standaardTot, "tot");
  let tot = endParameter;
  try {
    datumTijd(vanaf);
  } catch (error) {
    throw new EnergieSelectieValidatieFout(
      "vanaf",
      error instanceof Error ? error.message : "Ongeldige begindatum.",
    );
  }
  try {
    datumTijd(endParameter);
    if (inclusiveEndSubmitted) tot = volgendeDag(endParameter);
  } catch (error) {
    throw new EnergieSelectieValidatieFout(
      "tot",
      error instanceof Error ? error.message : "Ongeldige einddatum.",
    );
  }
  try {
    controleerPeriode(vanaf, tot);
  } catch (error) {
    throw new EnergieSelectieValidatieFout(
      "tot",
      error instanceof Error ? error.message : "Ongeldige analyseperiode.",
    );
  }
  const woningIds = ids("woning", new Set(bron.woningen.map((w) => w.id))),
    bedrijfIds =
      niveau === "woning"
        ? []
        : ids("bedrijf", new Set(bron.bedrijven.map((b) => b.id)));
  if (niveau === "woning" && !woningIds.length)
    throw new EnergieSelectieValidatieFout(
      "woning",
      "Selecteer minimaal één pand voor deze analyse.",
    );
  if (niveau === "bedrijf" && !bedrijfIds.length)
    throw new EnergieSelectieValidatieFout(
      "bedrijf",
      "Selecteer minimaal één klant voor deze analyse.",
    );
  if (
    bedrijfIds.length &&
    woningIds.some(
      (id) =>
        !bron.verhuurperioden.some(
          (v) =>
            v.woning_id === id &&
            bedrijfIds.includes(v.bedrijf_id) &&
            (!v.startdatum || v.startdatum < tot) &&
            (!v.werkelijke_einddatum || v.werkelijke_einddatum > vanaf),
        ),
    )
  )
    throw new EnergieSelectieValidatieFout(
      "woning",
      "Een geselecteerd pand hoort niet bij de gekozen klanten in deze periode.",
    );
  const dragers = lijst("drager");
  if (
    !dragers.length &&
    one("producten_ingediend", "0") !== "1"
  )
    dragers.push("elektriciteit");
  if (!dragers.length)
    throw new EnergieSelectieValidatieFout(
      "drager",
      "Selecteer minimaal één energieproduct.",
    );
  if (
    dragers.some(
      (d) =>
        ![
          "elektriciteit",
          "dagstroom",
          "nachtstroom",
          "gas",
          "water",
        ].includes(d),
    )
  )
    throw new EnergieSelectieValidatieFout("drager", "Onbekend energieproduct.");
  const modus = one("modus", "schatting", "modus"),
    kwaliteit = one("kwaliteit", "alle", "kwaliteit"),
    min = Number(one("dekking", "100", "dekking"));
  if (
    !["exact", "schatting"].includes(modus) ||
    !["alle", "betrouwbaar", "controleren"].includes(kwaliteit) ||
    !Number.isFinite(min) ||
    min < 0 ||
    min > 100
  ) {
    const veld =
      !["exact", "schatting"].includes(modus)
        ? "modus"
        : !["alle", "betrouwbaar", "controleren"].includes(kwaliteit)
          ? "kwaliteit"
          : "dekking";
    throw new EnergieSelectieValidatieFout(
      veld,
      "Controleer de uitgebreide analyse-instellingen.",
    );
  }
  return {
    selectie: {
      niveau: niveau as EnergieAnalyseSelectie["niveau"],
      drager: dragers[0] as Energiedrager,
      vanaf,
      totEnMet: tot,
      woningIds,
      bedrijfIds,
      modus: modus as "exact" | "schatting",
      kwaliteit: kwaliteit as "alle" | "betrouwbaar" | "controleren",
      minimaleDekking: min,
      archief: one("archief", "0") === "1",
    },
    dragers: [...new Set(dragers)] as Energiedrager[],
  };
}
