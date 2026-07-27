import {
  controletijdUitRij,
  datumUitRij,
  dagenGeleden,
  gemiddelde,
  getal,
  maakPredictiveBewijs,
  maakPredictiveSignaal,
  rijBevatTerm,
  rijBinnenPeriode,
  type PredictiveFeitRij,
} from "@/lib/intelligence/predictive-utils";
import type {
  PredictiveSignaal,
} from "@/types/predictive-intelligence";
import type {
  WoningDnaSnapshot,
} from "@/types/intelligence";

type WoningHistorie = {
  dna: WoningDnaSnapshot[];
  inspecties: PredictiveFeitRij[];
  afwijkingen: PredictiveFeitRij[];
  meldingen: PredictiveFeitRij[];
  sessies: PredictiveFeitRij[];
};

function feitDatum(
  rij: PredictiveFeitRij,
): string | null {
  return datumUitRij(rij, [
    "inspectiedatum",
    "melddatum",
    "created_at",
  ]);
}

export function bouwLekkageSignaal(
  historie: WoningHistorie,
): PredictiveSignaal {
  const vanaf = dagenGeleden(365);

  const feiten = [
    ...historie.afwijkingen,
    ...historie.meldingen,
  ].filter(
    (rij) =>
      rijBinnenPeriode(
        rij,
        ["created_at", "melddatum"],
        vanaf,
      ) &&
      rijBevatTerm(rij, [
        "lekkage",
        "waterlek",
        "vocht",
      ]),
  );

  return maakPredictiveSignaal({
    type: "lekkagerisico",
    titel: "Mogelijk lekkagerisico",
    score: feiten.length * 24,
    waarnemingen: feiten.length,
    minimum: 2,
    berekening:
      "Aantal lekkage-, vocht- en waterlekregistraties binnen de laatste 365 dagen.",
    signaal:
      "Herhaalde lekkage- of vochtregistraties kunnen wijzen op een verhoogde kans op een nieuw incident.",
    advies:
      "Controleer aansluitingen, natte ruimten, leidingen en zichtbare vochtsporen gericht.",
    bewijzen: [
      maakPredictiveBewijs(
        "Afwijkingen en meldingen",
        "Registraties met lekkage-, vocht- of waterlekkenmerken",
        feiten.length,
        feiten.map(feitDatum),
      ),
    ],
  });
}

export function bouwSchadeSignaal(
  historie: WoningHistorie,
): PredictiveSignaal {
  const jaarVanaf = dagenGeleden(365);
  const halfjaarVanaf =
    dagenGeleden(180);

  const feiten = [
    ...historie.afwijkingen,
    ...historie.meldingen,
    ...historie.inspecties.filter(
      (rij) =>
        rij.schade_aanwezig === true,
    ),
  ].filter(
    (rij) =>
      rijBinnenPeriode(
        rij,
        [
          "inspectiedatum",
          "melddatum",
          "created_at",
        ],
        jaarVanaf,
      ) &&
      (
        rij.schade_aanwezig === true ||
        rijBevatTerm(rij, [
          "schade",
          "beschadiging",
          "defect",
        ])
      ),
  );

  const recent = feiten.filter(
    (rij) =>
      rijBinnenPeriode(
        rij,
        [
          "inspectiedatum",
          "melddatum",
          "created_at",
        ],
        halfjaarVanaf,
      ),
  );

  return maakPredictiveSignaal({
    type: "terugkerende_schade",
    titel: "Terugkerende schade",
    score:
      feiten.length * 15 +
      recent.length * 10,
    waarnemingen: feiten.length,
    minimum: 3,
    berekening:
      "Schaderegistraties in 365 dagen, met extra gewicht voor herhaling in de laatste 180 dagen.",
    signaal:
      "Meerdere schaderegistraties vormen mogelijk een terugkerend patroon.",
    advies:
      "Onderzoek de gemeenschappelijke oorzaak, locatie, het objecttype en eerder uitgevoerd herstel.",
    bewijzen: [
      maakPredictiveBewijs(
        "Inspecties, afwijkingen en meldingen",
        "Registraties met schade-, beschadigings- of defectkenmerken",
        feiten.length,
        feiten.map(feitDatum),
      ),
    ],
  });
}

export function bouwControletijdSignaal(
  historie: WoningHistorie,
): PredictiveSignaal {
  const waarden = [
    ...historie.dna.map(
      (snapshot) =>
        getal(
          snapshot
            .gemiddelde_controletijd_minuten,
        ),
    ),
    ...historie.sessies.map(
      controletijdUitRij,
    ),
  ].filter(
    (waarde): waarde is number =>
      waarde !== null && waarde > 0,
  );

  const laatste =
    waarden.at(-1) ?? null;
  const eerdere = waarden.slice(-7, -1);
  const historischGemiddelde =
    gemiddelde(eerdere);

  const afwijking =
    laatste !== null &&
    historischGemiddelde !== null &&
    historischGemiddelde > 0
      ? Math.abs(
          (
            (laatste -
              historischGemiddelde) /
            historischGemiddelde
          ) * 100,
        )
      : 0;

  return maakPredictiveSignaal({
    type: "ongebruikelijke_controletijd",
    titel: "Ongebruikelijke controletijd",
    score: afwijking + 20,
    waarnemingen: waarden.length,
    minimum: 4,
    berekening:
      "De laatste controletijd wordt vergeleken met maximaal zes eerdere controletijden van dezelfde woning.",
    signaal:
      afwijking >= 40
        ? `De laatste controletijd wijkt ongeveer ${Math.round(
            afwijking,
          )}% af van het historische gemiddelde.`
        : "Geen sterke afwijking in controletijd vastgesteld.",
    advies:
      "Controleer of looproute, woningomvang, problemen, registratie of uitvoering de afwijking verklaren.",
    bewijzen: [
      maakPredictiveBewijs(
        "Controlesessies en Woning-DNA",
        "Bruikbare historische controletijden",
        waarden.length,
        historie.dna.map(
          (snapshot) =>
            snapshot.peildatum,
        ),
      ),
    ],
  });
}

export function bouwConditieSignaal(
  historie: WoningHistorie,
): PredictiveSignaal {
  const netheidScores =
    historie.inspecties
      .map((rij) =>
        getal(
          rij.orde_netheid_score,
        ),
      )
      .filter(
        (waarde): waarde is number =>
          waarde !== null,
      )
      .slice(-4);

  const dnaScores = historie.dna
    .map((snapshot) =>
      getal(snapshot.risicoscore),
    )
    .filter(
      (waarde): waarde is number =>
        waarde !== null,
    )
    .slice(-4);

  const dalendeNetheid =
    netheidScores.length >= 3 &&
    netheidScores.every(
      (waarde, index) =>
        index === 0 ||
        waarde <=
          netheidScores[index - 1],
    ) &&
    netheidScores[0] -
      netheidScores.at(-1)! >=
      1;

  const stijgendRisico =
    dnaScores.length >= 3 &&
    dnaScores.every(
      (waarde, index) =>
        index === 0 ||
        waarde >=
          dnaScores[index - 1],
    ) &&
    dnaScores.at(-1)! -
      dnaScores[0] >=
      10;

  return maakPredictiveSignaal({
    type:
      "verslechterende_woningconditie",
    titel:
      "Verslechterende woningconditie",
    score:
      (dalendeNetheid ? 65 : 0) +
      (stijgendRisico ? 25 : 0),
    waarnemingen: Math.max(
      netheidScores.length,
      dnaScores.length,
    ),
    minimum: 3,
    berekening:
      "Trend over minimaal drie opeenvolgende netheidsscores en/of Woning-DNA-risicoscores.",
    signaal:
      dalendeNetheid ||
      stijgendRisico
        ? "De beschikbare trendgegevens wijzen mogelijk op een verslechterende woningconditie."
        : "Geen aanhoudende verslechtering in de beschikbare trendgegevens.",
    advies:
      "Plan een gerichte hercontrole van netheid, schade, installaties en terugkerende aandachtspunten.",
    bewijzen: [
      maakPredictiveBewijs(
        "Inspecties",
        "Opeenvolgende orde- en netheidsscores",
        netheidScores.length,
        historie.inspecties.map(
          feitDatum,
        ),
      ),
      maakPredictiveBewijs(
        "Woning-DNA",
        "Opeenvolgende risicosnapshots",
        dnaScores.length,
        historie.dna.map(
          (snapshot) =>
            snapshot.peildatum,
        ),
      ),
    ],
  });
}

export function bouwOnderhoudSignaal(
  historie: WoningHistorie,
): PredictiveSignaal {
  const openRegistraties = [
    ...historie.afwijkingen,
    ...historie.meldingen,
  ].filter((rij) => {
    const status =
      typeof rij.status === "string"
        ? rij.status.toLowerCase()
        : "";

    return (
      ![
        "opgelost",
        "afgerond",
        "gesloten",
        "niet_relevant",
      ].includes(status) &&
      rijBevatTerm(rij, [
        "onderhoud",
        "defect",
        "reparatie",
        "installatie",
        "schade",
        "lekkage",
      ])
    );
  });

  return maakPredictiveSignaal({
    type: "onderhoudsbehoefte",
    titel: "Verwachte onderhoudsbehoefte",
    score:
      openRegistraties.length * 22,
    waarnemingen:
      openRegistraties.length,
    minimum: 3,
    berekening:
      "Aantal open onderhouds-, defect-, reparatie-, installatie-, schade- en lekkageregistraties.",
    signaal:
      "De open werkvoorraad kan wijzen op oplopende onderhoudsbehoefte.",
    advies:
      "Bundel gerelateerde werkzaamheden en beoordeel preventief herstel voordat nieuwe uitval ontstaat.",
    bewijzen: [
      maakPredictiveBewijs(
        "Afwijkingen en meldingen",
        "Open onderhoudsgerelateerde registraties",
        openRegistraties.length,
        openRegistraties.map(
          feitDatum,
        ),
      ),
    ],
  });
}

export type {
  WoningHistorie,
};
