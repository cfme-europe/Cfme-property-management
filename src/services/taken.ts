import { supabase } from "@/lib/supabase";
import type {
  Taak,
  TaakInvoer,
  TaakStatus,
} from "@/types/taak";

function schoon(
  waarde: string | null | undefined
): string | null {
  const resultaat = waarde?.trim() ?? "";
  return resultaat || null;
}

function valideer(invoer: TaakInvoer): TaakInvoer {
  if (
    !Number.isInteger(invoer.woning_id) ||
    invoer.woning_id <= 0
  ) {
    throw new Error("Ongeldige woning.");
  }

  if (
    invoer.inspectie_id !== null &&
    (
      !Number.isInteger(invoer.inspectie_id) ||
      invoer.inspectie_id <= 0
    )
  ) {
    throw new Error("Ongeldige inspectie.");
  }

  if (
    invoer.melding_id !== null &&
    (
      !Number.isInteger(invoer.melding_id) ||
      invoer.melding_id <= 0
    )
  ) {
    throw new Error("Ongeldige melding.");
  }

  const titel = invoer.titel.trim();

  if (!titel) {
    throw new Error("Titel is verplicht.");
  }

  if (
    invoer.startdatum &&
    invoer.deadline &&
    invoer.deadline < invoer.startdatum
  ) {
    throw new Error(
      "Deadline mag niet vóór de startdatum liggen."
    );
  }

  const afgerondOp =
    invoer.status === "afgerond"
      ? invoer.afgerond_op ??
        new Date().toISOString().slice(0, 10)
      : null;

  return {
    woning_id: invoer.woning_id,
    inspectie_id: invoer.inspectie_id,
    melding_id: invoer.melding_id,
    titel,
    omschrijving: schoon(invoer.omschrijving),
    categorie: invoer.categorie,
    prioriteit: invoer.prioriteit,
    status: invoer.status,
    startdatum: invoer.startdatum || null,
    deadline: invoer.deadline || null,
    afgerond_op: afgerondOp,
    toegewezen_aan: schoon(invoer.toegewezen_aan),
    externe_referentie: schoon(
      invoer.externe_referentie
    ),
    opmerkingen: schoon(invoer.opmerkingen),
  };
}

export async function getTaken(): Promise<Taak[]> {
  const { data, error } = await supabase
    .from("taken")
    .select("*")
    .order("status", { ascending: true })
    .order("deadline", {
      ascending: true,
      nullsFirst: false,
    })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Taken ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Taak[];
}

export async function getTakenVoorWoning(
  woningId: number
): Promise<Taak[]> {
  if (
    !Number.isInteger(woningId) ||
    woningId <= 0
  ) {
    throw new Error("Ongeldige woning.");
  }

  const { data, error } = await supabase
    .from("taken")
    .select("*")
    .eq("woning_id", woningId)
    .order("status", { ascending: true })
    .order("deadline", {
      ascending: true,
      nullsFirst: false,
    })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Taken voor woning ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Taak[];
}

export async function getOpenTakenVoorWoning(
  woningId: number
): Promise<Taak[]> {
  if (
    !Number.isInteger(woningId) ||
    woningId <= 0
  ) {
    throw new Error("Ongeldige woning.");
  }

  const { data, error } = await supabase
    .from("taken")
    .select("*")
    .eq("woning_id", woningId)
    .in("status", ["open", "in_behandeling"])
    .order("prioriteit", { ascending: false })
    .order("deadline", {
      ascending: true,
      nullsFirst: false,
    });

  if (error) {
    throw new Error(
      `Open taken ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Taak[];
}

export async function getTaakById(
  taakId: number
): Promise<Taak | null> {
  if (
    !Number.isInteger(taakId) ||
    taakId <= 0
  ) {
    throw new Error("Ongeldige taak.");
  }

  const { data, error } = await supabase
    .from("taken")
    .select("*")
    .eq("id", taakId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Taak ophalen mislukt: ${error.message}`
    );
  }

  return data as Taak | null;
}

export async function createTaak(
  invoer: TaakInvoer
): Promise<Taak> {
  const geldig = valideer(invoer);

  const { data, error } = await supabase
    .from("taken")
    .insert(geldig)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Taak opslaan mislukt: ${error.message}`
    );
  }

  return data as Taak;
}

export async function updateTaak(
  taakId: number,
  invoer: TaakInvoer
): Promise<Taak> {
  if (
    !Number.isInteger(taakId) ||
    taakId <= 0
  ) {
    throw new Error("Ongeldige taak.");
  }

  const geldig = valideer(invoer);

  const { data, error } = await supabase
    .from("taken")
    .update(geldig)
    .eq("id", taakId)
    .eq("woning_id", geldig.woning_id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Taak wijzigen mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Taak niet gevonden.");
  }

  return data as Taak;
}

export async function updateTaakStatus(
  taakId: number,
  status: TaakStatus
): Promise<Taak> {
  if (
    !Number.isInteger(taakId) ||
    taakId <= 0
  ) {
    throw new Error("Ongeldige taak.");
  }

  const wijzigingen = {
    status,
    afgerond_op:
      status === "afgerond"
        ? new Date().toISOString().slice(0, 10)
        : null,
  };

  const { data, error } = await supabase
    .from("taken")
    .update(wijzigingen)
    .eq("id", taakId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Taakstatus wijzigen mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Taak niet gevonden.");
  }

  return data as Taak;
}

export async function deleteTaak(
  taakId: number,
  woningId: number
): Promise<void> {
  if (
    !Number.isInteger(taakId) ||
    taakId <= 0
  ) {
    throw new Error("Ongeldige taak.");
  }

  if (
    !Number.isInteger(woningId) ||
    woningId <= 0
  ) {
    throw new Error("Ongeldige woning.");
  }

  const { error } = await supabase
    .from("taken")
    .delete()
    .eq("id", taakId)
    .eq("woning_id", woningId);

  if (error) {
    throw new Error(
      `Taak verwijderen mislukt: ${error.message}`
    );
  }
}
