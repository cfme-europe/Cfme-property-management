import { createClient } from "@/lib/supabase/client";
import type {
  AfwijkingUrgentie,
  ControleAfwijking,
  ControleResultaat,
  ControleResultaatWaarde,
  GebrekType,
} from "@/types/controleurflow";

const supabase = createClient();
const FOTO_BUCKET = "inspectiefotos";
const MAXIMALE_FOTOGROOTTE = 10 * 1024 * 1024;

const TOEGESTANE_FOTOTYPEN = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function slaControleResultaatOp(invoer: {
  controlesessie_id: number;
  inspectie_id: number | null;
  woning_id: number;
  ruimte_id: number;
  object_id: number | null;
  woning_controlepunt_id: number;
  resultaat: ControleResultaatWaarde;
  ruimte_naam_snapshot: string;
  object_naam_snapshot: string | null;
  controlepunt_naam_snapshot: string;
  opmerkingen?: string | null;
}): Promise<ControleResultaat> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Geen geldige gebruikerssessie.");
  }

  const { data, error } = await supabase
    .from("controle_resultaten")
    .upsert(
      {
        ...invoer,
        beoordeeld_at: new Date().toISOString(),
        beoordeeld_door: user.id,
        opmerkingen: invoer.opmerkingen?.trim() || null,
      },
      {
        onConflict:
          "controlesessie_id,woning_controlepunt_id",
      },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Controleresultaat opslaan mislukt: ${error.message}`,
    );
  }

  return data as ControleResultaat;
}

export async function slaControleAfwijkingOp(invoer: {
  controle_resultaat_id: number;
  woning_id: number;
  inspectie_id: number | null;
  controlesessie_id: number;
  gebrek_type: GebrekType;
  toelichting: string;
  urgentie: AfwijkingUrgentie;
}): Promise<ControleAfwijking> {
  const toelichting = invoer.toelichting.trim();

  if (!toelichting) {
    throw new Error("Toelichting bij de afwijking is verplicht.");
  }

  const { data, error } = await supabase
    .from("controle_afwijkingen")
    .upsert(
      {
        controle_resultaat_id: invoer.controle_resultaat_id,
        woning_id: invoer.woning_id,
        inspectie_id: invoer.inspectie_id,
        controlesessie_id: invoer.controlesessie_id,
        gebrek_type: invoer.gebrek_type,
        toelichting,
        urgentie: invoer.urgentie,
        opvolging_nodig: true,
        melding_maken: true,
        taak_maken: true,
        status: "open",
      },
      {
        onConflict: "controle_resultaat_id",
      },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Afwijking opslaan mislukt: ${error.message}`,
    );
  }

  return data as ControleAfwijking;
}

export async function markeerAfwijkingNietRelevant(
  controleResultaatId: number,
): Promise<void> {
  const { error } = await supabase
    .from("controle_afwijkingen")
    .update({
      status: "niet_relevant",
      opvolging_nodig: false,
      melding_maken: false,
      taak_maken: false,
    })
    .eq("controle_resultaat_id", controleResultaatId)
    .in("status", ["open", "in_opvolging"]);

  if (error) {
    throw new Error(
      `Afwijking bijwerken mislukt: ${error.message}`,
    );
  }
}

export async function uploadControleFoto(invoer: {
  inspectie_id: number;
  controle_resultaat_id: number;
  controle_afwijking_id: number;
  bestand: File;
  omschrijving: string;
}): Promise<void> {
  if (!TOEGESTANE_FOTOTYPEN.has(invoer.bestand.type)) {
    throw new Error(
      "Alleen JPEG-, PNG-, WebP-, HEIC- en HEIF-foto's zijn toegestaan.",
    );
  }

  if (
    invoer.bestand.size <= 0 ||
    invoer.bestand.size > MAXIMALE_FOTOGROOTTE
  ) {
    throw new Error("Een foto moet tussen 1 byte en 10 MB groot zijn.");
  }

  const extensie =
    invoer.bestand.name.split(".").pop()?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";

  const bestandspad =
    `${invoer.inspectie_id}/controle-${crypto.randomUUID()}.${extensie}`;

  const { error: uploadFout } = await supabase.storage
    .from(FOTO_BUCKET)
    .upload(bestandspad, invoer.bestand, {
      cacheControl: "3600",
      upsert: false,
      contentType: invoer.bestand.type,
    });

  if (uploadFout) {
    throw new Error(
      `Foto uploaden mislukt: ${uploadFout.message}`,
    );
  }

  const { data: laatsteFoto, error: volgordeFout } =
    await supabase
      .from("inspectie_fotos")
      .select("volgorde")
      .eq("inspectie_id", invoer.inspectie_id)
      .order("volgorde", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (volgordeFout) {
    await supabase.storage
      .from(FOTO_BUCKET)
      .remove([bestandspad]);

    throw new Error(
      `Fotovolgorde bepalen mislukt: ${volgordeFout.message}`,
    );
  }

  const { error: registratieFout } = await supabase
    .from("inspectie_fotos")
    .insert({
      inspectie_id: invoer.inspectie_id,
      controle_resultaat_id: invoer.controle_resultaat_id,
      controle_afwijking_id: invoer.controle_afwijking_id,
      bestandspad,
      bestandsnaam: invoer.bestand.name,
      mime_type: invoer.bestand.type,
      bestandsgrootte: invoer.bestand.size,
      omschrijving: invoer.omschrijving.trim() || null,
      volgorde: (laatsteFoto?.volgorde ?? -1) + 1,
    });

  if (registratieFout) {
    await supabase.storage
      .from(FOTO_BUCKET)
      .remove([bestandspad]);

    throw new Error(
      `Fotogegevens opslaan mislukt: ${registratieFout.message}`,
    );
  }
}

export async function rondControleflowAf(
  sessieId: number,
  inspectieId: number | null,
): Promise<void> {
  const nu = new Date().toISOString();

  const { data: sessie, error: sessieFout } = await supabase
    .from("controlesessies")
    .update({
      status: "afgerond",
      afgerond_at: nu,
    })
    .eq("id", sessieId)
    .eq("status", "bezig")
    .select("id")
    .maybeSingle();

  if (sessieFout) {
    throw new Error(
      `Controlesessie afronden mislukt: ${sessieFout.message}`,
    );
  }

  if (!sessie) {
    throw new Error("De controlesessie is niet meer actief.");
  }

  if (inspectieId) {
    const { error: inspectieFout } = await supabase
      .from("inspecties")
      .update({
        status: "afgerond",
      })
      .eq("id", inspectieId);

    if (inspectieFout) {
      throw new Error(
        `Inspectie afronden mislukt: ${inspectieFout.message}`,
      );
    }
  }
}
