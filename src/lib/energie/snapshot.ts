import {
  bouwEnergiePortfolioAnalyse,
  type Brondata,
  type EnergieAnalyseSelectie,
  type Energiedrager,
} from "./portfolio-analyse";
import {
  berekenEnergiekosten,
  type Tariefplan,
  type Energiekosten,
} from "./tarieven";
import { ENERGIE_REKENREGELS, dagen, datumNaDagen } from "./rekenregels";
export type EnergieKlantProduct = {
  product: string;
  eenheid: string;
  verbruik: number | null;
  verbruik_per_persoon_per_periode: number | null;
  norm: number | null;
  persoonsdagen: number;
  kosten_per_persoon_per_week: number | null;
  vorige_norm: number | null;
  verschil_percentage: number | null;
  dekking: number;
  exacte_dekking: number;
  naar_rato_berekend: boolean;
  kwaliteit: string;
  mediaan: number | null;
  benchmark_aantal: number;
  benchmark_verschil: number | null;
  kosten: Energiekosten;
  gebruikte_perioden: string[];
  meldingen: string[];
};
export type EnergieKlantSnapshot = {
  versie: string;
  gegenereerd_op: string;
  vanaf: string;
  tot: string;
  modus: string;
  producten: EnergieKlantProduct[];
  maatregelen: {
    titel: string;
    status: string;
    uitvoerdatum: string | null;
    toelichting: string;
  }[];
  conclusie: string;
};
export function bouwEnergieSnapshot(
  bron: Brondata,
  tarieven: Tariefplan[],
  selectie: Omit<EnergieAnalyseSelectie, "drager">,
  dragers: Energiedrager[],
  nu: string,
  gebruiker: string,
  codeversie: string,
) {
  const analyses = dragers.map((drager) =>
    bouwEnergiePortfolioAnalyse(bron, { ...selectie, drager }),
  );
  const duur = dagen(selectie.vanaf, selectie.totEnMet);
  const producten = analyses.map((a): EnergieKlantProduct => {
    const vorigeVanaf = datumNaDagen(selectie.vanaf, -duur);
    const vorig = bouwEnergiePortfolioAnalyse(bron, {
      ...selectie,
      drager: a.selectie.drager,
      vanaf: vorigeVanaf,
      totEnMet: selectie.vanaf,
    });
    const vergelijkbaar =
      vorig !== null &&
      a.rijen.length > 0 &&
      a.rijen.every((r) => r.dekking_percentage === 100) &&
      vorig.rijen.every((r) => r.dekking_percentage === 100) &&
      a.per_persoon_per_week !== null &&
      vorig.per_persoon_per_week !== null &&
      vorig.per_persoon_per_week > 0 &&
      a.rijen.map((r) => r.woning_id).join() ===
        vorig.rijen.map((r) => r.woning_id).join();
    const kwaliteit = a.rijen.some((r) => r.betrouwbaarheid === "controleren")
      ? "controleren"
      : a.totaal === null
        ? "onvoldoende_data"
        : a.dekking_percentage < 100
          ? "gedeeltelijk"
          : "exact";
    const kosten = berekenEnergiekosten(
      a.rijen.flatMap((r) => r.intervallen),
      tarieven,
      a.selectie.drager,
      a.eenheid,
      a.selectie.drager === "dagstroom"
        ? "dag"
        : a.selectie.drager === "nachtstroom"
          ? "nacht"
          : undefined,
    );
    return {
      product: a.selectie.drager,
      eenheid: a.eenheid,
      verbruik: a.totaal,
      verbruik_per_persoon_per_periode:
        a.per_persoon_per_week === null ||
        a.totaal === null ||
        a.persoonsdagen === 0
          ? null
          : a.totaal / (a.persoonsdagen / duur),
      norm: a.per_persoon_per_week,
      persoonsdagen: a.persoonsdagen,
      kosten_per_persoon_per_week:
        kosten.totaal !== null &&
        a.per_persoon_per_week !== null &&
        a.persoonsdagen > 0
          ? kosten.totaal / (a.persoonsdagen / 7)
          : null,
      vorige_norm: vergelijkbaar ? vorig!.per_persoon_per_week : null,
      verschil_percentage: vergelijkbaar
        ? (100 * (a.per_persoon_per_week! - vorig!.per_persoon_per_week!)) /
          vorig!.per_persoon_per_week!
        : null,
      dekking: a.dekking_percentage,
      exacte_dekking: a.rijen.length
        ? a.rijen.reduce((s, r) => s + r.exacte_dekking_percentage, 0) /
          a.rijen.length
        : 0,
      naar_rato_berekend: a.rijen.some((r) =>
        r.intervallen.some((interval) => interval.geschat),
      ),
      kwaliteit,
      mediaan: a.mediaan_per_persoon_per_week,
      benchmark_aantal: a.panden_in_benchmark,
      benchmark_verschil:
        a.mediaan_per_persoon_per_week === null
          ? null
          : a.besparingsruimte_tot_mediaan,
      kosten,
      gebruikte_perioden: [
        ...new Set(
          a.rijen.flatMap((r) =>
            r.intervallen
              .filter((i) => i.betrouwbaar && i.waarde !== null)
              .map(
                (i) =>
                  `${i.vanDatum} → ${i.totDatum}${i.geschat ? " (naar rato)" : ""}`,
              ),
          ),
        ),
      ],
      meldingen: [
        ...new Set([
          ...a.rijen.flatMap((r) => r.meldingen),
        ]),
      ],
    };
  });
  const klant: EnergieKlantSnapshot = {
    versie: ENERGIE_REKENREGELS,
    gegenereerd_op: nu,
    vanaf: selectie.vanaf,
    tot: selectie.totEnMet,
    modus: "tijdsevenredig",
    producten,
    maatregelen: [],
    conclusie:
      "Afwijkend verbruik is een aanleiding voor onderzoek, geen bewijs van misbruik. Een verschil met de benchmark is geen gegarandeerde besparing.",
  };
  const ids = new Set(analyses.flatMap((a) => a.rijen.map((r) => r.woning_id)));
  const huur = bron.verhuurperioden.filter((v) => ids.has(v.woning_id));
  const huurIds = new Set(huur.map((v) => v.id));
  return {
    klant,
    intern: {
      rekenregels: ENERGIE_REKENREGELS,
      codeversie,
      gebruiker,
      gegenereerd_op: nu,
      selectie,
      dragers,
      analyses,
      tarieven,
      bronnen: {
        meterstanden: bron.meterstanden.filter((m) => ids.has(m.woning_id)),
        verhuurperioden: huur,
        bewoners: bron.bewoners.filter((b) => huurIds.has(b.verhuurperiode_id)),
        meterconfiguraties: (bron.meterconfiguraties ?? []).filter((m) =>
          ids.has(m.woning_id),
        ),
      },
    },
  };
}
/** Explicit allowlist at customer boundary; ignores all unknown/internal keys. */
export function klantSnapshot(
  snapshot: EnergieKlantSnapshot,
): EnergieKlantSnapshot {
  return {
    versie: snapshot.versie,
    gegenereerd_op: snapshot.gegenereerd_op,
    vanaf: snapshot.vanaf,
    tot: snapshot.tot,
    modus: snapshot.modus,
    conclusie: snapshot.conclusie,
    maatregelen: snapshot.maatregelen.map((m) => ({
      titel: m.titel,
      status: m.status,
      uitvoerdatum: m.uitvoerdatum,
      toelichting: m.toelichting,
    })),
    producten: snapshot.producten.map((p) => ({
      product: p.product,
      eenheid: p.eenheid,
      verbruik: p.verbruik,
      verbruik_per_persoon_per_periode: p.verbruik_per_persoon_per_periode,
      norm: p.norm,
      persoonsdagen: p.persoonsdagen,
      kosten_per_persoon_per_week: p.kosten_per_persoon_per_week,
      vorige_norm: p.vorige_norm,
      verschil_percentage: p.verschil_percentage,
      dekking: p.dekking,
      exacte_dekking: p.exacte_dekking,
      naar_rato_berekend: p.naar_rato_berekend,
      kwaliteit: p.kwaliteit,
      mediaan: p.mediaan,
      benchmark_aantal: p.benchmark_aantal,
      benchmark_verschil: p.benchmark_verschil,
      gebruikte_perioden: p.gebruikte_perioden,
      meldingen: p.meldingen,
      kosten: {
        ontbrekend: p.kosten.ontbrekend,
        totaal: p.kosten.totaal,
        bekend_subtotaal: p.kosten.bekend_subtotaal,
        variabel: p.kosten.variabel,
        vast: p.kosten.vast,
        belastingen: p.kosten.belastingen,
        btw: p.kosten.btw,
        valuta: p.kosten.valuta,
        geschat: p.kosten.geschat,
        regels: p.kosten.regels.map((r) => ({
          tarief_id: r.tarief_id,
          bron: r.bron,
          vanaf: r.vanaf,
          tot: r.tot,
          soort: r.soort,
          hoeveelheid: r.hoeveelheid,
          eenheidsprijs: r.eenheidsprijs,
          exclusief_btw: r.exclusief_btw,
          btw: r.btw,
          totaal: r.totaal,
          inclusief_btw: r.inclusief_btw,
          geschat: r.geschat,
          valuta: r.valuta,
        })),
        gemiddelde_eenheidsprijs: p.kosten.gemiddelde_eenheidsprijs,
      },
    })),
  };
}
