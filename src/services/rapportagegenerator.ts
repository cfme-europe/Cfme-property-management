import { berekenVerbruiksperiodes } from "@/services/energieverbruik";
import { getBewonersVoorVerhuurperiode } from "@/services/bewoners";
import { getInspectiesVoorWoning } from "@/services/inspecties";
import { getMeldingenVoorWoning } from "@/services/meldingen";
import { getMeterstandenVoorWoning } from "@/services/meterstanden";
import { getWoningById } from "@/services/woningen";
import type {
  JsonWaarde,
  Maandrapportage,
} from "@/types/maandrapportage";

type RapportData = {
  [sleutel: string]: JsonWaarde;
};

function datum(
  jaar: number,
  maand: number,
  dag: number
): string {
  return [
    String(jaar).padStart(4, "0"),
    String(maand).padStart(2, "0"),
    String(dag).padStart(2, "0"),
  ].join("-");
}

function periodeGrenzen(
  jaar: number,
  maand: number
): {
  vanaf: string;
  totEnMet: string;
} {
  const laatsteDag = new Date(
    Date.UTC(jaar, maand, 0)
  ).getUTCDate();

  return {
    vanaf: datum(jaar, maand, 1),
    totEnMet: datum(jaar, maand, laatsteDag),
  };
}

function binnenPeriode(
  waarde: string,
  vanaf: string,
  totEnMet: string
): boolean {
  return waarde >= vanaf && waarde <= totEnMet;
}

export async function genereerMaandrapportageData(
  rapportage: Maandrapportage
): Promise<RapportData> {
  const { vanaf, totEnMet } = periodeGrenzen(
    rapportage.rapportjaar,
    rapportage.rapportmaand
  );

  const [
    woning,
    inspecties,
    meldingen,
    meterstanden,
    bewoners,
  ] = await Promise.all([
    getWoningById(rapportage.woning_id),
    getInspectiesVoorWoning(rapportage.woning_id),
    getMeldingenVoorWoning(rapportage.woning_id),
    getMeterstandenVoorWoning(rapportage.woning_id),
    rapportage.verhuurperiode_id
      ? getBewonersVoorVerhuurperiode(
          rapportage.verhuurperiode_id
        )
      : Promise.resolve([]),
  ]);

  if (!woning) {
    throw new Error("Woning niet gevonden.");
  }

  const periodeInspecties = inspecties.filter(
    (inspectie) =>
      binnenPeriode(
        inspectie.inspectiedatum,
        vanaf,
        totEnMet
      )
  );

  const periodeMeldingen = meldingen.filter(
    (melding) =>
      melding.melddatum <= totEnMet &&
      (
        melding.oplosdatum === null ||
        melding.oplosdatum >= vanaf
      )
  );

  const periodeMeterstanden = meterstanden.filter(
    (meterstand) =>
      binnenPeriode(
        meterstand.opnamedatum,
        vanaf,
        totEnMet
      )
  );

  const periodeBewoners = bewoners.filter(
    (bewoner) =>
      bewoner.incheckdatum <= totEnMet &&
      (
        bewoner.uitcheckdatum === null ||
        bewoner.uitcheckdatum >= vanaf
      )
  );

  const verbruiksperiodes =
    berekenVerbruiksperiodes(meterstanden).filter(
      (verbruiksperiode) =>
        binnenPeriode(
          verbruiksperiode.tot_datum,
          vanaf,
          totEnMet
        )
    );

  const openMeldingen = periodeMeldingen.filter(
    (melding) => melding.status !== "opgelost"
  );

  const opgelosteMeldingen = periodeMeldingen.filter(
    (melding) => melding.status === "opgelost"
  );

  const schademeldingen = periodeMeldingen.filter(
    (melding) => melding.categorie === "schade"
  );

  const inspectiesMetSchade =
    periodeInspecties.filter(
      (inspectie) => inspectie.schade_aanwezig
    );

  return {
    versie: 1,
    gegenereerd_op: new Date().toISOString(),

    rapportperiode: {
      jaar: rapportage.rapportjaar,
      maand: rapportage.rapportmaand,
      vanaf,
      tot_en_met: totEnMet,
    },

    woning: {
      id: woning.id,
      adres: woning.adres,
      postcode: woning.postcode,
      plaats: woning.plaats,
    },

    samenvatting: {
      bewoners_aantal: periodeBewoners.length,
      inspecties_aantal: periodeInspecties.length,
      inspecties_met_schade:
        inspectiesMetSchade.length,
      meldingen_aantal: periodeMeldingen.length,
      meldingen_open: openMeldingen.length,
      meldingen_opgelost:
        opgelosteMeldingen.length,
      schademeldingen_aantal:
        schademeldingen.length,
      meteropnames_aantal:
        periodeMeterstanden.length,
      verbruiksperiodes_aantal:
        verbruiksperiodes.length,
    },

    bewoners: periodeBewoners.map((bewoner) => ({
      id: bewoner.id,
      naam: [
        bewoner.voornaam,
        bewoner.tussenvoegsel,
        bewoner.achternaam,
      ]
        .filter(Boolean)
        .join(" "),
      kamer: bewoner.kamer?.naam ?? null,
      incheckdatum: bewoner.incheckdatum,
      uitcheckdatum: bewoner.uitcheckdatum,
      status: bewoner.status,
    })),

    inspecties: periodeInspecties.map(
      (inspectie) => ({
        id: inspectie.id,
        inspectiedatum:
          inspectie.inspectiedatum,
        type: inspectie.type,
        status: inspectie.status,
        algemene_toestand:
          inspectie.algemene_toestand,
        orde_netheid_score:
          inspectie.orde_netheid_score,
        schade_aanwezig:
          inspectie.schade_aanwezig,
        schade_omschrijving:
          inspectie.schade_omschrijving,
        uitgevoerd_door:
          inspectie.uitgevoerd_door,
        opmerkingen: inspectie.opmerkingen,
      })
    ),

    meldingen: periodeMeldingen.map(
      (melding) => ({
        id: melding.id,
        titel: melding.titel,
        omschrijving: melding.omschrijving,
        categorie: melding.categorie,
        prioriteit: melding.prioriteit,
        status: melding.status,
        melddatum: melding.melddatum,
        oplosdatum: melding.oplosdatum,
        verantwoordelijke:
          melding.verantwoordelijke,
        oplossing: melding.oplossing,
        factuur_naar: melding.factuur_naar,
        extern_referentienummer:
          melding.extern_referentienummer,
      })
    ),

    meterstanden: periodeMeterstanden.map(
      (meterstand) => ({
        id: meterstand.id,
        opnamedatum: meterstand.opnamedatum,
        bewoners_aantal:
          meterstand.bewoners_aantal,
        elektriciteit_kwh:
          meterstand.elektriciteit_kwh,
        gas_m3: meterstand.gas_m3,
        water_m3: meterstand.water_m3,
        opgenomen_door:
          meterstand.opgenomen_door,
      })
    ),

    energieverbruik: verbruiksperiodes.map(
      (verbruiksperiode) => ({
        van_datum:
          verbruiksperiode.van_datum,
        tot_datum:
          verbruiksperiode.tot_datum,
        aantal_dagen:
          verbruiksperiode.aantal_dagen,
        gemiddeld_bewoners_aantal:
          verbruiksperiode
            .gemiddeld_bewoners_aantal,
        elektriciteit_totaal:
          verbruiksperiode.elektriciteit
            .totaal,
        elektriciteit_per_bewoner_per_week:
          verbruiksperiode.elektriciteit
            .per_bewoner_per_week,
        gas_totaal:
          verbruiksperiode.gas.totaal,
        gas_per_bewoner_per_week:
          verbruiksperiode.gas
            .per_bewoner_per_week,
        water_totaal:
          verbruiksperiode.water.totaal,
        water_per_bewoner_per_week:
          verbruiksperiode.water
            .per_bewoner_per_week,
      })
    ),
  };
}
