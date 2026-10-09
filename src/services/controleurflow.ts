import { createClient } from "@/lib/supabase/client";
import type {
  AfwijkingUrgentie,
  ControleAfwijking,
  ControleResultaat,
  ControleResultaatWaarde,
  GebrekType,
  RuimteAkkoordResultaat,
} from "@/types/controleurflow";
import type { InspectieFotoType } from "@/types/inspectiefoto";
import type {
  IntelligenceWerkpuntTerugmelding,
  IntelligenceWerkpuntTerugmeldingUitkomst,
} from "@/types/intelligence";

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
  numerieke_waarde?: number | null;
  tekstwaarde?: string | null;
  datumwaarde?: string | null;
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
  ter_plaatse_hersteld?: boolean;
  oplossing?: string | null;
  gebruikte_materialen?: string | null;
  arbeid_minuten?: number | null;
  werkelijke_kosten?: number | null;
}): Promise<ControleAfwijking> {
  const toelichting = invoer.toelichting.trim();

  if (!toelichting) {
    throw new Error("Toelichting bij de afwijking is verplicht.");
  }

  const terPlaatseHersteld =
    invoer.ter_plaatse_hersteld === true;
  const oplossing = invoer.oplossing?.trim() || null;

  if (terPlaatseHersteld && !oplossing) {
    throw new Error(
      "Beschrijving van de reparatie ter plaatse is verplicht.",
    );
  }

  if (
    invoer.arbeid_minuten != null &&
    (!Number.isInteger(invoer.arbeid_minuten) ||
      invoer.arbeid_minuten < 0)
  ) {
    throw new Error("Arbeidstijd moet nul of een positief aantal minuten zijn.");
  }

  if (
    invoer.werkelijke_kosten != null &&
    (!Number.isFinite(invoer.werkelijke_kosten) ||
      invoer.werkelijke_kosten < 0)
  ) {
    throw new Error("Werkelijke kosten mogen niet negatief zijn.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Geen geldige gebruikerssessie.");
  }

  const nu = new Date().toISOString();

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
        opvolging_nodig: !terPlaatseHersteld,
        melding_maken: !terPlaatseHersteld,
        taak_maken: !terPlaatseHersteld,
        status: terPlaatseHersteld ? "opgelost" : "open",
        opgelost_at: terPlaatseHersteld ? nu : null,
        opgelost_door: terPlaatseHersteld ? user.id : null,
        oplossing: terPlaatseHersteld ? oplossing : null,
        ter_plaatse_hersteld: terPlaatseHersteld,
        gebruikte_materialen: terPlaatseHersteld
          ? invoer.gebruikte_materialen?.trim() || null
          : null,
        arbeid_minuten: terPlaatseHersteld
          ? invoer.arbeid_minuten ?? null
          : null,
        werkelijke_kosten: terPlaatseHersteld
          ? invoer.werkelijke_kosten ?? null
          : null,
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
      ter_plaatse_hersteld: false,
    })
    .eq("controle_resultaat_id", controleResultaatId)
    .neq("status", "niet_relevant");

  if (error) {
    throw new Error(
      `Afwijking bijwerken mislukt: ${error.message}`,
    );
  }
}

export async function uploadControleFoto(invoer: {
  inspectie_id: number;
  controle_resultaat_id: number;
  controle_afwijking_id: number | null;
  bestand: File;
  omschrijving: string;
  foto_type?: InspectieFotoType;
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
      foto_type: invoer.foto_type ?? "situatie",
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

export async function registreerWerkpuntTerugmelding(invoer: {
  werkpunt_id: number;
  controlesessie_id: number;
  uitkomst: IntelligenceWerkpuntTerugmeldingUitkomst;
  bevinding: string;
  woning_controlepunt_id: number | null;
}): Promise<IntelligenceWerkpuntTerugmelding> {
  const bevinding = invoer.bevinding.trim();

  if (!bevinding) {
    throw new Error("Een feitelijke bevinding is verplicht.");
  }

  if (bevinding.length > 2000) {
    throw new Error("De bevinding mag maximaal 2000 tekens bevatten.");
  }

  const { data, error } = await supabase.rpc(
    "registreer_intelligence_werkpunt_terugmelding",
    {
      p_werkpunt_id: invoer.werkpunt_id,
      p_controlesessie_id: invoer.controlesessie_id,
      p_uitkomst: invoer.uitkomst,
      p_bevinding: bevinding,
      p_woning_controlepunt_id:
        invoer.woning_controlepunt_id,
    },
  );

  if (error) {
    throw new Error(
      `Werkpunt terugmelden mislukt: ${error.message}`,
    );
  }

  return data as IntelligenceWerkpuntTerugmelding;
}


export async function slaRuimteAkkoordOp(invoer: {
  controlesessie_id: number;
  ruimte_id: number;
  controlepunt_ids: number[];
}): Promise<RuimteAkkoordResultaat[]> {
  if (
    !Number.isInteger(invoer.controlesessie_id) ||
    invoer.controlesessie_id <= 0
  ) {
    throw new Error("Ongeldige controlesessie.");
  }

  if (
    !Number.isInteger(invoer.ruimte_id) ||
    invoer.ruimte_id <= 0
  ) {
    throw new Error("Ongeldige ruimte.");
  }

  const controlepuntIds = Array.from(
    new Set(invoer.controlepunt_ids),
  );

  if (
    controlepuntIds.length === 0 ||
    controlepuntIds.some(
      (id) => !Number.isInteger(id) || id <= 0,
    )
  ) {
    throw new Error(
      "Er zijn geen geldige controlepunten voor ruimteakkoord.",
    );
  }

  const { data, error } = await supabase.rpc(
    "sla_ruimte_akkoord_op",
    {
      p_controlesessie_id: invoer.controlesessie_id,
      p_ruimte_id: invoer.ruimte_id,
      p_controlepunt_ids: controlepuntIds,
    },
  );

  if (error) {
    throw new Error(
      `Ruimteakkoord opslaan mislukt: ${error.message}`,
    );
  }

  return (data ?? []) as RuimteAkkoordResultaat[];
}
