import { bouwEnergiePortfolioAnalyse, type Brondata } from "./portfolio-analyse";
import { parseEnergieMaand } from "./maand-analyse";
import { dagen } from "./rekenregels";

export const tijdlijnProducten = ["elektriciteit", "gas", "water"] as const;
export type TijdlijnProduct = typeof tijdlijnProducten[number];
export type TijdlijnPunt = {
  maand: string; vanaf: string; tot: string; lopend: boolean;
  verbruik: number | null; normaalVerbruik: number; persoonsdagen: number;
  onbekend: boolean; dekking: number; naarRato: boolean; waarschuwingen: string[];
  bronnen: { vanaf: string; tot: string; verbruik: number; persoonsdagen: number; ids: number[]; methode: string }[];
};
export type TijdlijnPand = { id: number; adres: string; producten: Record<TijdlijnProduct, TijdlijnPunt[]> };

// De referentiemaand stopt op dezelfde kalenderdag als de lopende maand.
// Vandaag is een exclusieve grens: we tonen geen fictief verbruik voor de rest van vandaag.
export function tijdlijnBereik(jaar: number, index: number, vandaag: string, hoofdjaar = jaar) {
  const maand = `${jaar}-${String(index + 1).padStart(2, "0")}`;
  const periode = parseEnergieMaand(maand);
  const nu = new Date(`${vandaag}T00:00:00Z`);
  const lopend = hoofdjaar === nu.getUTCFullYear() && index === nu.getUTCMonth();
  const toekomst = hoofdjaar > nu.getUTCFullYear() || (hoofdjaar === nu.getUTCFullYear() && index > nu.getUTCMonth());
  const dag = Math.min(nu.getUTCDate(), periode.dagen + 1);
  const tot = lopend ? new Date(Date.UTC(jaar, index, dag)).toISOString().slice(0, 10) : periode.tot;
  return { maand, vanaf: periode.vanaf, tot, lopend, toekomst };
}

export function bouwTijdlijn(bron: Brondata, jaar: number, vandaag: string, bedrijfIds: number[] = [], hoofdjaar = jaar): TijdlijnPand[] {
  const veilig = { ...bron, meterstanden: bron.meterstanden.filter(m => m.opnamedatum <= vandaag) };
  const panden: TijdlijnPand[] = bron.woningen.map(w => ({ id: w.id, adres: w.adres, producten: { elektriciteit: [], gas: [], water: [] } }));
  for (let index = 0; index < 12; index++) {
    const bereik = tijdlijnBereik(jaar, index, vandaag, hoofdjaar);
    for (const drager of tijdlijnProducten) {
      const analyse = !bereik.toekomst && bereik.tot > bereik.vanaf ? bouwEnergiePortfolioAnalyse(veilig, {
        niveau: "totaal", drager, vanaf: bereik.vanaf, totEnMet: bereik.tot,
        bedrijfIds, modus: "schatting", kwaliteit: "alle", minimaleDekking: 0, archief: true,
      }) : null;
      for (const pand of panden) {
        const rij = analyse?.rijen.find(r => r.woning_id === pand.id);
        // Alleen door werkelijke opnames begrensde intervallen; geen extrapolatie na de laatste opname.
        const intervallen = rij?.intervallen.filter(i => i.betrouwbaar && i.waarde !== null && !i.geschat) ?? [];
        const bekende = intervallen.filter(i => i.bezettingBekend);
        pand.producten[drager].push({ ...bereik,
          verbruik: intervallen.length ? intervallen.reduce((s, i) => s + i.waarde!, 0) : null,
          normaalVerbruik: bekende.reduce((s, i) => s + i.waarde!, 0),
          persoonsdagen: bekende.reduce((s, i) => s + i.persoonsdagen, 0),
          onbekend: intervallen.some(i => !i.bezettingBekend),
          dekking: rij?.dekking_percentage ?? 0,
          naarRato: intervallen.some(i => i.rekenwijze !== "gemeten"),
          waarschuwingen: rij?.meldingen ?? [],
          bronnen: intervallen.map(i => ({ vanaf: i.vanDatum, tot: i.totDatum, verbruik: i.waarde!, persoonsdagen: i.persoonsdagen, ids: i.bronIds, methode: i.rekenwijze })),
        });
      }
    }
  }
  return panden;
}

export function combineerTijdlijn(punten: TijdlijnPunt[]): TijdlijnPunt | null {
  if (!punten.length) return null;
  const aanwezig = punten.filter(p => p.verbruik !== null);
  return { ...punten[0],
    verbruik: aanwezig.length ? aanwezig.reduce((s, p) => s + p.verbruik!, 0) : null,
    normaalVerbruik: aanwezig.reduce((s, p) => s + p.normaalVerbruik, 0),
    persoonsdagen: aanwezig.reduce((s, p) => s + p.persoonsdagen, 0),
    onbekend: punten.some(p => p.onbekend || p.verbruik === null),
    dekking: Math.min(...punten.map(p => p.dekking)),
    naarRato: punten.some(p => p.naarRato),
    waarschuwingen: [...new Set(punten.flatMap(p => p.waarschuwingen))],
    bronnen: punten.flatMap(p => p.bronnen),
  };
}

export function tijdlijnWaarde(punt: TijdlijnPunt | null, product: TijdlijnProduct, persoon: boolean) {
  if (!punt || punt.verbruik === null) return null;
  if (!persoon) return punt.verbruik;
  if (punt.onbekend || punt.persoonsdagen <= 0) return null;
  return punt.normaalVerbruik / punt.persoonsdagen * (product === "water" ? 1000 : 7);
}

export function tijdlijnVerschil(a: TijdlijnPunt | null, b: TijdlijnPunt | null, product: TijdlijnProduct, persoon: boolean) {
  if (!a || !b || a.dekking < 99.99 || b.dekking < 99.99 || dagen(a.vanaf, a.tot) !== dagen(b.vanaf, b.tot)) return null;
  const x = tijdlijnWaarde(a, product, persoon), y = tijdlijnWaarde(b, product, persoon);
  return x !== null && y !== null && y !== 0 ? 100 * (x - y) / y : null;
}
