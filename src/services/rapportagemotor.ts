import { berekenVerbruiksperiodes } from "@/services/energieverbruik";
import type {
  EnergieKengetal,
  RapportagemotorInvoer,
  RapportagemotorUitkomst,
  RapportageVerschil,
} from "@/types/rapportagemotor";

const DAG_MILLISECONDEN = 86_400_000;

function datumTijd(waarde: string): number {
  const [jaar, maand, dag] = waarde.split("-").map(Number);
  return Date.UTC(jaar, maand - 1, dag);
}

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

function persoonsdagen(
  bewoners: RapportagemotorInvoer["bewoners"],
  vanaf: string,
  totEnMet: string,
): number {
  const begin = datumTijd(vanaf);
  const einde = datumTijd(totEnMet);

  return bewoners.reduce((totaal, bewoner) => {
    const bewonerBegin = Math.max(
      begin,
      datumTijd(bewoner.incheckdatum),
    );
    const bewonerEinde = Math.min(
      einde,
      datumTijd(bewoner.uitcheckdatum ?? totEnMet),
    );

    if (bewonerEinde < bewonerBegin) {
      return totaal;
    }

    return (
      totaal +
      Math.floor(
        (bewonerEinde - bewonerBegin) /
          DAG_MILLISECONDEN,
      ) +
      1
    );
  }, 0);
}

type VerbruiksSleutel =
  | "dagstroom"
  | "nachtstroom"
  | "elektriciteit"
  | "gas"
  | "water";

function kengetal(
  sleutel: VerbruiksSleutel,
  periodes: ReturnType<typeof berekenVerbruiksperiodes>,
  vorigePeriodes: ReturnType<typeof berekenVerbruiksperiodes>,
  bewoners: RapportagemotorInvoer["bewoners"],
): EnergieKengetal {
  function bereken(
    selectie: ReturnType<typeof berekenVerbruiksperiodes>,
  ): {
    totaal: number | null;
    persoonsweken: number;
    perPersoonPerWeek: number | null;
  } {
    let totaal = 0;
    let heeftTotaal = false;
    let gewogenPersoonsweken = 0;

    for (const periode of selectie) {
      const waarde = periode[sleutel].totaal;

      if (waarde === null) {
        continue;
      }

      const dagen = persoonsdagen(
        bewoners,
        periode.van_datum,
        periode.tot_datum,
      );
      const weken = dagen / 7;

      totaal += waarde;
      heeftTotaal = true;
      gewogenPersoonsweken += weken;
    }

    return {
      totaal: heeftTotaal ? totaal : null,
      persoonsweken: gewogenPersoonsweken,
      perPersoonPerWeek:
        heeftTotaal && gewogenPersoonsweken > 0
          ? totaal / gewogenPersoonsweken
          : null,
    };
  }

  const huidig = bereken(periodes);
  const vorig = bereken(vorigePeriodes);

  const afwijking =
    huidig.perPersoonPerWeek !== null &&
    vorig.perPersoonPerWeek !== null &&
    vorig.perPersoonPerWeek > 0
      ? ((huidig.perPersoonPerWeek -
          vorig.perPersoonPerWeek) /
          vorig.perPersoonPerWeek) *
        100
      : null;

  const absoluteAfwijking =
    afwijking === null ? null : Math.abs(afwijking);

  return {
    totaal: huidig.totaal,
    persoonsweken: huidig.persoonsweken,
    per_persoon_per_week: huidig.perPersoonPerWeek,
    vorige_per_persoon_per_week:
      vorig.perPersoonPerWeek,
    afwijking_percentage: afwijking,
    signalering:
      afwijking === null
        ? "onvoldoende_data"
        : absoluteAfwijking !== null &&
            absoluteAfwijking >= 35
          ? "kritiek"
          : absoluteAfwijking !== null &&
              absoluteAfwijking >= 20
            ? "waarschuwing"
            : "normaal",
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

  const alleVerbruiksperiodes =
    berekenVerbruiksperiodes(invoer.meterstanden);

  const huidigeVerbruiksperiodes =
    alleVerbruiksperiodes.filter((periode) =>
      binnen(
        periode.tot_datum,
        huidig.vanaf,
        huidig.tot_en_met,
      ),
    );

  const vorigeVerbruiksperiodes =
    alleVerbruiksperiodes.filter((periode) =>
      binnen(
        periode.tot_datum,
        vorig.vanaf,
        vorig.tot_en_met,
      ),
    );

  const energie = {
    dagstroom: kengetal(
      "dagstroom",
      huidigeVerbruiksperiodes,
      vorigeVerbruiksperiodes,
      invoer.bewoners,
    ),
    nachtstroom: kengetal(
      "nachtstroom",
      huidigeVerbruiksperiodes,
      vorigeVerbruiksperiodes,
      invoer.bewoners,
    ),
    elektriciteit: kengetal(
      "elektriciteit",
      huidigeVerbruiksperiodes,
      vorigeVerbruiksperiodes,
      invoer.bewoners,
    ),
    gas: kengetal(
      "gas",
      huidigeVerbruiksperiodes,
      vorigeVerbruiksperiodes,
      invoer.bewoners,
    ),
    water: kengetal(
      "water",
      huidigeVerbruiksperiodes,
      vorigeVerbruiksperiodes,
      invoer.bewoners,
    ),
  };

  const onvolledigeMeetperioden =
    alleVerbruiksperiodes.filter(
      (periode) =>
        binnen(
          periode.tot_datum,
          huidig.vanaf,
          huidig.tot_en_met,
        ) &&
        [
          periode.elektriciteit.totaal,
          periode.gas.totaal,
          periode.water.totaal,
        ].every((waarde) => waarde === null),
    ).length;

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

  const vandaag = new Date().toISOString().slice(0, 10);
  const achterstalligeTaken = invoer.taken.filter(
    (taak) =>
      ["open", "in_behandeling"].includes(taak.status) &&
      taak.deadline !== null &&
      taak.deadline < vandaag,
  );

  const openAfwijkingen = invoer.afwijkingen.filter(
    (item) => openAfwijking(item.status),
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

  const kritiekeEnergieSignalen = Object.values(
    energie,
  ).filter((item) => item.signalering === "kritiek").length;

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
    rekenregels_versie: 1,
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
      "Verbruik wordt toegerekend aan de maand waarin de eindmeterstand is opgenomen.",
      "Verbruik per persoon per week gebruikt persoonsdagen binnen de exacte meetperiode.",
      "Werkelijke kosten gaan vóór geschatte kosten; beide worden nooit bij dezelfde afwijking dubbel geteld.",
      "Een energieafwijking vanaf 20% geeft een waarschuwing en vanaf 35% een kritisch signaal.",
      "De risicoscore is uitlegbaar opgebouwd uit veiligheid, achterstallige taken, energie en open afwijkingen.",
    ],
  };
}
