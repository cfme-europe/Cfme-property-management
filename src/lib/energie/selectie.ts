import type {
  Brondata,
  EnergieAnalyseSelectie,
  Energiedrager,
} from "./portfolio-analyse";
import { bepaalEnergieDatumbereik } from "./portfolio-analyse";
import { controleerPeriode, volgendeDag } from "./rekenregels";
export type Parameters = Record<string, string | string[] | undefined>;
export function leesSelectie(
  p: Parameters,
  bron: Brondata,
): { selectie: EnergieAnalyseSelectie; dragers: Energiedrager[] } {
  const one = (key: string, fallback: string) => {
    const v = p[key];
    if (Array.isArray(v))
      throw new Error(`Parameter ${key} mag slechts eenmaal voorkomen.`);
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
          throw new Error(`Ongeldige selectie voor ${key}.`);
        return n;
      }),
    ),
  ];
  const bereik = bepaalEnergieDatumbereik(bron.meterstanden);
  const vandaag = new Date().toISOString().slice(0, 10);
  const niveau = one("niveau", "totaal");
  if (!["totaal", "bedrijf", "woning"].includes(niveau))
    throw new Error("Ongeldig selectieniveau.");
  const vanaf = one("vanaf", bereik?.vanaf ?? vandaag),
    tot = one("tot", bereik?.totEnMet ?? volgendeDag(vandaag));
  controleerPeriode(vanaf, tot);
  const woningIds = ids("woning", new Set(bron.woningen.map((w) => w.id))),
    bedrijfIds =
      niveau === "woning"
        ? []
        : ids("bedrijf", new Set(bron.bedrijven.map((b) => b.id)));
  if (niveau === "woning" && !woningIds.length)
    throw new Error("Selecteer minimaal één pand.");
  if (niveau === "bedrijf" && !bedrijfIds.length)
    throw new Error("Selecteer minimaal één klant.");
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
    throw new Error(
      "Een geselecteerd pand hoort niet bij de gekozen klanten in deze periode.",
    );
  const dragers = lijst("drager");
  if (!dragers.length) dragers.push("elektriciteit");
  if (dragers.some((d) => !["elektriciteit", "gas", "water"].includes(d)))
    throw new Error("Onbekende energiedrager.");
  const modus = one("modus", "exact"),
    kwaliteit = one("kwaliteit", "alle"),
    min = Number(one("dekking", "100"));
  if (
    !["exact", "schatting"].includes(modus) ||
    !["alle", "betrouwbaar", "controleren"].includes(kwaliteit) ||
    !Number.isFinite(min) ||
    min < 0 ||
    min > 100
  )
    throw new Error("Ongeldige analyse-instellingen.");
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
