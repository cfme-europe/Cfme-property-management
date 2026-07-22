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

  const elektriciteit = valideerGetal(
    invoer.elektriciteit_kwh,
    "Elektriciteitsstand"
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
    elektriciteit === null &&
    gas === null &&
    water === null
  ) {
    throw new Error(
      "Vul minimaal één meterstand in."
    );
  }

  return {
    woning_id: invoer.woning_id,
    opnamedatum: invoer.opnamedatum,
    bewoners_aantal: invoer.bewoners_aantal,
    elektriciteit_kwh: elektriciteit,
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
