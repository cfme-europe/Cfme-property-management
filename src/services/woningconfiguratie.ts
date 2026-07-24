import { createClient } from "@/lib/supabase/client";
import type {
  WoningVerdieping,
  WoningVerdiepingInvoer,
  WoningRuimte,
  WoningRuimteInvoer,
  WoningObject,
  WoningObjectInvoer,
  WoningControlepunt,
  WoningControlepuntInvoer,
} from "@/types/woningconfiguratie";

const supabase = createClient();

function schoon(waarde: string | null | undefined): string | null {
  const resultaat = waarde?.trim() ?? "";
  return resultaat || null;
}

function geldigId(waarde: number, omschrijving: string): void {
  if (!Number.isInteger(waarde) || waarde <= 0) {
    throw new Error(`Ongeldige ${omschrijving}.`);
  }
}

function geldigeVolgorde(waarde: number): void {
  if (!Number.isInteger(waarde) || waarde < 0) {
    throw new Error("Loopvolgorde moet 0 of hoger zijn.");
  }
}

function valideerVerdieping(
  invoer: WoningVerdiepingInvoer): WoningVerdiepingInvoer {
  geldigId(invoer.woning_id, "woning");
  geldigeVolgorde(invoer.loopvolgorde);

  const naam = invoer.naam.trim();
  if (!naam) throw new Error("Naam van de verdieping is verplicht.");
  if (!Number.isInteger(invoer.niveau)) {
    throw new Error("Niveau moet een geheel getal zijn.");
  }

  return {
    ...invoer,
    naam,
    opmerkingen: schoon(invoer.opmerkingen),
  };
}

function valideerRuimte(
  invoer: WoningRuimteInvoer): WoningRuimteInvoer {
  geldigId(invoer.woning_id, "woning");
  geldigeVolgorde(invoer.loopvolgorde);

  if (invoer.verdieping_id != null) {
    geldigId(invoer.verdieping_id, "verdieping");
  }

  if (invoer.kamer_id != null) {
    geldigId(invoer.kamer_id, "kamer");
  }

  const naam = invoer.naam.trim();
  if (!naam) throw new Error("Naam van de ruimte is verplicht.");

  return {
    ...invoer,
    naam,
    verdieping_id: invoer.verdieping_id ?? null,
    kamer_id: invoer.kamer_id ?? null,
    omschrijving: schoon(invoer.omschrijving),
    route_instructie: schoon(invoer.route_instructie),
    opmerkingen: schoon(invoer.opmerkingen),
  };
}

function valideerObject(
  invoer: WoningObjectInvoer): WoningObjectInvoer {
  geldigId(invoer.woning_id, "woning");
  geldigId(invoer.ruimte_id, "ruimte");
  geldigeVolgorde(invoer.loopvolgorde);

  const naam = invoer.naam.trim();
  const objectType = invoer.object_type.trim();

  if (!naam) throw new Error("Naam van het object is verplicht.");
  if (!objectType) throw new Error("Objecttype is verplicht.");

  return {
    ...invoer,
    naam,
    object_type: objectType,
    objectnummer: schoon(invoer.objectnummer),
    merk: schoon(invoer.merk),
    model: schoon(invoer.model),
    serienummer: schoon(invoer.serienummer),
    geplaatst_op: schoon(invoer.geplaatst_op),
    vervangen_op: schoon(invoer.vervangen_op),
    opmerkingen: schoon(invoer.opmerkingen),
  };
}

function valideerControlepunt(
  invoer: WoningControlepuntInvoer): WoningControlepuntInvoer {
  geldigId(invoer.woning_id, "woning");
  geldigId(invoer.ruimte_id, "ruimte");
  geldigId(invoer.definitie_id, "controlepuntdefinitie");
  geldigeVolgorde(invoer.loopvolgorde);

  if (invoer.object_id != null) {
    geldigId(invoer.object_id, "object");
  }

  return {
    ...invoer,
    object_id: invoer.object_id ?? null,
    naam_override: schoon(invoer.naam_override),
    omschrijving_override: schoon(invoer.omschrijving_override),
    foto_verplicht_bij_afwijking:
      invoer.foto_verplicht_bij_afwijking ?? null,
    toelichting_verplicht_bij_afwijking:
      invoer.toelichting_verplicht_bij_afwijking ?? null,
    melding_maken_bij_afwijking:
      invoer.melding_maken_bij_afwijking ?? null,
    taak_maken_bij_afwijking:
      invoer.taak_maken_bij_afwijking ?? null,
    opmerkingen: schoon(invoer.opmerkingen),
  };
}

export async function createVerdieping(
  invoer: WoningVerdiepingInvoer): Promise<WoningVerdieping> {
  const geldig = valideerVerdieping(invoer);
  const { data, error } = await supabase
    .from("woning_verdiepingen")
    .insert(geldig)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Verdieping opslaan mislukt: ${error.message}`);
  }

  return data as WoningVerdieping;
}

export async function updateVerdieping(
  id: number,
  invoer: WoningVerdiepingInvoer): Promise<WoningVerdieping> {
  geldigId(id, "verdieping");
  const geldig = valideerVerdieping(invoer);

  const { data, error } = await supabase
    .from("woning_verdiepingen")
    .update(geldig)
    .eq("id", id)
    .eq("woning_id", geldig.woning_id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Verdieping wijzigen mislukt: ${error.message}`);
  }
  if (!data) throw new Error("Verdieping niet gevonden.");

  return data as WoningVerdieping;
}

export async function createRuimte(
  invoer: WoningRuimteInvoer): Promise<WoningRuimte> {
  const geldig = valideerRuimte(invoer);
  const { data, error } = await supabase
    .from("woning_ruimten")
    .insert(geldig)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Ruimte opslaan mislukt: ${error.message}`);
  }

  return data as WoningRuimte;
}

export async function updateRuimte(
  id: number,
  invoer: WoningRuimteInvoer): Promise<WoningRuimte> {
  geldigId(id, "ruimte");
  const geldig = valideerRuimte(invoer);

  const { data, error } = await supabase
    .from("woning_ruimten")
    .update(geldig)
    .eq("id", id)
    .eq("woning_id", geldig.woning_id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Ruimte wijzigen mislukt: ${error.message}`);
  }
  if (!data) throw new Error("Ruimte niet gevonden.");

  return data as WoningRuimte;
}

export async function createObject(
  invoer: WoningObjectInvoer): Promise<WoningObject> {
  const geldig = valideerObject(invoer);
  const { data, error } = await supabase
    .from("woning_objecten")
    .insert(geldig)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Object opslaan mislukt: ${error.message}`);
  }

  return data as WoningObject;
}

export async function updateObject(
  id: number,
  invoer: WoningObjectInvoer): Promise<WoningObject> {
  geldigId(id, "object");
  const geldig = valideerObject(invoer);

  const { data, error } = await supabase
    .from("woning_objecten")
    .update(geldig)
    .eq("id", id)
    .eq("woning_id", geldig.woning_id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Object wijzigen mislukt: ${error.message}`);
  }
  if (!data) throw new Error("Object niet gevonden.");

  return data as WoningObject;
}

export async function createControlepunt(
  invoer: WoningControlepuntInvoer): Promise<WoningControlepunt> {
  const geldig = valideerControlepunt(invoer);
  const { data, error } = await supabase
    .from("woning_controlepunten")
    .insert(geldig)
    .select("*, definitie:controlepunt_definities(*)")
    .single();

  if (error) {
    throw new Error(`Controlepunt opslaan mislukt: ${error.message}`);
  }

  return data as WoningControlepunt;
}

export async function updateControlepunt(
  id: number,
  invoer: WoningControlepuntInvoer): Promise<WoningControlepunt> {
  geldigId(id, "controlepunt");
  const geldig = valideerControlepunt(invoer);

  const { data, error } = await supabase
    .from("woning_controlepunten")
    .update(geldig)
    .eq("id", id)
    .eq("woning_id", geldig.woning_id)
    .select("*, definitie:controlepunt_definities(*)")
    .maybeSingle();

  if (error) {
    throw new Error(`Controlepunt wijzigen mislukt: ${error.message}`);
  }
  if (!data) throw new Error("Controlepunt niet gevonden.");

  return data as WoningControlepunt;
}
