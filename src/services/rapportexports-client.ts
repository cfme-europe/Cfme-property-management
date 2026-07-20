"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  Rapportexport,
  RapportexportStartInvoer,
} from "@/types/rapportexport";

function valideerId(id: number, naam: string): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Ongeldige ${naam}.`);
  }
}

export async function startRapportexport(
  invoer: RapportexportStartInvoer
): Promise<Rapportexport> {
  valideerId(
    invoer.maandrapportage_id,
    "maandrapportage"
  );
  valideerId(
    invoer.templateversie_id,
    "templateversie"
  );

  const bestandsnaam = invoer.bestandsnaam.trim();
  const mimeType = invoer.mime_type.trim();

  if (!bestandsnaam || !mimeType) {
    throw new Error(
      "Bestandsnaam en MIME-type zijn verplicht."
    );
  }

  const supabase = createClient();

  const {
    data: { user },
    error: gebruikerFout,
  } = await supabase.auth.getUser();

  if (gebruikerFout || !user) {
    throw new Error(
      "Geen aangemelde gebruiker gevonden."
    );
  }

  const { data, error } = await supabase
    .from("rapportexports")
    .insert({
      maandrapportage_id:
        invoer.maandrapportage_id,
      templateversie_id:
        invoer.templateversie_id,
      exportformaat: invoer.exportformaat,
      status: "aangemaakt",
      bestandsnaam,
      mime_type: mimeType,
      gegenereerd_door: user.id,
      metadata: invoer.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Exportregistratie starten mislukt: ${error.message}`
    );
  }

  return data as Rapportexport;
}

export async function voltooiRapportexport(
  exportId: number
): Promise<Rapportexport> {
  valideerId(exportId, "rapportexport");

  const supabase = createClient();

  const { data, error } = await supabase
    .from("rapportexports")
    .update({
      status: "gereed",
      gegenereerd_at: new Date().toISOString(),
      foutmelding: null,
    })
    .eq("id", exportId)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Exportregistratie afronden mislukt: ${error.message}`
    );
  }

  return data as Rapportexport;
}

export async function markeerRapportexportMislukt(
  exportId: number,
  foutmelding: string
): Promise<void> {
  valideerId(exportId, "rapportexport");

  const supabase = createClient();

  const { error } = await supabase
    .from("rapportexports")
    .update({
      status: "mislukt",
      foutmelding:
        foutmelding.trim() ||
        "Onbekende exportfout.",
      gegenereerd_at: null,
    })
    .eq("id", exportId);

  if (error) {
    throw new Error(
      `Exportfout registreren mislukt: ${error.message}`
    );
  }
}
