import { createClient } from "@/lib/supabase/client";
import { bepaalOpnemerNaam } from "@/lib/meterstanden/opgenomen-door";
import {
  analyseerMeterstanden,
  type EnergieAnalyseResultaat,
} from "@/services/energy-intelligence";
import type {
  Meterstand,
  MeterstandEnergieDrager,
  MeterstandInvoer,
} from "@/types/meterstand";

const supabase = createClient();

function schoon(
  waarde: string | null | undefined
): string | null {
  const resultaat = waarde?.trim() ?? "";
  return resultaat || null;
}

function valideerGetal(
  waarde: number | null,
  veldnaam: string
): number | null {
  if (waarde === null) {
    return null;
  }

  if (!Number.isFinite(waarde) || waarde < 0) {
    throw new Error(
      `${veldnaam} moet nul of een positief getal zijn.`
    );
  }

  return waarde;
}

function valideer(
  invoer: MeterstandInvoer
): MeterstandInvoer {
  if (
    !Number.isInteger(invoer.woning_id) ||
    invoer.woning_id <= 0
  ) {
    throw new Error("Ongeldige woning.");
  }

  if (!invoer.opnamedatum) {
    throw new Error("Opnamedatum is verplicht.");
  }

  if (
    !Number.isInteger(invoer.bewoners_aantal) ||
    invoer.bewoners_aantal < 0
  ) {
    throw new Error(
      "Aantal bewoners moet nul of een positief geheel getal zijn."
    );
  }

  const dagstroom = valideerGetal(
    invoer.dagstroom_kwh,
    "Dagstroomstand"
  );
  const nachtstroom = valideerGetal(
    invoer.nachtstroom_kwh,
    "Nachtstroomstand"
  );
  const gas = valideerGetal(
    invoer.gas_m3,
    "Gasstand"
  );
  const water = valideerGetal(
    invoer.water_m3,
    "Waterstand"
  );

  if (
    dagstroom === null &&
    nachtstroom === null &&
    gas === null &&
    water === null
  ) {
    throw new Error(
      "Vul minimaal één meterstand in."
    );
  }

  return {
    woning_id: invoer.woning_id,
    controlesessie_id: invoer.controlesessie_id ?? null,
    opnamedatum: invoer.opnamedatum,
    bewoners_aantal: invoer.bewoners_aantal,
    dagstroom_kwh: dagstroom,
    nachtstroom_kwh: nachtstroom,
    gas_m3: gas,
    water_m3: water,
    opgenomen_door: schoon(
      invoer.opgenomen_door
    ),
    opmerkingen: schoon(invoer.opmerkingen),
    meteruitzonderingen: invoer.meteruitzonderingen ?? {},
  };
}

export async function createMeterstand(
  invoer: MeterstandInvoer
): Promise<Meterstand> {
  const geldig = valideer(invoer);

  const { data, error } = await supabase
    .from("meterstanden")
    .insert(geldig)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "Voor deze woning bestaat al een meteropname op deze datum."
      );
    }

    throw new Error(
      `Meterstand opslaan mislukt: ${error.message}`
    );
  }

  return data as Meterstand;
}

export async function updateMeterstand(
  meterstandId: number,
  invoer: MeterstandInvoer,
  correctiereden?: string,
): Promise<Meterstand> {
  if (!Number.isInteger(meterstandId) || meterstandId <= 0) {
    throw new Error("Ongeldige meterstand.");
  }

  const geldig = valideer(invoer);
  const reden = correctiereden?.trim() ?? "";
  if (!reden) {
    throw new Error("Een reden voor de correctie is verplicht.");
  }

  const { data, error } = await supabase.rpc("corrigeer_meterstand", {
    p_meterstand_id: meterstandId,
    p_bewoners_aantal: geldig.bewoners_aantal,
    p_dagstroom_kwh: geldig.dagstroom_kwh,
    p_nachtstroom_kwh: geldig.nachtstroom_kwh,
    p_gas_m3: geldig.gas_m3,
    p_water_m3: geldig.water_m3,
    p_opgenomen_door:
      geldig.opgenomen_door,
    p_opmerkingen: geldig.opmerkingen,
    p_reden: reden,
  });

  if (error) {
    throw new Error(`Meterstand corrigeren mislukt: ${error.message}`);
  }

  return data as Meterstand;
}

export type RouteMeterType =
  | "dagstroom_kwh"
  | "nachtstroom_kwh"
  | "gas_m3"
  | "water_m3";

export type RouteMeterwaarden = Partial<
  Record<RouteMeterType, number>
>;

export type RouteMeterUitzonderingen = Partial<
  Record<RouteMeterType, { status: string; reden: string }>
>;

export type RouteMeterstandOpslag = {
  meterstand: Meterstand;
  analyse: EnergieAnalyseResultaat;
};

export type EnergieVerklaringInvoer = {
  meterstand_id: number;
  drager: MeterstandEnergieDrager;
  verklaring_code: string;
  verklaring_toelichting?: string | null;
};

export async function slaEnergieVerklaringOp(
  invoer: EnergieVerklaringInvoer,
): Promise<Meterstand> {
  if (
    !Number.isInteger(invoer.meterstand_id) ||
    invoer.meterstand_id <= 0
  ) {
    throw new Error("Ongeldige meteropname.");
  }

  if (
    !["elektriciteit", "gas", "water"].includes(
      invoer.drager,
    )
  ) {
    throw new Error("Ongeldige energiedrager.");
  }

  const verklaringCode =
    invoer.verklaring_code.trim();

  if (!verklaringCode) {
    throw new Error(
      "Kies eerst een verklaring voor het afwijkende verbruik.",
    );
  }

  const toelichting =
    invoer.verklaring_toelichting?.trim() || null;

  if (
    ["geen_verklaring", "overig"].includes(
      verklaringCode,
    ) &&
    !toelichting
  ) {
    throw new Error(
      "Geef een korte toelichting bij deze verklaring.",
    );
  }

  const { data, error } = await supabase.rpc(
    "sla_energieverklaring_per_drager",
    {
      p_meterstand_id: invoer.meterstand_id,
      p_drager: invoer.drager,
      p_verklaring_code: verklaringCode,
      p_verklaring_toelichting: toelichting,
    },
  );

  if (error) {
    throw new Error(
      `Energieverklaring opslaan mislukt: ${error.message}`,
    );
  }

  const resultaat = Array.isArray(data)
    ? data[0]
    : data;

  if (!resultaat) {
    throw new Error(
      "Energieverklaring opslaan gaf geen meteropname terug.",
    );
  }

  return resultaat as Meterstand;
}

async function analyseerEnBewaarMeterstand(
  meterstand: Meterstand,
): Promise<RouteMeterstandOpslag> {
  const { data: historie, error: historieFout } =
    await supabase
      .from("meterstanden")
      .select("*")
      .eq("woning_id", meterstand.woning_id)
      .order("opnamedatum", { ascending: false })
      .limit(8);

  if (historieFout) {
    throw new Error(
      `Meterhistorie voor analyse ophalen mislukt: ${historieFout.message}`,
    );
  }

  const analyse = analyseerMeterstanden(
    (historie ?? []) as Meterstand[],
  );

  const { data: bijgewerkt, error: analyseFout } =
    await supabase
      .from("meterstanden")
      .update({
        analyse_status: analyse.status,
        analyse_resultaat: analyse,
        opvolging_nodig: analyse.opvolging_nodig,
        geanalyseerd_at: new Date().toISOString(),
      })
      .eq("id", meterstand.id)
      .select("*")
      .single();

  if (analyseFout) {
    throw new Error(
      `Energy Intelligence-resultaat opslaan mislukt: ${analyseFout.message}`,
    );
  }

  return {
    meterstand: bijgewerkt as Meterstand,
    analyse,
  };
}

function valideerRouteMeterwaarden(
  waarden: RouteMeterwaarden,
): RouteMeterwaarden {
  const ingevuld = Object.entries(waarden).filter(
    (
      item,
    ): item is [RouteMeterType, number] =>
      item[1] !== undefined,
  );

  if (ingevuld.length === 0) {
    throw new Error(
      "Vul minimaal één actuele meterstand in.",
    );
  }

  for (const [, waarde] of ingevuld) {
    if (
      !Number.isFinite(waarde) ||
      waarde < 0
    ) {
      throw new Error(
        "Iedere meterstand moet nul of hoger zijn.",
      );
    }
  }

  return Object.fromEntries(
    ingevuld,
  ) as RouteMeterwaarden;
}

export async function slaRouteMeterstandenOp(invoer: {
  woning_id: number;
  controlesessie_id: number;
  waarden: RouteMeterwaarden;
  uitzonderingen: RouteMeterUitzonderingen;
  bewoners_aantal: number;
}): Promise<RouteMeterstandOpslag> {
  const heeftWaarden = Object.keys(invoer.waarden).length > 0;
  const heeftUitzonderingen = Object.keys(invoer.uitzonderingen).length > 0;

  if (!heeftWaarden && !heeftUitzonderingen) {
    throw new Error("Vul een meterstand in of leg een uitzondering vast.");
  }

  const waarden = heeftWaarden
    ? valideerRouteMeterwaarden(invoer.waarden)
    : {};

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Geen geldige gebruikerssessie.",
    );
  }

  const { data: profiel, error: profielFout } =
    await supabase
      .from("profiles")
      .select("volledige_naam, email")
      .eq("id", user.id)
      .maybeSingle();

  if (profielFout) {
    throw new Error(
      `Naam van controleur ophalen mislukt: ${profielFout.message}`,
    );
  }

  const opnemerNaam =
    bepaalOpnemerNaam(profiel) ??
    (user.email?.trim() || "Controleur");

  const opnamedatum =
    new Date().toISOString().slice(0, 10);

  const { data: bestaand, error: zoekFout } =
    await supabase
      .from("meterstanden")
      .select("*")
      .eq("woning_id", invoer.woning_id)
      .eq("opnamedatum", opnamedatum)
      .maybeSingle();

  if (zoekFout) {
    throw new Error(
      `Meteropname zoeken mislukt: ${zoekFout.message}`,
    );
  }

  const volledig: MeterstandInvoer = {
    woning_id: invoer.woning_id,
    controlesessie_id:
      invoer.controlesessie_id,
    opnamedatum,
    bewoners_aantal:
      invoer.bewoners_aantal,
    dagstroom_kwh:
      waarden.dagstroom_kwh ??
      bestaand?.dagstroom_kwh ??
      null,
    nachtstroom_kwh:
      waarden.nachtstroom_kwh ??
      bestaand?.nachtstroom_kwh ??
      null,
    gas_m3:
      waarden.gas_m3 ??
      bestaand?.gas_m3 ??
      null,
    water_m3:
      waarden.water_m3 ??
      bestaand?.water_m3 ??
      null,
    opgenomen_door: opnemerNaam,
    opmerkingen:
      heeftUitzonderingen
        ? "Meteropname bevat één of meer vastgelegde uitzonderingen."
        : "Opgenomen tijdens woningcontrole",
    meteruitzonderingen: invoer.uitzonderingen,
  };

  const meterstand = bestaand
    ? await updateMeterstand(
        bestaand.id,
        volledig,
        "Aanvulling tijdens dezelfde woningcontrole",
      )
    : await createMeterstand(volledig);

  return analyseerEnBewaarMeterstand(
    meterstand,
  );
}

/**
 * Tijdelijke compatibiliteitsfunctie.
 * Nieuwe controleurflows gebruiken altijd
 * slaRouteMeterstandenOp voor gezamenlijke opslag.
 */
export async function slaRouteMeterstandOp(invoer: {
  woning_id: number;
  controlesessie_id: number;
  metertype: RouteMeterType;
  waarde: number;
  bewoners_aantal: number;
}): Promise<RouteMeterstandOpslag> {
  return slaRouteMeterstandenOp({
    woning_id: invoer.woning_id,
    controlesessie_id:
      invoer.controlesessie_id,
    bewoners_aantal:
      invoer.bewoners_aantal,
    waarden: {
      [invoer.metertype]: invoer.waarde,
    },
    uitzonderingen: {},
  });
}
