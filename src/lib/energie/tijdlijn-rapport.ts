import type { TijdlijnPand, TijdlijnProduct } from "./tijdlijn";
import { tijdlijnWaarde } from "./tijdlijn";
import type { PandSaldo } from "./voorschotten";
export type TijdlijnRapport = {
  jaar: number;
  vergelijkjaar: number | null;
  van: number;
  tot: number;
  persoon: boolean;
  grafieken: {
    product: TijdlijnProduct;
    eenheid: string;
    waarden: (number | null)[];
    referentie: (number | null)[];
    volledig: boolean[];
    referentieVolledig: boolean[];
  }[];
  saldo: PandSaldo | null;
  saldoOntbreekt?: boolean;
};
export function bouwTijdlijnRapport(
  pand: TijdlijnPand,
  referentie: TijdlijnPand | undefined,
  jaar: number,
  vergelijkjaar: number | null,
  van: number,
  tot: number,
  persoon: boolean,
  producten: TijdlijnProduct[],
  saldo: PandSaldo | null,
): TijdlijnRapport {
  return {
    jaar,
    vergelijkjaar,
    van,
    tot,
    persoon,
    saldo,
    grafieken: producten.map((product) => ({
      product,
      eenheid: persoon
        ? product === "water"
          ? "liter/persoon/dag"
          : `${product === "elektriciteit" ? "kWh" : "m³"}/persoon/week`
        : product === "elektriciteit"
          ? "kWh"
          : "m³",
      waarden: pand.producten[product].map((p, i) =>
        i < van || i > tot ? null : tijdlijnWaarde(p, product, persoon),
      ),
      referentie: pand.producten[product].map((_, i) =>
        vergelijkjaar === null || i < van || i > tot
          ? null
          : tijdlijnWaarde(
              referentie?.producten[product][i] ?? null,
              product,
              persoon,
            ),
      ),
      volledig: pand.producten[product].map(
        (p) => !p.lopend && p.dekking >= 99.99,
      ),
      referentieVolledig: pand.producten[product].map(
        (_, i) =>
          !!referentie?.producten[product][i] &&
          !referentie.producten[product][i].lopend &&
          referentie.producten[product][i].dekking >= 99.99,
      ),
    })),
  };
}
/** Customer allowlist: no residents, raw database rows or internal annotations. */
export function klantTijdlijn(t: TijdlijnRapport): TijdlijnRapport {
  return {
    jaar: t.jaar,
    vergelijkjaar: t.vergelijkjaar,
    van: t.van,
    tot: t.tot,
    persoon: t.persoon,
    saldoOntbreekt: t.saldoOntbreekt === true,
    grafieken: t.grafieken.map((g) => ({
      product: g.product,
      eenheid: g.eenheid,
      waarden: [...g.waarden],
      referentie: [...g.referentie],
      volledig: [...g.volledig],
      referentieVolledig: [...g.referentieVolledig],
    })),
    saldo: t.saldo
      ? {
          woning_id: t.saldo.woning_id,
          verhuurperiode_id: t.saldo.verhuurperiode_id,
          bedrijf_id: t.saldo.bedrijf_id,
          adres: t.saldo.adres,
          klant: t.saldo.klant,
          vanaf: t.saldo.vanaf,
          startsaldo: t.saldo.startsaldo,
          maanden: t.saldo.maanden
            .filter(
              (m) =>
                Number(m.maand.slice(0, 4)) === t.jaar &&
                Number(m.maand.slice(5)) - 1 >= t.van &&
                Number(m.maand.slice(5)) - 1 <= t.tot,
            )
            .map((m) => ({
              maand: m.maand,
              vanaf: m.vanaf,
              tot: m.tot,
              lopend: m.lopend,
              kosten: m.kosten,
              bekend: m.bekend,
              voorschot: m.voorschot,
              verschil: m.verschil,
              saldo: m.saldo,
              ontbrekend: [...m.ontbrekend],
              producten: m.producten.map((p) => ({
                product: p.product,
                verbruik: p.verbruik,
                kosten: p.kosten,
                bekend: p.bekend,
                dekking: p.dekking,
              })),
            })),
        }
      : null,
  };
}
