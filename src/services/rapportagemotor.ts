import {
  bouwEnergiePortfolioAnalyse,
  type Brondata,
  type Energiedrager,
} from "@/lib/energie/portfolio-analyse";
import { volgendeDag } from "@/lib/energie/rekenregels";
import type {
  EnergieKengetal,
  RapportagemotorInvoer,
  RapportagemotorUitkomst,
  RapportageVerschil,
} from "@/types/rapportagemotor";

function datumDeel(waarde: string): string {
  return waarde.slice(0, 10);
}

function binnen(
  waarde: string,
  vanaf: string,
  totEnMet: string,
): boolean {
  const datum = datumDeel(waarde);
  return datum >= vanaf && datum <= totEnMet;
}

function verschil(huidig: number, vorig: number): RapportageVerschil {
  return {
    huidig,
    vorig,
    absoluut: huidig - vorig,
    procentueel:
      vorig === 0
        ? null
        : ((huidig - vorig) / vorig) * 100,
  };
}

function periodeSelectie<T>(
  items: T[],
  datum: (item: T) => string,
  vanaf: string,
  totEnMet: string,
): T[] {
  return items.filter((item) =>
    binnen(datum(item), vanaf, totEnMet),
  );
}

export function bouwRapportagemotor(
  invoer: RapportagemotorInvoer,
): RapportagemotorUitkomst {
  const huidig = invoer.periode;
  const vorig = invoer.vorige_periode;

  const huidigeInspecties = periodeSelectie(
    invoer.inspecties,
    (item) => item.inspectiedatum,
    huidig.vanaf,
    huidig.tot_en_met,
  );
  const vorigeInspecties = periodeSelectie(
    invoer.inspecties,
    (item) => item.inspectiedatum,
    vorig.vanaf,
    vorig.tot_en_met,
  );

  const huidigeMeldingen = periodeSelectie(
    invoer.meldingen,
    (item) => item.melddatum,
    huidig.vanaf,
    huidig.tot_en_met,
  );
  const vorigeMeldingen = periodeSelectie(
    invoer.meldingen,
    (item) => item.melddatum,
    vorig.vanaf,
    vorig.tot_en_met,
  );

  const huidigeAfwijkingen = periodeSelectie(
    invoer.afwijkingen,
    (item) => item.created_at,
    huidig.vanaf,
    huidig.tot_en_met,
  );
  const vorigeAfwijkingen = periodeSelectie(
    invoer.afwijkingen,
    (item) => item.created_at,
    vorig.vanaf,
    vorig.tot_en_met,
  );

  const openMelding = (status: string) =>
    status !== "opgelost";
  const openAfwijking = (status: string) =>
    !["opgelost", "niet_relevant"].includes(status);

  const woningIds = [...new Set(invoer.meterstanden.map(m => m.woning_id))];
  const bron: Brondata = invoer.energie_brondata ?? {
    meterstanden: invoer.meterstanden,
    woningen: woningIds.map(id => ({id,adres:"",postcode:"",plaats:""})), bedrijven: [],
    verhuurperioden: woningIds.map(id=>({id,woning_id:id,bedrijf_id:0})),
    bewoners: woningIds.length === 1 ? invoer.bewoners.map((b,i)=>({...b,id:i+1,verhuurperiode_id:woningIds[0]})) : [],
  };
  let onvolledigeMeetperioden = 0;
  const energie = {} as Record<Energiedrager, EnergieKengetal>;
  for (const drager of [
    "elektriciteit",
    "dagstroom",
    "nachtstroom",
    "gas",
    "water",
  ] as Energiedrager[]) {
    const analyse = (vanaf: string, tot: string) =>
      bouwEnergiePortfolioAnalyse(bron, {
        niveau: "totaal",
        drager,
        vanaf,
        totEnMet: volgendeDag(tot),
        archief: true,
        modus: "schatting",
      });
    const a = analyse(huidig.vanaf, huidig.tot_en_met);
    const b = analyse(vorig.vanaf, vorig.tot_en_met);
    const compleet = (resultaat: ReturnType<typeof analyse>) =>
      resultaat.rijen.length > 0 &&
      resultaat.rijen.every(
        (rij) =>
          rij.dekking_percentage === 100 &&
          rij.per_persoon_per_week !== null,
      );
    const vergelijkbaar = compleet(a) && compleet(b);
    const huidigeNorm = compleet(a) ? a.per_persoon_per_week : null;
    const vorigeNorm = compleet(b) ? b.per_persoon_per_week : null;
    const delta =
      vergelijkbaar &&
      huidigeNorm !== null &&
      vorigeNorm !== null &&
      vorigeNorm > 0
        ? (100 * (huidigeNorm - vorigeNorm)) / vorigeNorm
        : null;
    const absoluteAfwijking = delta === null ? null : Math.abs(delta);
    energie[drager] = {
      totaal: a.totaal,
      persoonsweken: a.persoonsdagen / 7,
      per_persoon_per_week: huidigeNorm,
      vorige_per_persoon_per_week: vergelijkbaar ? vorigeNorm : null,
      afwijking_percentage: delta,
      signalering:
        delta === null
          ? "onvoldoende_data"
          : absoluteAfwijking !== null && absoluteAfwijking >= 35
            ? "kritiek"
            : absoluteAfwijking !== null && absoluteAfwijking >= 20
              ? "waarschuwing"
              : "normaal",
    };
    onvolledigeMeetperioden += a.uitgesloten_meetperioden;
  }

  let werkelijk = 0;
  let geschat = 0;
  const perFactuurontvanger: Record<string, number> = {};

  for (const afwijking of huidigeAfwijkingen) {
    const ontvanger =
      afwijking.factuur_naar ?? "nog_te_bepalen";

    if (afwijking.werkelijke_kosten !== null) {
      werkelijk += afwijking.werkelijke_kosten;
      perFactuurontvanger[ontvanger] =
        (perFactuurontvanger[ontvanger] ?? 0) +
        afwijking.werkelijke_kosten;
    } else if (afwijking.geschatte_kosten !== null) {
      geschat += afwijking.geschatte_kosten;
      perFactuurontvanger[ontvanger] =
        (perFactuurontvanger[ontvanger] ?? 0) +
        afwijking.geschatte_kosten;
    }
  }

  const rapportPeildatum = huidig.tot_en_met;

  const achterstalligeTaken = invoer.taken.filter(
    (taak) =>
      taak.created_at.slice(0, 10) <= rapportPeildatum &&
      ["open", "in_behandeling"].includes(taak.status) &&
      taak.deadline !== null &&
      taak.deadline < rapportPeildatum,
  );

  const openAfwijkingen = invoer.afwijkingen.filter(
    (item) =>
      item.created_at.slice(0, 10) <= rapportPeildatum &&
      openAfwijking(item.status),
  );
  const urgenteAfwijkingen =
    openAfwijkingen.filter((item) =>
      ["hoog", "spoed"].includes(
        item.urgentie,
      ),
    );

  const urgenteVeiligheidsafwijkingen =
    urgenteAfwijkingen.filter(
      (item) =>
        item.gebrek_type ===
        "veiligheidsrisico",
    );

  const kritiekeEnergieSignalen = [energie.elektriciteit, energie.gas, energie.water].filter((item) => item.signalering === "kritiek").length;

  const risicofactoren: string[] = [];
  let risicoscore = 0;

  if (urgenteAfwijkingen.length > 0) {
    const punten = Math.min(
      5,
      urgenteAfwijkingen.length * 2.5,
    );

    risicoscore += punten;
    risicofactoren.push(
      `${urgenteAfwijkingen.length} open afwijking(en) met hoge urgentie`,
    );
  }

  if (urgenteVeiligheidsafwijkingen.length > 0) {
    const punten = Math.min(
      3,
      urgenteVeiligheidsafwijkingen.length * 1.5,
    );

    risicoscore += punten;
    risicofactoren.push(
      `${urgenteVeiligheidsafwijkingen.length} urgente veiligheidsafwijking(en)`,
    );
  }

  if (achterstalligeTaken.length > 0) {
    risicoscore += Math.min(
      2,
      achterstalligeTaken.length * 0.5,
    );
    risicofactoren.push(
      `${achterstalligeTaken.length} achterstallige taak/taken`,
    );
  }

  if (kritiekeEnergieSignalen > 0) {
    risicoscore += Math.min(
      2,
      kritiekeEnergieSignalen,
    );
    risicofactoren.push(
      `${kritiekeEnergieSignalen} kritieke energieafwijking(en)`,
    );
  }

  if (openAfwijkingen.length > 0) {
    risicoscore += Math.min(
      2,
      openAfwijkingen.length * 0.25,
    );
    risicofactoren.push(
      `${openAfwijkingen.length} open controleafwijking(en)`,
    );
  }

  risicoscore = Math.min(
    10,
    Math.round(risicoscore * 10) / 10,
  );

  const classificatie =
    risicoscore >= 7.5
      ? "kritiek"
      : risicoscore >= 5
        ? "hoog"
        : risicoscore >= 2.5
          ? "middel"
          : "laag";

  const acties: string[] = [];

  if (urgenteAfwijkingen.length > 0) {
    acties.push(
      "Behandel open afwijkingen met hoge urgentie met voorrang en leg de opvolging vast.",
    );
  }

  if (urgenteVeiligheidsafwijkingen.length > 0) {
    acties.push(
      "Leg voor veiligheidsafwijkingen aantoonbaar herstelbewijs en een hercontrole vast.",
    );
  }

  if (achterstalligeTaken.length > 0) {
    acties.push(
      "Herplan of escaleer achterstallige opvolgtaken.",
    );
  }

  if (kritiekeEnergieSignalen > 0) {
    acties.push(
      "Controleer meterstanden, bezetting en technische oorzaken van het afwijkende energieverbruik.",
    );
  }

  if (
    Object.values(energie).some(
      (item) => item.signalering === "onvoldoende_data",
    )
  ) {
    acties.push(
      "Registreer voldoende opeenvolgende meterstanden en bezettingsgegevens.",
    );
  }

  if (acties.length === 0) {
    acties.push(
      "Geen directe escalatie nodig; reguliere opvolging voortzetten.",
    );
  }

  return {
    rekenregels_versie: 3,
    huidige_periode: {
      vanaf: huidig.vanaf,
      tot_en_met: huidig.tot_en_met,
    },
    vorige_periode: {
      vanaf: vorig.vanaf,
      tot_en_met: vorig.tot_en_met,
    },
    vergelijking: {
      inspecties: verschil(
        huidigeInspecties.length,
        vorigeInspecties.length,
      ),
      meldingen: verschil(
        huidigeMeldingen.length,
        vorigeMeldingen.length,
      ),
      open_meldingen: verschil(
        huidigeMeldingen.filter((item) =>
          openMelding(item.status),
        ).length,
        vorigeMeldingen.filter((item) =>
          openMelding(item.status),
        ).length,
      ),
      afwijkingen: verschil(
        huidigeAfwijkingen.length,
        vorigeAfwijkingen.length,
      ),
      open_afwijkingen: verschil(
        huidigeAfwijkingen.filter((item) =>
          openAfwijking(item.status),
        ).length,
        vorigeAfwijkingen.filter((item) =>
          openAfwijking(item.status),
        ).length,
      ),
    },
    energie: {
      ...energie,
      ongeldige_of_onvolledige_meetperioden:
        onvolledigeMeetperioden,
      kostenschatting_beschikbaar: false,
      kostenschatting_toelichting:
        "Energiekosten worden pas berekend zodra formele tarieven per eenheid zijn vastgelegd.",
    },
    kosten: {
      werkelijk,
      geschat,
      totaal_indicatie: werkelijk + geschat,
      definitief: geschat === 0,
      per_factuurontvanger: perFactuurontvanger,
    },
    risico: {
      score: risicoscore,
      classificatie,
      factoren: risicofactoren,
    },
    acties,
    toelichting_rekenregels: [
      "De vorige periode is de direct voorafgaande kalendermaand.",
      "Historische meterstanden blijven als bron beschikbaar; halfopen meetintervallen worden tijdsevenredig over de geselecteerde periode verdeeld.",
      "Tijdsdekking telt unieke kalenderdagen met een bruikbaar meetinterval; naar rato berekende grensintervallen tellen mee.",
      "Verbruik per persoon per week gebruikt geregistreerde persoonsdagen over dezelfde bruikbare meetperiode.",
      "Werkelijke kosten gaan vóór geschatte kosten; beide worden nooit bij dezelfde afwijking dubbel geteld.",
      "Een energieafwijking vanaf 20% geeft een waarschuwing en vanaf 35% een kritisch signaal.",
      "De risicoscore is uitlegbaar opgebouwd uit veiligheid, achterstallige taken, energie en open afwijkingen.",
    ],
  };
}
