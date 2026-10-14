import {leesAlleRijen} from "@/lib/energie/paginering";
import "server-only";

import { createClient } from "@/lib/supabase/server";
import { maakMeetperioden, type Brondata, type Energiedrager } from "@/lib/energie/portfolio-analyse";
import type { Inspectie } from "@/types/inspectie";
import type { Melding } from "@/types/melding";
import type { Meterstand } from "@/types/meterstand";
import type { Taak } from "@/types/taak";
import type { Certificering } from "@/types/certificering";
import type {
  WoningDnaRisiconiveau,
  WoningDnaSnapshot,
} from "@/types/intelligence";

type DashboardWoning = {
  id: number;
  adres: string;
  postcode: string;
  plaats: string;
};

export type DashboardMelding = Melding & {
  woning: DashboardWoning | null;
};

export type DashboardInspectie = Inspectie & {
  woning: DashboardWoning | null;
};

export type DashboardTaak = Taak & {
  woning: DashboardWoning | null;
  over_deadline: boolean;
};

export type DashboardCertificering = Certificering & {
  woning: DashboardWoning | null;
};

export type DashboardWoningRisico = {
  woning: DashboardWoning;
  peildatum: string;
  risicoscore: number;
  risiconiveau: WoningDnaRisiconiveau;
  meldingen_open: number;
  taken_open: number;
  taken_over_deadline: number;
  aandachtspunten: string[];
};

export type DashboardEnergieAfwijking = {
  woning: DashboardWoning;
  soort: "Elektriciteit" | "Gas" | "Water";
  eenheid: "kWh" | "m³";
  laatste_waarde: number;
  gemiddelde_eerdere: number;
  afwijking_percentage: number;
  periode_van: string;
  periode_tot: string;
};

export type DashboardData = {
  kpis: {
    bedrijven: number;
    woningen: number;
    actieve_verhuurperiodes: number;
    actieve_bewoners: number;
    kamers: number;
    totale_capaciteit: number;
    open_meldingen: number;
    open_inspecties: number;
    open_taken: number;
    taken_over_deadline: number;
    compliance_aandacht: number;
    woningen_zonder_planning: number;
    concept_rapportages: number;
    hoge_kritieke_woningen: number;
  };
  openMeldingen: DashboardMelding[];
  recenteInspecties: DashboardInspectie[];
  openTaken: DashboardTaak[];
  complianceAandacht: DashboardCertificering[];
  woningRisicos: DashboardWoningRisico[];
  energieAfwijkingen: DashboardEnergieAfwijking[];
};

function aantal(
  waarde: number | null
): number {
  return waarde ?? 0;
}

function gemiddelde(
  waarden: number[]
): number | null {
  if (waarden.length === 0) {
    return null;
  }

  return (
    waarden.reduce(
      (totaal, waarde) => totaal + waarde,
      0
    ) / waarden.length
  );
}

function woningMap(
  woningen: DashboardWoning[]
): Map<number, DashboardWoning> {
  return new Map(
    woningen.map((woning) => [
      woning.id,
      woning,
    ])
  );
}

type SupabaseFout = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
};

function foutDetails(
  fout: SupabaseFout
): string {
  const objectFout =
    typeof fout === "object" &&
    fout !== null
      ? fout
      : null;

  const eigenVelden = objectFout
    ? Object.fromEntries(
        Reflect.ownKeys(objectFout)
          .filter(
            (sleutel): sleutel is string =>
              typeof sleutel === "string"
          )
          .map((sleutel) => {
            try {
              return [
                sleutel,
                String(
                  (
                    objectFout as Record<
                      string,
                      unknown
                    >
                  )[sleutel]
                ),
              ];
            } catch {
              return [
                sleutel,
                "[niet uitleesbaar]",
              ];
            }
          })
      )
    : {};

  return JSON.stringify({
    type:
      objectFout?.constructor?.name ??
      typeof fout,
    tekst: String(fout),
    message: fout.message ?? null,
    code: fout.code ?? null,
    details: fout.details ?? null,
    hint: fout.hint ?? null,
    status: fout.status ?? null,
    eigenVelden,
  });
}

function foutmelding(
  onderwerp: string,
  fout: SupabaseFout | null
): void {
  if (!fout) {
    return;
  }

  const details = foutDetails(fout);

  console.error(
    `[CFME Dashboard] ${onderwerp} mislukt`,
    details
  );

  throw new Error(
    `${onderwerp} mislukt: ${details}`
  );
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const woningenResultaat = await supabase
    .from("woningen")
    .select("id, adres, postcode, plaats")
    .eq("status", "actief")
    .order("adres", { ascending: true });
  foutmelding("Woningen ophalen", woningenResultaat.error);
  const woningen = (woningenResultaat.data ?? []) as DashboardWoning[];
  const woningIds = woningen.length > 0 ? woningen.map((woning) => woning.id) : [-1];

  const [
    bedrijvenResultaat,
    verhuurResultaat,
    bewonersResultaat,
    kamersResultaat,
    meldingenCountResultaat,
    inspectiesCountResultaat,
    openMeldingenResultaat,
    recenteInspectiesResultaat,
    meterstandenResultaat,
    openTakenResultaat,
    complianceResultaat,
    dnaResultaat,
    planningResultaat,
    conceptRapportagesResultaat,
  ] = await Promise.all([
    supabase
      .from("bedrijven")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("verhuurperiodes")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "actief")
      .in("woning_id", woningIds),

    supabase
      .from("bewoners")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "actief"),

    supabase
      .from("kamers")
      .select("id, capaciteit, woning_id")
      .eq("actief", true)
      .in("woning_id", woningIds),

    supabase
      .from("meldingen")
      .select("*", {
        count: "exact",
        head: true,
      })
      .neq("status", "opgelost")
      .in("woning_id", woningIds),

    supabase
      .from("inspecties")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "open")
      .in("woning_id", woningIds),

    supabase
      .from("meldingen")
      .select("*")
      .neq("status", "opgelost")
      .in("woning_id", woningIds)
      .order("melddatum", {
        ascending: false,
      })
      .limit(10),

    supabase
      .from("inspecties")
      .select("*")
      .neq("status", "geannuleerd")
      .in("woning_id", woningIds)
      .order("inspectiedatum", {
        ascending: false,
      })
      .limit(8),

    leesAlleRijen((van,tot)=>supabase.from("meterstanden").select("*").in("woning_id",woningIds).order("id").range(van,tot)).then(data=>({data,error:null})),

    supabase
      .from("taken")
      .select("*")
      .in("status", [
        "open",
        "in_behandeling",
      ])
      .in("woning_id", woningIds)
      .order("deadline", {
        ascending: true,
        nullsFirst: false,
      })
      .order("created_at", {
        ascending: false,
      })
      .limit(12),

    supabase
      .from("certificeringen_overzicht")
      .select("*")
      .in("compliance_status", [
        "verloopt_binnenkort",
        "verlopen",
      ])
      .in("woning_id", woningIds)
      .order("resterende_dagen", {
        ascending: true,
      })
      .limit(12),

    supabase
      .from("woning_dna_snapshots")
      .select("*")
      .in("woning_id", woningIds)
      .order("peildatum", {
        ascending: false,
      })
      .order("berekend_at", {
        ascending: false,
      }),

    supabase
      .from("woning_rayon_toewijzingen")
      .select("woning_id")
      .eq("actief", true)
      .in("woning_id", woningIds)
      .is("geldig_tot", null),

    supabase
      .from("maandrapportages")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "concept")
      .in("woning_id", woningIds),
  ]);

  foutmelding(
    "Bedrijven ophalen",
    bedrijvenResultaat.error
  );
  foutmelding(
    "Actieve verhuurperiodes ophalen",
    verhuurResultaat.error
  );
  foutmelding(
    "Actieve bewoners ophalen",
    bewonersResultaat.error
  );
  foutmelding(
    "Kamers ophalen",
    kamersResultaat.error
  );
  foutmelding(
    "Open meldingen tellen",
    meldingenCountResultaat.error
  );
  foutmelding(
    "Open inspecties tellen",
    inspectiesCountResultaat.error
  );
  foutmelding(
    "Open meldingen ophalen",
    openMeldingenResultaat.error
  );
  foutmelding(
    "Recente inspecties ophalen",
    recenteInspectiesResultaat.error
  );
  foutmelding(
    "Meterstanden ophalen",
    meterstandenResultaat.error
  );
  foutmelding(
    "Open taken ophalen",
    openTakenResultaat.error
  );
  foutmelding(
    "Compliance-aandacht ophalen",
    complianceResultaat.error
  );
  foutmelding(
    "Woning-DNA ophalen",
    dnaResultaat.error
  );
  foutmelding(
    "Woningplanning ophalen",
    planningResultaat.error
  );
  foutmelding(
    "Conceptrapportages tellen",
    conceptRapportagesResultaat.error
  );

  const woningenPerId =
    woningMap(woningen);

  const kamers =
    (kamersResultaat.data ?? []) as Array<{
      id: number;
      capaciteit: number;
    }>;

  const openMeldingen =
    (
      (openMeldingenResultaat.data ??
        []) as Melding[]
    ).map((melding) => ({
      ...melding,
      woning:
        woningenPerId.get(
          melding.woning_id
        ) ?? null,
    }));

  const recenteInspecties =
    (
      (recenteInspectiesResultaat.data ??
        []) as Inspectie[]
    ).map((inspectie) => ({
      ...inspectie,
      woning:
        woningenPerId.get(
          inspectie.woning_id
        ) ?? null,
    }));

  const vandaag =
    new Date().toISOString().slice(0, 10);

  const openTaken =
    (
      (openTakenResultaat.data ??
        []) as Taak[]
    ).map((taak) => ({
      ...taak,
      woning:
        woningenPerId.get(
          taak.woning_id
        ) ?? null,
      over_deadline:
        taak.deadline !== null &&
        taak.deadline < vandaag,
    }));

  const complianceAandacht =
    (
      (complianceResultaat.data ??
        []) as Certificering[]
    ).map((certificering) => ({
      ...certificering,
      woning:
        woningenPerId.get(
          certificering.woning_id
        ) ?? null,
    }));

  const laatsteDnaPerWoning =
    new Map<number, WoningDnaSnapshot>();

  for (
    const snapshot of
      (dnaResultaat.data ??
        []) as WoningDnaSnapshot[]
  ) {
    if (
      !laatsteDnaPerWoning.has(
        snapshot.woning_id
      )
    ) {
      laatsteDnaPerWoning.set(
        snapshot.woning_id,
        snapshot
      );
    }
  }

  const woningRisicos: DashboardWoningRisico[] =
    [];

  for (
    const [
      woningId,
      snapshot,
    ] of laatsteDnaPerWoning
  ) {
    const woning =
      woningenPerId.get(woningId);

    if (
      !woning ||
      !["hoog", "kritiek"].includes(
        snapshot.risiconiveau
      )
    ) {
      continue;
    }

    woningRisicos.push({
      woning,
      peildatum: snapshot.peildatum,
      risicoscore: snapshot.risicoscore,
      risiconiveau: snapshot.risiconiveau,
      meldingen_open:
        snapshot.meldingen_open,
      taken_open:
        snapshot.taken_open,
      taken_over_deadline:
        snapshot.taken_over_deadline,
      aandachtspunten:
        snapshot.aandachtspunten,
    });
  }

  woningRisicos.sort(
    (a, b) =>
      b.risicoscore - a.risicoscore
  );

  const geplandeWoningIds =
    new Set(
      (
        planningResultaat.data ??
        []
      ).map(
        (toewijzing) =>
          Number(toewijzing.woning_id)
      )
    );

  const woningenZonderPlanning =
    woningen.filter(
      (woning) =>
        !geplandeWoningIds.has(woning.id)
    ).length;

  const meterstanden =
    (meterstandenResultaat.data ??
      []) as Meterstand[];

  const meterstandenPerWoning =
    new Map<number, Meterstand[]>();

  for (const meterstand of meterstanden) {
    const bestaande =
      meterstandenPerWoning.get(
        meterstand.woning_id
      ) ?? [];

    bestaande.push(meterstand);

    meterstandenPerWoning.set(
      meterstand.woning_id,
      bestaande
    );
  }

  const energieAfwijkingen: DashboardEnergieAfwijking[] =
    [];

  const [huurBron, bewonersBron] = await Promise.all([
    leesAlleRijen((van,tot)=>supabase.from("verhuurperiodes").select("id,woning_id,bedrijf_id,startdatum,werkelijke_einddatum").in("woning_id",woningIds).order("id").range(van,tot)),
    leesAlleRijen((van,tot)=>supabase.from("bewoners").select("id,verhuurperiode_id,incheckdatum,uitcheckdatum").order("id").range(van,tot)),
  ]);
  const {error:configFout}=await supabase.from("energie_meterconfiguraties").select("id").limit(1);
  if(configFout && !["42P01","PGRST205"].includes(configFout.code)) throw new Error(configFout.message);
  const configs=configFout?[]:await leesAlleRijen((van,tot)=>supabase.from("energie_meterconfiguraties").select("*").order("id").range(van,tot));
  const vervangenConfigs=new Set(configs.map(c=>c.voorganger_id));
  for(const [woningId,woningMeterstanden] of meterstandenPerWoning) {
    const woning=woningenPerId.get(woningId); if(!woning||woningMeterstanden.length<2)continue;
    const dates=woningMeterstanden.map(m=>m.opnamedatum).sort();
    const vanaf=dates[0];
    if(dates.at(-1)!<=vanaf)continue;
    const bron:Brondata={woningen:[woning],bedrijven:[],meterstanden:woningMeterstanden,verhuurperioden:huurBron as Brondata["verhuurperioden"],bewoners:bewonersBron as Brondata["bewoners"],meterconfiguraties:configs.filter(c=>!vervangenConfigs.has(c.id)) as Brondata["meterconfiguraties"]};
    for(const drager of ["elektriciteit","gas","water"] as Energiedrager[]){
      const periodes=maakMeetperioden(bron,{niveau:"woning",woningId,drager,vanaf,totEnMet:dates.at(-1)!}).sort((a,b)=>b.totDatum.localeCompare(a.totDatum));
      const laatste=periodes[0];
      if(!laatste||laatste.totDatum!==dates.at(-1)||!laatste.betrouwbaar||laatste.bezettingsconflict||!laatste.persoonsdagen||laatste.waarde===null)continue;
      const norm=laatste.waarde/(laatste.persoonsdagen/7);
      const eerdere=periodes.slice(1).filter(i=>i.betrouwbaar&&!i.bezettingsconflict&&i.persoonsdagen>0&&i.waarde!==null).slice(0,6).map(i=>i.waarde!/(i.persoonsdagen/7));
      const referentie=gemiddelde(eerdere);if(referentie===null||referentie<=0)continue;
      const afwijking=100*(norm-referentie)/referentie;if(Math.abs(afwijking)<20)continue;
      energieAfwijkingen.push({woning,soort:drager==="elektriciteit"?"Elektriciteit":drager==="gas"?"Gas":"Water",eenheid:drager==="elektriciteit"?"kWh":"m³",laatste_waarde:norm,gemiddelde_eerdere:referentie,afwijking_percentage:afwijking,periode_van:laatste.vanDatum,periode_tot:laatste.totDatum});
    }
  }

  energieAfwijkingen.sort(
    (a, b) =>
      Math.abs(
        b.afwijking_percentage
      ) -
      Math.abs(
        a.afwijking_percentage
      )
  );

  return {
    kpis: {
      bedrijven: aantal(
        bedrijvenResultaat.count
      ),
      woningen: woningen.length,
      actieve_verhuurperiodes: aantal(
        verhuurResultaat.count
      ),
      actieve_bewoners: aantal(
        bewonersResultaat.count
      ),
      kamers: kamers.length,
      totale_capaciteit:
        kamers.reduce(
          (totaal, kamer) =>
            totaal +
            Number(kamer.capaciteit ?? 0),
          0
        ),
      open_meldingen: aantal(
        meldingenCountResultaat.count
      ),
      open_inspecties: aantal(
        inspectiesCountResultaat.count
      ),
      open_taken: openTaken.length,
      taken_over_deadline:
        openTaken.filter(
          (taak) => taak.over_deadline
        ).length,
      compliance_aandacht:
        complianceAandacht.length,
      woningen_zonder_planning:
        woningenZonderPlanning,
      concept_rapportages: aantal(
        conceptRapportagesResultaat.count
      ),
      hoge_kritieke_woningen:
        woningRisicos.length,
    },
    openMeldingen,
    recenteInspecties,
    openTaken,
    complianceAandacht,
    woningRisicos:
      woningRisicos.slice(0, 10),
    energieAfwijkingen:
      energieAfwijkingen.slice(0, 10),
  };
}
