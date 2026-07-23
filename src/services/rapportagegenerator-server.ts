import "server-only";

import { createClient } from "@/lib/supabase/server";
import { berekenVerbruiksperiodes } from "@/services/energieverbruik";
import type { Bewoner } from "@/types/bewoner";
import type { Inspectie } from "@/types/inspectie";
import type { Melding } from "@/types/melding";
import type {
  JsonWaarde,
  Maandrapportage,
} from "@/types/maandrapportage";
import type { Meterstand } from "@/types/meterstand";
import type {
  RapporttemplateversieMetBlokken,
} from "@/types/rapportagebibliotheek";
import type { Woning } from "@/types/woning";

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

  const supabase = await createClient();

  const [
    woningResultaat,
    inspectiesResultaat,
    meldingenResultaat,
    meterstandenResultaat,
    bewonersResultaat,
    templateResultaat,
  ] = await Promise.all([
    supabase
      .from("woningen")
      .select("id, created_at, dossiernummer, adres, postcode, plaats")
      .eq("id", rapportage.woning_id)
      .maybeSingle(),

    supabase
      .from("inspecties")
      .select("*")
      .eq("woning_id", rapportage.woning_id)
      .order("inspectiedatum", { ascending: false }),

    supabase
      .from("meldingen")
      .select("*")
      .eq("woning_id", rapportage.woning_id)
      .order("melddatum", { ascending: false }),

    supabase
      .from("meterstanden")
      .select("*")
      .eq("woning_id", rapportage.woning_id)
      .order("opnamedatum", { ascending: false }),

    rapportage.verhuurperiode_id
      ? supabase
          .from("bewoners")
          .select(`
            *,
            kamer:kamers (*)
          `)
          .eq(
            "verhuurperiode_id",
            rapportage.verhuurperiode_id
          )
          .order("incheckdatum", {
            ascending: false,
          })
      : Promise.resolve({
          data: [],
          error: null,
        }),

    supabase
      .from("rapporttemplateversies")
      .select(`
        *,
        blokken:rapporttemplateblokken (
          *,
          rapportblok:rapportblokken (*)
        )
      `)
      .eq("id", rapportage.templateversie_id)
      .eq("status", "actief")
      .maybeSingle(),
  ]);

  if (woningResultaat.error) {
    throw new Error(
      `Woning ophalen mislukt: ${woningResultaat.error.message}`
    );
  }

  if (inspectiesResultaat.error) {
    throw new Error(
      `Inspecties ophalen mislukt: ${inspectiesResultaat.error.message}`
    );
  }

  if (meldingenResultaat.error) {
    throw new Error(
      `Meldingen ophalen mislukt: ${meldingenResultaat.error.message}`
    );
  }

  if (meterstandenResultaat.error) {
    throw new Error(
      `Meterstanden ophalen mislukt: ${meterstandenResultaat.error.message}`
    );
  }

  if (bewonersResultaat.error) {
    throw new Error(
      `Bewoners ophalen mislukt: ${bewonersResultaat.error.message}`
    );
  }

  if (templateResultaat.error) {
    throw new Error(
      `Gekoppelde templateversie ophalen mislukt: ${templateResultaat.error.message}`
    );
  }

  const woning =
    woningResultaat.data as Woning | null;

  if (!woning) {
    throw new Error("Woning niet gevonden.");
  }

  if (!templateResultaat.data) {
    throw new Error(
      "De gekoppelde templateversie is niet actief of bestaat niet."
    );
  }

  const inspecties =
    (inspectiesResultaat.data ?? []) as Inspectie[];

  const meldingen =
    (meldingenResultaat.data ?? []) as Melding[];

  const meterstanden =
    (meterstandenResultaat.data ?? []) as Meterstand[];

  const bewoners =
    (bewonersResultaat.data ?? []) as Bewoner[];

  const ongesorteerdeTemplate =
    templateResultaat.data as RapporttemplateversieMetBlokken;

  const templateversie = {
    ...ongesorteerdeTemplate,
    blokken: [...ongesorteerdeTemplate.blokken]
      .filter((blok) => blok.zichtbaar)
      .sort((a, b) => a.volgorde - b.volgorde),
  };

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

  const zichtbareBlokken =
    templateversie.blokken.map((koppeling) => ({
      code: koppeling.rapportblok.code,
      bloktype: koppeling.rapportblok.bloktype,
      titel:
        koppeling.titel_override ??
        koppeling.rapportblok.naam,
      volgorde: koppeling.volgorde,
      verplicht: koppeling.verplicht,
    }));

  const zichtbareBloktypen = new Set(
    zichtbareBlokken.map((blok) => blok.bloktype)
  );

  return {
    versie: 2,
    gegenereerd_op: new Date().toISOString(),

    template: {
      templateversie_id: templateversie.id,
      template_id: templateversie.template_id,
      versienummer: templateversie.versienummer,
      blokken: zichtbareBlokken,
    },

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

    ...(zichtbareBloktypen.has("samenvatting")
      ? {
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
        }
      : {}),

    ...(zichtbareBloktypen.has("bewoners")
      ? {
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
        }
      : {}),

    ...(zichtbareBloktypen.has("inspecties")
      ? {
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
        }
      : {}),

    ...(zichtbareBloktypen.has("meldingen")
      ? {
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
        }
      : {}),

    ...(zichtbareBloktypen.has("meterstanden")
      ? {
          meterstanden: periodeMeterstanden.map(
      (meterstand) => ({
        id: meterstand.id,
        opnamedatum: meterstand.opnamedatum,
        bewoners_aantal:
          meterstand.bewoners_aantal,
        dagstroom_kwh:
          meterstand.dagstroom_kwh,
        nachtstroom_kwh:
          meterstand.nachtstroom_kwh,
        elektriciteit_kwh:
          meterstand.elektriciteit_kwh,
        gas_m3: meterstand.gas_m3,
        water_m3: meterstand.water_m3,
        opgenomen_door:
          meterstand.opgenomen_door,
            })
          ),
        }
      : {}),

    ...(zichtbareBloktypen.has("energieverbruik")
      ? {
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
        dagstroom_totaal:
          verbruiksperiode.dagstroom.totaal,
        dagstroom_per_bewoner_per_week:
          verbruiksperiode.dagstroom
            .per_bewoner_per_week,
        nachtstroom_totaal:
          verbruiksperiode.nachtstroom.totaal,
        nachtstroom_per_bewoner_per_week:
          verbruiksperiode.nachtstroom
            .per_bewoner_per_week,
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
        }
      : {}),

    ...(zichtbareBloktypen.has("opmerkingen")
      ? {
          opmerkingen:
            rapportage.opmerkingen ?? null,
        }
      : {}),
  };
}
