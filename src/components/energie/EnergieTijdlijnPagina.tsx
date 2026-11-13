import EnergieTijdlijn from "./EnergieTijdlijn";
import { getEnergieAnalyseBrondata, getEnergieUitbreiding } from "@/services/energieanalyse-server";
import { bouwTijdlijn } from "@/lib/energie/tijdlijn";
import type { EnergieMaandParameters } from "@/lib/energie/maand-analyse";

export default async function EnergieTijdlijnPagina({ parameters }: { parameters: EnergieMaandParameters }) {
  // Bestaande managementbevoegdheid en RLS blijven de toegang tot alle brongegevens bepalen.
  const [bron, uitbreiding] = await Promise.all([getEnergieAnalyseBrondata(), getEnergieUitbreiding()]);
  const vandaag = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());
  const huidigJaar = Number(vandaag.slice(0, 4));
  const enkel = (key: string) => Array.isArray(parameters[key]) ? parameters[key][0] : parameters[key];
  const beschikbaar = bron.meterstanden.map(m => Number(m.opnamedatum.slice(0, 4))).filter(y => y >= 1900 && y <= huidigJaar);
  const eersteJaar = Math.min(huidigJaar - 1, ...beschikbaar);
  const jaren = Array.from({ length: huidigJaar - eersteJaar + 1 }, (_, i) => huidigJaar - i);
  const jaar = jaren.includes(Number(enkel("jaar"))) ? Number(enkel("jaar")) : huidigJaar;
  const vergelijkjaar = jaren.includes(Number(enkel("vergelijkjaar"))) ? Number(enkel("vergelijkjaar")) : Math.max(eersteJaar, jaar - 1);
  const bedrijf = bron.bedrijven.some(b => b.id === Number(enkel("bedrijf"))) ? Number(enkel("bedrijf")) : null;
  const vanaf = `${Math.min(jaar, vergelijkjaar)}-01-01`;
  const tot = `${Math.max(jaar, vergelijkjaar) + 1}-01-01`;
  const woningen = bron.woningen.filter(w => !bedrijf || bron.verhuurperioden.some(v => v.woning_id === w.id && v.bedrijf_id === bedrijf && (!v.startdatum || v.startdatum < tot) && (!v.werkelijke_einddatum || v.werkelijke_einddatum > vanaf)));
  const brondata = { ...bron, woningen, meterconfiguraties: uitbreiding.configuraties };
  const panden = bouwTijdlijn(brondata, jaar, vandaag, bedrijf ? [bedrijf] : []);
  const referentie = bouwTijdlijn(brondata, vergelijkjaar, vandaag, bedrijf ? [bedrijf] : [], jaar);
  const ruweIds = parameters.woning;
  const ids = (Array.isArray(ruweIds) ? ruweIds : ruweIds ? [ruweIds] : []).map(Number).filter(id => woningen.some(w => w.id === id));
  const klantGewijzigd = enkel("selectie_bedrijf") !== undefined && enkel("selectie_bedrijf") !== String(bedrijf ?? "");
  const start = {
    ids: enkel("panden_ingediend") === "1" && !klantGewijzigd ? ids : undefined,
    product: enkel("product"), persoon: enkel("eenheid") === "persoon",
    modus: enkel("modus"), vergelijk: enkel("vergelijk"), ander: Number(enkel("ander")),
  };
  return <EnergieTijdlijn key={`${jaar}:${vergelijkjaar}:${bedrijf}`} panden={panden} referentie={referentie} jaar={jaar} vergelijkjaar={vergelijkjaar} jaren={jaren} bedrijven={bron.bedrijven} bedrijf={bedrijf} vandaag={vandaag} start={start}/>;
}
