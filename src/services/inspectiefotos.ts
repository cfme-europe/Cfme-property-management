import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
import type {
  InspectieFoto,
  InspectieFotoUpload,
} from "@/types/inspectiefoto";

const BUCKET = "inspectiefotos";
const MAXIMALE_GROOTTE = 10 * 1024 * 1024;

const TOEGESTANE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function schoon(
  waarde: string | null | undefined
): string | null {
  const resultaat = waarde?.trim() ?? "";
  return resultaat || null;
}

function veiligeBestandsnaam(bestandsnaam: string): string {
  const delen = bestandsnaam.toLowerCase().split(".");
  const extensie =
    delen.length > 1
      ? delen.pop()?.replace(/[^a-z0-9]/g, "")
      : "";

  return extensie ? `foto.${extensie}` : "foto";
}

function valideerUpload(invoer: InspectieFotoUpload): void {
  if (
    !Number.isInteger(invoer.inspectie_id) ||
    invoer.inspectie_id <= 0
  ) {
    throw new Error("Ongeldige inspectie.");
  }

  if (!invoer.bestand) {
    throw new Error("Selecteer een foto.");
  }

  if (!TOEGESTANE_TYPES.has(invoer.bestand.type)) {
    throw new Error(
      "Alleen JPEG-, PNG-, WebP-, HEIC- en HEIF-foto's zijn toegestaan."
    );
  }

  if (invoer.bestand.size <= 0) {
    throw new Error("Het geselecteerde bestand is leeg.");
  }

  if (invoer.bestand.size > MAXIMALE_GROOTTE) {
    throw new Error("Een foto mag maximaal 10 MB groot zijn.");
  }
}

export async function getInspectieFotos(
  inspectieId: number
): Promise<InspectieFoto[]> {
  const { data, error } = await supabase
    .from("inspectie_fotos")
    .select("*")
    .eq("inspectie_id", inspectieId)
    .order("volgorde", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      `Inspectiefoto's ophalen mislukt: ${error.message}`
    );
  }

  const fotos = (data ?? []) as InspectieFoto[];

  return Promise.all(
    fotos.map(async (foto) => {
      const { data: urlData, error: urlFout } =
        await supabase.storage
          .from(BUCKET)
          .createSignedUrl(foto.bestandspad, 3600);

      return {
        ...foto,
        tijdelijke_url: urlFout
          ? null
          : urlData.signedUrl,
      };
    })
  );
}

export async function uploadInspectieFoto(
  invoer: InspectieFotoUpload
): Promise<InspectieFoto> {
  valideerUpload(invoer);

  const veiligeNaam = veiligeBestandsnaam(
    invoer.bestand.name
  );

  const bestandspad = [
    String(invoer.inspectie_id),
    `${crypto.randomUUID()}-${veiligeNaam}`,
  ].join("/");

  const { error: uploadFout } = await supabase.storage
    .from(BUCKET)
    .upload(bestandspad, invoer.bestand, {
      cacheControl: "3600",
      upsert: false,
      contentType: invoer.bestand.type,
    });

  if (uploadFout) {
    throw new Error(
      `Foto uploaden mislukt: ${uploadFout.message}`
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
      .from(BUCKET)
      .remove([bestandspad]);

    throw new Error(
      `Fotovolgorde bepalen mislukt: ${volgordeFout.message}`
    );
  }

  const { data, error } = await supabase
    .from("inspectie_fotos")
    .insert({
      inspectie_id: invoer.inspectie_id,
      bestandspad,
      bestandsnaam: invoer.bestand.name,
      mime_type: invoer.bestand.type,
      bestandsgrootte: invoer.bestand.size,
      omschrijving: schoon(invoer.omschrijving),
      volgorde: (laatsteFoto?.volgorde ?? -1) + 1,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage
      .from(BUCKET)
      .remove([bestandspad]);

    throw new Error(
      `Fotogegevens opslaan mislukt: ${error.message}`
    );
  }

  return data as InspectieFoto;
}

export async function updateInspectieFotoOmschrijving(
  fotoId: number,
  inspectieId: number,
  omschrijving: string | null
): Promise<InspectieFoto> {
  const { data, error } = await supabase
    .from("inspectie_fotos")
    .update({
      omschrijving: schoon(omschrijving),
    })
    .eq("id", fotoId)
    .eq("inspectie_id", inspectieId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Foto wijzigen mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Foto niet gevonden.");
  }

  return data as InspectieFoto;
}

export async function deleteInspectieFoto(
  fotoId: number,
  inspectieId: number
): Promise<void> {
  const { data: foto, error: zoekFout } = await supabase
    .from("inspectie_fotos")
    .select("bestandspad")
    .eq("id", fotoId)
    .eq("inspectie_id", inspectieId)
    .maybeSingle();

  if (zoekFout) {
    throw new Error(
      `Foto ophalen mislukt: ${zoekFout.message}`
    );
  }

  if (!foto) {
    throw new Error("Foto niet gevonden.");
  }

  const { error: opslagFout } = await supabase.storage
    .from(BUCKET)
    .remove([foto.bestandspad]);

  if (opslagFout) {
    throw new Error(
      `Fotobestand verwijderen mislukt: ${opslagFout.message}`
    );
  }

  const { error } = await supabase
    .from("inspectie_fotos")
    .delete()
    .eq("id", fotoId)
    .eq("inspectie_id", inspectieId);

  if (error) {
    throw new Error(
      `Fotogegevens verwijderen mislukt: ${error.message}`
    );
  }
}
