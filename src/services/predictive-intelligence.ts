import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  analyseerPredictiveWoning,
  type PredictiveBrondata,
  type PredictiveWoningBron,
} from "@/lib/intelligence/predictive-woning";
import {
  PREDICTIVE_NIVEAU_VOLGORDE,
  type PredictiveFeitRij,
} from "@/lib/intelligence/predictive-utils";
import type { Meterstand } from "@/types/meterstand";
import type { WoningDnaSnapshot } from "@/types/intelligence";
import type { PredictiveIntelligenceResultaat } from "@/types/predictive-intelligence";

function fout(
  onderwerp: string,
  error: { message: string } | null,
): void {
  if (error) {
    throw new Error(
      `${onderwerp} mislukt: ${error.message}`,
    );
  }
}

export async function getPredictiveIntelligence(): Promise<PredictiveIntelligenceResultaat> {
  const supabase = await createClient();

  const [
    woningenResultaat,
    dnaResultaat,
    inspectiesResultaat,
    afwijkingenResultaat,
    meldingenResultaat,
    sessiesResultaat,
    meterstandenResultaat,
  ] = await Promise.all([
    supabase
      .from("woningen")
      .select(
        "id, adres, postcode, plaats",
      )
      .order("adres"),

    supabase
      .from("woning_dna_snapshots")
      .select("*")
      .order("peildatum"),

    supabase
      .from("inspecties")
      .select("*")
      .order("inspectiedatum"),

    supabase
      .from("controle_afwijkingen")
      .select("*")
      .order("created_at"),

    supabase
      .from("meldingen")
      .select("*")
      .order("melddatum"),

    supabase
      .from("controlesessies")
      .select("*")
      .order("created_at"),

    supabase
      .from("meterstanden")
      .select("*")
      .order("opnamedatum"),
  ]);

  fout(
    "Woningen ophalen",
    woningenResultaat.error,
  );
  fout(
    "Woning-DNA ophalen",
    dnaResultaat.error,
  );
  fout(
    "Inspecties ophalen",
    inspectiesResultaat.error,
  );
  fout(
    "Afwijkingen ophalen",
    afwijkingenResultaat.error,
  );
  fout(
    "Meldingen ophalen",
    meldingenResultaat.error,
  );
  fout(
    "Controlesessies ophalen",
    sessiesResultaat.error,
  );
  fout(
    "Meterstanden ophalen",
    meterstandenResultaat.error,
  );

  const woningen =
    (woningenResultaat.data ??
      []) as PredictiveWoningBron[];

  const brondata: PredictiveBrondata = {
    dna:
      (dnaResultaat.data ??
        []) as WoningDnaSnapshot[],

    inspecties:
      (inspectiesResultaat.data ??
        []) as PredictiveFeitRij[],

    afwijkingen:
      (afwijkingenResultaat.data ??
        []) as PredictiveFeitRij[],

    meldingen:
      (meldingenResultaat.data ??
        []) as PredictiveFeitRij[],

    sessies:
      (sessiesResultaat.data ??
        []) as PredictiveFeitRij[],

    meterstanden:
      (meterstandenResultaat.data ??
        []) as Meterstand[],
  };

  const geanalyseerdeWoningen =
    woningen
      .map((woning) =>
        analyseerPredictiveWoning(
          woning,
          brondata,
        ),
      )
      .sort(
        (a, b) =>
          b.prioriteit_score -
            a.prioriteit_score ||
          a.adres.localeCompare(
            b.adres,
            "nl-NL",
          ),
      );

  const alleSignalen =
    geanalyseerdeWoningen.flatMap(
      (woning) => woning.signalen,
    );

  return {
    gegenereerd_op:
      new Date().toISOString(),

    modelversie: 1,

    uitgangspunt:
      "Predictive Intelligence toont uitsluitend uitlegbare risicosignalen op basis van geregistreerde historie. Een signaal is geen vastgesteld feit en vervangt geen menselijke controle.",

    samenvatting: {
      woningen_geanalyseerd:
        geanalyseerdeWoningen.length,

      woningen_met_signalen:
        geanalyseerdeWoningen.filter(
          (woning) =>
            woning.signalen.some(
              (signaal) =>
                signaal.voldoende_historie &&
                PREDICTIVE_NIVEAU_VOLGORDE[
                  signaal.niveau
                ] >=
                  PREDICTIVE_NIVEAU_VOLGORDE
                    .middel,
            ),
        ).length,

      woningen_onvoldoende_historie:
        geanalyseerdeWoningen.filter(
          (woning) =>
            !woning.voldoende_historie,
        ).length,

      kritieke_signalen:
        alleSignalen.filter(
          (signaal) =>
            signaal.voldoende_historie &&
            signaal.niveau === "kritiek",
        ).length,

      hoge_signalen:
        alleSignalen.filter(
          (signaal) =>
            signaal.voldoende_historie &&
            signaal.niveau === "hoog",
        ).length,

      hercontroles_met_prioriteit:
        alleSignalen.filter(
          (signaal) =>
            signaal.type ===
              "prioriteit_hercontrole" &&
            signaal.voldoende_historie &&
            PREDICTIVE_NIVEAU_VOLGORDE[
              signaal.niveau
            ] >=
              PREDICTIVE_NIVEAU_VOLGORDE
                .middel,
        ).length,
    },

    woningen: geanalyseerdeWoningen,
  };
}
