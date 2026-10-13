import type { EnergieAnalyseRij } from "./portfolio-analyse";
import { dagen } from "./rekenregels";
/** A numeric before/after difference is not causal proof. Never auto-promote to verified saving. */
export function beoordeelMaatregel(
  voor: EnergieAnalyseRij | undefined,
  na: EnergieAnalyseRij | undefined,
  referentie: { vanaf: string; tot: string },
  controle: { vanaf: string; tot: string },
) {
  const redenen: string[] = [];
  if (
    !voor ||
    !na ||
    voor.betrouwbaarheid !== "exact" ||
    na.betrouwbaarheid !== "exact"
  )
    redenen.push("Volledige betrouwbare metingen voor en na de ingreep nodig");
  if (
    dagen(referentie.vanaf, referentie.tot) !==
    dagen(controle.vanaf, controle.tot)
  )
    redenen.push("Meetperioden hebben verschillende lengtes");
  if (referentie.tot > controle.vanaf)
    redenen.push("Referentie- en controleperiode overlappen");
  if (voor?.per_persoon_per_week == null || na?.per_persoon_per_week == null)
    redenen.push("Bezetting onvoldoende betrouwbaar");
  const verschil = redenen.length
    ? null
    : voor!.per_persoon_per_week! - na!.per_persoon_per_week!;
  return {
    verschil_per_persoon_per_week: verschil,
    verbruiksvermindering:
      verschil === null ? null : (verschil * na!.persoonsdagen) / 7,
    geverifieerde_besparing: null,
    redenen,
    conclusie: redenen.length
      ? "Nog niet vergelijkbaar"
      : "Gemeten verschil; seizoen, weer en gebruik nog beoordelen. Geen bewezen causaal besparingseffect.",
  };
}
