import { createClient } from "@/lib/supabase/client";
import type {
  Meterstand,
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
  invoer: MeterstandInvoer
): Promise<Meterstand> {
  if (
    !Number.isInteger(meterstandId) ||
    meterstandId <= 0
  ) {
    throw new Error("Ongeldige meterstand.");
  }

  const geldig = valideer(invoer);

  const { data, error } = await supabase
    .from("meterstanden")
    .update(geldig)
    .eq("id", meterstandId)
    .eq("woning_id", geldig.woning_id)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "Voor deze woning bestaat al een meteropname op deze datum."
      );
    }

    throw new Error(
      `Meterstand wijzigen mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Meterstand niet gevonden.");
  }

  return data as Meterstand;
}

export type RouteMeterType =
  | "dagstroom_kwh"
  | "nachtstroom_kwh"
  | "gas_m3"
  | "water_m3";

export async function slaRouteMeterstandOp(invoer: {
  woning_id: number;
  controlesessie_id: number;
  metertype: RouteMeterType;
  waarde: number;
  bewoners_aantal: number;
}): Promise<Meterstand> {
  if (
    !Number.isFinite(invoer.waarde) ||
    invoer.waarde < 0
  ) {
    throw new Error(
      "De meterstand moet nul of hoger zijn."
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Geen geldige gebruikerssessie."
    );
  }

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
      `Meteropname zoeken mislukt: ${zoekFout.message}`
    );
  }

  const basis = {
    woning_id: invoer.woning_id,
    controlesessie_id:
      invoer.controlesessie_id,
    opnamedatum,
    bewoners_aantal:
      invoer.bewoners_aantal,
    dagstroom_kwh:
      bestaand?.dagstroom_kwh ?? null,
    nachtstroom_kwh:
      bestaand?.nachtstroom_kwh ?? null,
    gas_m3:
      bestaand?.gas_m3 ?? null,
    water_m3:
      bestaand?.water_m3 ?? null,
    opgenomen_door: user.id,
    opmerkingen:
      "Opgenomen tijdens woningcontrole",
  };

  const volledig = {
    ...basis,
    [invoer.metertype]: invoer.waarde,
  };

  return bestaand
    ? updateMeterstand(
        bestaand.id,
        volledig,
      )
    : createMeterstand(volledig);
}
