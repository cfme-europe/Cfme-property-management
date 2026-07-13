import { supabase } from "@/lib/supabase";
import { berekenVerbruiksperiodes } from "@/services/energieverbruik";
import type { Inspectie } from "@/types/inspectie";
import type { Melding } from "@/types/melding";
import type { Meterstand } from "@/types/meterstand";

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
  };
  openMeldingen: DashboardMelding[];
  recenteInspecties: DashboardInspectie[];
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

function foutmelding(
  onderwerp: string,
  fout: { message: string } | null
): void {
  if (fout) {
    throw new Error(
      `${onderwerp} mislukt: ${fout.message}`
    );
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const [
    bedrijvenResultaat,
    woningenResultaat,
    verhuurResultaat,
    bewonersResultaat,
    kamersResultaat,
    meldingenCountResultaat,
    inspectiesCountResultaat,
    openMeldingenResultaat,
    recenteInspectiesResultaat,
    meterstandenResultaat,
  ] = await Promise.all([
    supabase
      .from("bedrijven")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("woningen")
      .select(
        "id, adres, postcode, plaats"
      )
      .order("adres", {
        ascending: true,
      }),

    supabase
      .from("verhuurperiodes")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "actief"),

    supabase
      .from("bewoners")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "actief"),

    supabase
      .from("kamers")
      .select("id, capaciteit")
      .eq("actief", true),

    supabase
      .from("meldingen")
      .select("*", {
        count: "exact",
        head: true,
      })
      .neq("status", "opgelost"),

    supabase
      .from("inspecties")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "open"),

    supabase
      .from("meldingen")
      .select("*")
      .neq("status", "opgelost")
      .order("melddatum", {
        ascending: false,
      })
      .limit(10),

    supabase
      .from("inspecties")
      .select("*")
      .order("inspectiedatum", {
        ascending: false,
      })
      .limit(8),

    supabase
      .from("meterstanden")
      .select("*")
      .order("opnamedatum", {
        ascending: false,
      })
      .limit(500),
  ]);

  foutmelding(
    "Bedrijven ophalen",
    bedrijvenResultaat.error
  );
  foutmelding(
    "Woningen ophalen",
    woningenResultaat.error
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

  const woningen =
    (woningenResultaat.data ??
      []) as DashboardWoning[];

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

  for (
    const [
      woningId,
      woningMeterstanden,
    ] of meterstandenPerWoning
  ) {
    const woning =
      woningenPerId.get(woningId);

    if (!woning) {
      continue;
    }

    const periodes =
      berekenVerbruiksperiodes(
        woningMeterstanden
      );

    if (periodes.length < 2) {
      continue;
    }

    const laatste = periodes[0];
    const eerdere = periodes.slice(1, 7);

    const reeksen = [
      {
        soort: "Elektriciteit" as const,
        eenheid: "kWh" as const,
        laatste:
          laatste.elektriciteit
            .per_bewoner_per_week,
        eerdere: eerdere
          .map(
            (periode) =>
              periode.elektriciteit
                .per_bewoner_per_week
          )
          .filter(
            (waarde): waarde is number =>
              waarde !== null
          ),
      },
      {
        soort: "Gas" as const,
        eenheid: "m³" as const,
        laatste:
          laatste.gas
            .per_bewoner_per_week,
        eerdere: eerdere
          .map(
            (periode) =>
              periode.gas
                .per_bewoner_per_week
          )
          .filter(
            (waarde): waarde is number =>
              waarde !== null
          ),
      },
      {
        soort: "Water" as const,
        eenheid: "m³" as const,
        laatste:
          laatste.water
            .per_bewoner_per_week,
        eerdere: eerdere
          .map(
            (periode) =>
              periode.water
                .per_bewoner_per_week
          )
          .filter(
            (waarde): waarde is number =>
              waarde !== null
          ),
      },
    ];

    for (const reeks of reeksen) {
      const gemiddeldeEerdere =
        gemiddelde(reeks.eerdere);

      if (
        reeks.laatste === null ||
        gemiddeldeEerdere === null ||
        gemiddeldeEerdere <= 0
      ) {
        continue;
      }

      const afwijking =
        (
          (reeks.laatste -
            gemiddeldeEerdere) /
          gemiddeldeEerdere
        ) * 100;

      if (Math.abs(afwijking) < 20) {
        continue;
      }

      energieAfwijkingen.push({
        woning,
        soort: reeks.soort,
        eenheid: reeks.eenheid,
        laatste_waarde:
          reeks.laatste,
        gemiddelde_eerdere:
          gemiddeldeEerdere,
        afwijking_percentage:
          afwijking,
        periode_van:
          laatste.van_datum,
        periode_tot:
          laatste.tot_datum,
      });
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
    },
    openMeldingen,
    recenteInspecties,
    energieAfwijkingen:
      energieAfwijkingen.slice(0, 10),
  };
}
