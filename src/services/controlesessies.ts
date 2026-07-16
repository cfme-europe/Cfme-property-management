import { supabase } from "@/lib/supabase";
import type {
  Controlesessie,
  ControlesessieInvoer,
  ControlesessieLocatieInvoer,
} from "@/types/controlesessie";

function valideerId(id: number, naam: string): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Ongeldige ${naam}.`);
  }
}

function schoon(
  waarde: string | null | undefined
): string | null {
  const resultaat = waarde?.trim() ?? "";
  return resultaat || null;
}

function valideerInvoer(
  invoer: ControlesessieInvoer
): ControlesessieInvoer {
  valideerId(invoer.woning_id, "woning");

  if (invoer.inspectie_id !== null) {
    valideerId(invoer.inspectie_id, "inspectie");
  }

  if (
    invoer.gemiddelde_controletijd_minuten !== null &&
    (
      !Number.isInteger(
        invoer.gemiddelde_controletijd_minuten
      ) ||
      invoer.gemiddelde_controletijd_minuten <= 0
    )
  ) {
    throw new Error(
      "De gemiddelde controletijd moet groter zijn dan nul."
    );
  }

  return {
    ...invoer,
    controleur_id: schoon(invoer.controleur_id),
    opmerkingen: schoon(invoer.opmerkingen),
  };
}

export async function getControlesessiesVoorWoning(
  woningId: number
): Promise<Controlesessie[]> {
  valideerId(woningId, "woning");

  const { data, error } = await supabase
    .from("controlesessies")
    .select("*")
    .eq("woning_id", woningId)
    .order("gepland_voor", {
      ascending: false,
      nullsFirst: false,
    })
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Controlesessies ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Controlesessie[];
}

export async function getControlesessieById(
  controlesessieId: number
): Promise<Controlesessie | null> {
  valideerId(controlesessieId, "controlesessie");

  const { data, error } = await supabase
    .from("controlesessies")
    .select("*")
    .eq("id", controlesessieId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Controlesessie ophalen mislukt: ${error.message}`
    );
  }

  return data as Controlesessie | null;
}

export async function createControlesessie(
  invoer: ControlesessieInvoer
): Promise<Controlesessie> {
  const geldig = valideerInvoer(invoer);

  const { data, error } = await supabase
    .from("controlesessies")
    .insert(geldig)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Controlesessie opslaan mislukt: ${error.message}`
    );
  }

  return data as Controlesessie;
}

export async function startControlesessie(
  controlesessieId: number,
  locatie?: ControlesessieLocatieInvoer
): Promise<Controlesessie> {
  valideerId(controlesessieId, "controlesessie");

  const wijziging = {
    status: "bezig" as const,
    ...(locatie ?? {}),
  };

  const { data, error } = await supabase
    .from("controlesessies")
    .update(wijziging)
    .eq("id", controlesessieId)
    .in("status", ["gepland", "bezig"])
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Controlesessie starten mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "Controlesessie niet gevonden of kan niet worden gestart."
    );
  }

  return data as Controlesessie;
}

export async function rondControlesessieAf(
  controlesessieId: number
): Promise<Controlesessie> {
  valideerId(controlesessieId, "controlesessie");

  const { data, error } = await supabase
    .from("controlesessies")
    .update({
      status: "afgerond",
    })
    .eq("id", controlesessieId)
    .eq("status", "bezig")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Controlesessie afronden mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "Alleen een gestarte controlesessie kan worden afgerond."
    );
  }

  return data as Controlesessie;
}

export async function annuleerControlesessie(
  controlesessieId: number
): Promise<Controlesessie> {
  valideerId(controlesessieId, "controlesessie");

  const { data, error } = await supabase
    .from("controlesessies")
    .update({
      status: "geannuleerd",
    })
    .eq("id", controlesessieId)
    .in("status", ["gepland", "bezig"])
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Controlesessie annuleren mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "Controlesessie niet gevonden of kan niet worden geannuleerd."
    );
  }

  return data as Controlesessie;
}
