import { supabase } from "@/lib/supabase";
import type {
  Maandrapportage,
  MaandrapportageInvoer,
} from "@/types/maandrapportage";

function schoon(
  waarde: string | null | undefined
): string | null {
  const resultaat = waarde?.trim() ?? "";
  return resultaat || null;
}

function valideerEmail(
  waarde: string | null
): string | null {
  if (!waarde) {
    return null;
  }

  const email = waarde.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Vul een geldig e-mailadres in.");
  }

  return email;
}

function valideer(
  invoer: MaandrapportageInvoer
): MaandrapportageInvoer {
  if (
    !Number.isInteger(invoer.woning_id) ||
    invoer.woning_id <= 0
  ) {
    throw new Error("Ongeldige woning.");
  }

  if (
    invoer.verhuurperiode_id !== null &&
    (
      !Number.isInteger(invoer.verhuurperiode_id) ||
      invoer.verhuurperiode_id <= 0
    )
  ) {
    throw new Error("Ongeldige verhuurperiode.");
  }

  if (
    !Number.isInteger(invoer.templateversie_id) ||
    invoer.templateversie_id <= 0
  ) {
    throw new Error("Ongeldige rapporttemplateversie.");
  }

  if (
    !Number.isInteger(invoer.rapportjaar) ||
    invoer.rapportjaar < 2000 ||
    invoer.rapportjaar > 2100
  ) {
    throw new Error("Ongeldig rapportjaar.");
  }

  if (
    !Number.isInteger(invoer.rapportmaand) ||
    invoer.rapportmaand < 1 ||
    invoer.rapportmaand > 12
  ) {
    throw new Error("Ongeldige rapportmaand.");
  }

  const titel = invoer.titel.trim();

  if (!titel) {
    throw new Error("Rapporttitel is verplicht.");
  }

  return {
    woning_id: invoer.woning_id,
    verhuurperiode_id: invoer.verhuurperiode_id,
    templateversie_id: invoer.templateversie_id,
    rapportjaar: invoer.rapportjaar,
    rapportmaand: invoer.rapportmaand,
    titel,
    status: invoer.status,
    ontvanger_naam: schoon(invoer.ontvanger_naam),
    ontvanger_email: valideerEmail(
      schoon(invoer.ontvanger_email)
    ),
    opmerkingen: schoon(invoer.opmerkingen),
    rapport_data: invoer.rapport_data ?? {},
  };
}

export async function getMaandrapportagesVoorWoning(
  woningId: number
): Promise<Maandrapportage[]> {
  if (
    !Number.isInteger(woningId) ||
    woningId <= 0
  ) {
    throw new Error("Ongeldige woning.");
  }

  const { data, error } = await supabase
    .from("maandrapportages")
    .select("*")
    .eq("woning_id", woningId)
    .order("rapportjaar", { ascending: false })
    .order("rapportmaand", { ascending: false });

  if (error) {
    throw new Error(
      `Maandrapportages ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Maandrapportage[];
}

export async function getMaandrapportageById(
  rapportageId: number
): Promise<Maandrapportage | null> {
  if (
    !Number.isInteger(rapportageId) ||
    rapportageId <= 0
  ) {
    throw new Error("Ongeldige maandrapportage.");
  }

  const { data, error } = await supabase
    .from("maandrapportages")
    .select("*")
    .eq("id", rapportageId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Maandrapportage ophalen mislukt: ${error.message}`
    );
  }

  return data as Maandrapportage | null;
}

export async function getMaandrapportageVoorPeriode(
  woningId: number,
  rapportjaar: number,
  rapportmaand: number
): Promise<Maandrapportage | null> {
  const { data, error } = await supabase
    .from("maandrapportages")
    .select("*")
    .eq("woning_id", woningId)
    .eq("rapportjaar", rapportjaar)
    .eq("rapportmaand", rapportmaand)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Maandrapportage voor periode ophalen mislukt: ${error.message}`
    );
  }

  return data as Maandrapportage | null;
}

export async function createMaandrapportage(
  invoer: MaandrapportageInvoer
): Promise<Maandrapportage> {
  const geldig = valideer(invoer);

  const { data, error } = await supabase
    .from("maandrapportages")
    .insert(geldig)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "Voor deze woning bestaat al een maandrapportage voor deze periode."
      );
    }

    throw new Error(
      `Maandrapportage opslaan mislukt: ${error.message}`
    );
  }

  return data as Maandrapportage;
}

export async function updateMaandrapportage(
  rapportageId: number,
  invoer: MaandrapportageInvoer
): Promise<Maandrapportage> {
  if (
    !Number.isInteger(rapportageId) ||
    rapportageId <= 0
  ) {
    throw new Error("Ongeldige maandrapportage.");
  }

  const geldig = valideer(invoer);

  const { data, error } = await supabase
    .from("maandrapportages")
    .update(geldig)
    .eq("id", rapportageId)
    .eq("woning_id", geldig.woning_id)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "Voor deze woning bestaat al een maandrapportage voor deze periode."
      );
    }

    throw new Error(
      `Maandrapportage wijzigen mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Maandrapportage niet gevonden.");
  }

  return data as Maandrapportage;
}
