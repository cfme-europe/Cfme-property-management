import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/services/dashboard";
import {
  getPlanningIntelligenceSamenvatting,
  getWoningPlanningIntelligence,
} from "@/services/planning-intelligence";
import type {
  BusinessIntelligenceCockpit,
  CockpitAandachtspunt,
  CockpitKosten,
  CockpitOverbezetting,
  CockpitWoning,
} from "@/types/business-intelligence";
import type {
  WoningComplianceSamenvatting,
} from "@/types/compliance";

type KamerRij = {
  id: number;
  woning_id: number;
  capaciteit: number;
};

type BewonerRij = {
  id: number;
  kamer_id: number | null;
};

type RapportageRij = {
  id: number;
  woning_id: number;
  titel: string;
  status: string;
  rapportjaar: number;
  rapportmaand: number;
  ontvanger_naam: string | null;
};

function fout(
  onderwerp: string,
  error: { message: string } | null
): void {
  if (error) {
    throw new Error(
      `${onderwerp} mislukt: ${error.message}`
    );
  }
}

function nummer(
  waarde: unknown
): number | null {
  if (
    typeof waarde === "number" &&
    Number.isFinite(waarde)
  ) {
    return waarde;
  }

  if (typeof waarde === "string") {
    const getal = Number(
      waarde.replace(",", ".")
    );

    return Number.isFinite(getal)
      ? getal
      : null;
  }

  return null;
}

function kostenUitRij(
  rij: Record<string, unknown>
): number | null {
  const velden = [
    "kosten_bedrag",
    "totale_kosten",
    "herstelkosten",
    "kosten",
    "werkelijke_kosten",
    "geschatte_kosten",
  ];

  for (const veld of velden) {
    const waarde = nummer(rij[veld]);

    if (waarde !== null) {
      return waarde;
    }
  }

  return null;
}

function maakWoningMap(
  woningen: CockpitWoning[]
): Map<number, CockpitWoning> {
  return new Map(
    woningen.map((woning) => [
      woning.id,
      woning,
    ])
  );
}

export async function getBusinessIntelligenceCockpit(): Promise<
  BusinessIntelligenceCockpit
> {
  const supabase = await createClient();

  const [
    dashboard,
    planning,
    planningSamenvatting,
    woningenResultaat,
    kamersResultaat,
    bewonersResultaat,
    complianceResultaat,
    rapportagesResultaat,
    onderhoudResultaat,
  ] = await Promise.all([
    getDashboardData(),
    getWoningPlanningIntelligence(),
    getPlanningIntelligenceSamenvatting(),

    supabase
      .from("woningen")
      .select(
        "id, adres, postcode, plaats"
      )
      .order("adres", {
        ascending: true,
      }),

    supabase
      .from("kamers")
      .select("id, woning_id, capaciteit")
      .eq("actief", true),

    supabase
      .from("bewoners")
      .select("id, kamer_id")
      .eq("status", "actief"),

    supabase
      .from("woning_compliance_samenvatting")
      .select("*"),

    supabase
      .from("maandrapportages")
      .select(
        "id, woning_id, titel, status, rapportjaar, rapportmaand, ontvanger_naam"
      )
      .order("rapportjaar", {
        ascending: false,
      })
      .order("rapportmaand", {
        ascending: false,
      }),

    supabase
      .from("meldingen")
      .select("*"),
  ]);

  fout(
    "Woningen ophalen",
    woningenResultaat.error
  );
  fout(
    "Kamers ophalen",
    kamersResultaat.error
  );
  fout(
    "Bewoners ophalen",
    bewonersResultaat.error
  );
  fout(
    "Compliance ophalen",
    complianceResultaat.error
  );
  fout(
    "Rapportages ophalen",
    rapportagesResultaat.error
  );
  fout(
    "Kosten ophalen",
    onderhoudResultaat.error
  );

  const woningen =
    (woningenResultaat.data ??
      []) as CockpitWoning[];

  const woningPerId = maakWoningMap(
    woningen
  );

  const kamers =
    (kamersResultaat.data ??
      []) as KamerRij[];

  const bewoners =
    (bewonersResultaat.data ??
      []) as BewonerRij[];

  const kamerPerId = new Map(
    kamers.map((kamer) => [
      kamer.id,
      kamer,
    ])
  );

  const capaciteitPerWoning =
    new Map<number, number>();

  for (const kamer of kamers) {
    capaciteitPerWoning.set(
      kamer.woning_id,
      (
        capaciteitPerWoning.get(
          kamer.woning_id
        ) ?? 0
      ) + Number(kamer.capaciteit ?? 0)
    );
  }

  const bewonersPerWoning =
    new Map<number, number>();

  for (const bewoner of bewoners) {
    if (bewoner.kamer_id === null) {
      continue;
    }

    const kamer =
      kamerPerId.get(bewoner.kamer_id);

    if (!kamer) {
      continue;
    }

    bewonersPerWoning.set(
      kamer.woning_id,
      (
        bewonersPerWoning.get(
          kamer.woning_id
        ) ?? 0
      ) + 1
    );
  }

  const overbezetting: CockpitOverbezetting[] =
    [];

  for (const woning of woningen) {
    const capaciteit =
      capaciteitPerWoning.get(
        woning.id
      ) ?? 0;

    const aantalBewoners =
      bewonersPerWoning.get(
        woning.id
      ) ?? 0;

    if (
      capaciteit > 0 &&
      aantalBewoners > capaciteit
    ) {
      overbezetting.push({
        woning,
        bewoners: aantalBewoners,
        capaciteit,
        overschrijding:
          aantalBewoners - capaciteit,
      });
    }
  }

  overbezetting.sort(
    (a, b) =>
      b.overschrijding -
      a.overschrijding
  );

  const compliance =
    (complianceResultaat.data ??
      []) as WoningComplianceSamenvatting[];

  const compliancePerWoning =
    new Map(
      compliance.map((regel) => [
        regel.woning_id,
        regel,
      ])
    );

  const huidigeDatum = new Date();
  const huidigJaar =
    huidigeDatum.getFullYear();
  const huidigeMaand =
    huidigeDatum.getMonth() + 1;

  const rapportages =
    (
      (rapportagesResultaat.data ??
        []) as RapportageRij[]
    ).map((rapportage) => {
      const periodeVerstreken =
        rapportage.rapportjaar < huidigJaar ||
        (
          rapportage.rapportjaar ===
            huidigJaar &&
          rapportage.rapportmaand <
            huidigeMaand
        );

      return {
        ...rapportage,
        woning:
          woningPerId.get(
            rapportage.woning_id
          ) ?? null,
        achterstallig:
          periodeVerstreken &&
          rapportage.status === "concept",
      };
    });

  const kostenWaarden =
    (
      onderhoudResultaat.data ??
      []
    )
      .map((rij) =>
        kostenUitRij(
          rij as Record<string, unknown>
        )
      )
      .filter(
        (waarde): waarde is number =>
          waarde !== null &&
          waarde >= 0
      );

  const kosten: CockpitKosten = {
    totaal: kostenWaarden.reduce(
      (totaal, waarde) =>
        totaal + waarde,
      0
    ),
    registraties:
      kostenWaarden.length,
  };

  const oorzakenPerWoning =
    new Map<number, Set<string>>();

  function voegOorzaakToe(
    woningId: number,
    oorzaak: string
  ): void {
    const oorzaken =
      oorzakenPerWoning.get(
        woningId
      ) ?? new Set<string>();

    oorzaken.add(oorzaak);

    oorzakenPerWoning.set(
      woningId,
      oorzaken
    );
  }

  for (const woningPlanning of planning) {
    if (
      woningPlanning.planning_status !==
      "op_schema"
    ) {
      voegOorzaakToe(
        woningPlanning.woning_id,
        `Planning: ${
          woningPlanning.planning_status
        }`
      );
    }
  }

  for (const risico of dashboard.woningRisicos) {
    voegOorzaakToe(
      risico.woning.id,
      `Woning-DNA: ${risico.risiconiveau}`
    );
  }

  for (
    const afwijking of
      dashboard.energieAfwijkingen
  ) {
    voegOorzaakToe(
      afwijking.woning.id,
      `${afwijking.soort}: ${
        afwijking.afwijking_percentage > 0
          ? "+"
          : ""
      }${Math.round(
        afwijking.afwijking_percentage
      )}%`
    );
  }

  for (const melding of dashboard.openMeldingen) {
    if (melding.prioriteit === "spoed") {
      voegOorzaakToe(
        melding.woning_id,
        "Open spoedmelding"
      );
    }
  }

  for (const taak of dashboard.openTaken) {
    if (taak.over_deadline) {
      voegOorzaakToe(
        taak.woning_id,
        "Achterstallige taak"
      );
    }
  }

  for (const overbezet of overbezetting) {
    voegOorzaakToe(
      overbezet.woning.id,
      `Overbezetting: +${overbezet.overschrijding}`
    );
  }

  for (const regel of compliance) {
    if (
      regel.compliance_status !==
      "compliant"
    ) {
      voegOorzaakToe(
        regel.woning_id,
        `Compliance: ${
          regel.verlopen +
          regel.ontbrekend
        } kritisch`
      );
    }
  }

  const aandachtspunten: CockpitAandachtspunt[] =
    [];

  for (
    const [
      woningId,
      oorzaken,
    ] of oorzakenPerWoning
  ) {
    const woning =
      woningPerId.get(woningId);

    if (!woning) {
      continue;
    }

    const oorzaakLijst =
      [...oorzaken];

    const complianceRegel =
      compliancePerWoning.get(
        woningId
      );

    const kritisch =
      oorzaakLijst.some(
        (oorzaak) =>
          oorzaak.includes("spoed") ||
          oorzaak.includes(
            "Achterstallige"
          ) ||
          oorzaak.includes(
            "achterstallig"
          ) ||
          oorzaak.includes("kritiek")
      ) ||
      (
        complianceRegel !== undefined &&
        (
          complianceRegel.verlopen > 0 ||
          complianceRegel.ontbrekend > 0
        )
      );

    aandachtspunten.push({
      woning,
      urgentie: kritisch
        ? "kritiek"
        : oorzaakLijst.length >= 2
          ? "hoog"
          : "normaal",
      score:
        oorzaakLijst.length * 10 +
        (
          kritisch
            ? 50
            : 0
        ),
      oorzaken: oorzaakLijst,
    });
  }

  aandachtspunten.sort(
    (a, b) =>
      b.score - a.score
  );

  const spoedmeldingen =
    dashboard.openMeldingen.filter(
      (melding) =>
        melding.prioriteit === "spoed"
    );

  const achterstalligeTaken =
    dashboard.openTaken.filter(
      (taak) =>
        taak.over_deadline
    );

  return {
    kpis: {
      controles_vandaag:
        planningSamenvatting.vandaag,
      woningen_met_aandacht:
        aandachtspunten.length,
      energie_afwijkingen:
        dashboard.energieAfwijkingen.length,
      open_spoedmeldingen:
        spoedmeldingen.length,
      achterstallige_taken:
        achterstalligeTaken.length,
      overbezette_woningen:
        overbezetting.length,
      verlopen_compliance:
        compliance.reduce(
          (totaal, regel) =>
            totaal +
            regel.verlopen +
            regel.ontbrekend,
          0
        ),
      kosten_totaal:
        kosten.totaal,
      rapportages_gereed:
        rapportages.filter(
          (rapportage) =>
            rapportage.status ===
            "definitief"
        ).length,
      rapportages_achterstallig:
        rapportages.filter(
          (rapportage) =>
            rapportage.achterstallig
        ).length,
    },
    planning,
    aandachtspunten:
      aandachtspunten.slice(0, 20),
    spoedmeldingen,
    achterstalligeTaken,
    energieAfwijkingen:
      dashboard.energieAfwijkingen,
    woningRisicos:
      dashboard.woningRisicos,
    overbezetting,
    rapportages:
      rapportages.slice(0, 20),
    kosten,
  };
}
