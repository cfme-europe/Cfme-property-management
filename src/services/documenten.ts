import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  DocumentOverzicht,
  DocumentType,
  DocumentVersie,
  DocumentVertrouwelijkheid,
} from "@/types/document";

const BUCKET = "woningdocumenten";
const MAXIMALE_GROOTTE = 20 * 1024 * 1024;

const toegestaneTypes = new Set<DocumentType>([
  "contract",
  "certificering",
  "keuring",
  "inspectie",
  "verzekering",
  "factuur",
  "rapportage",
  "handleiding",
  "identificatie",
  "overig",
]);

const toegestaneVertrouwelijkheid =
  new Set<DocumentVertrouwelijkheid>([
    "intern",
    "vertrouwelijk",
    "extern_geschikt",
  ]);

const toegestaneMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function valideerId(
  waarde: number,
  veldnaam: string
): void {
  if (!Number.isInteger(waarde) || waarde <= 0) {
    throw new Error(`Ongeldige ${veldnaam}.`);
  }
}

function schoon(
  waarde: FormDataEntryValue | null
): string | null {
  if (typeof waarde !== "string") {
    return null;
  }

  const resultaat = waarde.trim();
  return resultaat || null;
}

function veiligeBestandsnaam(
  bestandsnaam: string
): string {
  const delen = bestandsnaam.toLowerCase().split(".");
  const extensie =
    delen.length > 1
      ? delen.pop()?.replace(/[^a-z0-9]/g, "")
      : "";

  const basis = delen
    .join(".")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${basis || "document"}${
    extensie ? `.${extensie}` : ""
  }`;
}

function valideerBestand(
  waarde: FormDataEntryValue | null
): File {
  if (!(waarde instanceof File) || waarde.size <= 0) {
    throw new Error("Selecteer een documentbestand.");
  }

  if (!toegestaneMimeTypes.has(waarde.type)) {
    throw new Error(
      "Alleen PDF, Word, Excel, JPEG, PNG, WebP, HEIC en HEIF zijn toegestaan."
    );
  }

  if (waarde.size > MAXIMALE_GROOTTE) {
    throw new Error(
      "Een document mag maximaal 20 MB groot zijn."
    );
  }

  return waarde;
}

function valideerUploadSleutel(
  waarde: FormDataEntryValue | null
): string {
  const sleutel = schoon(waarde);

  if (
    !sleutel ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      sleutel,
    )
  ) {
    throw new Error("Ongeldige upload. Vernieuw het scherm en probeer opnieuw.");
  }

  return sleutel;
}

async function huidigeGebruikerId(): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Geen geldige gebruikerssessie.");
  }

  return user.id;
}

export async function getDocumentenVoorWoning(
  woningId: number
): Promise<DocumentOverzicht[]> {
  valideerId(woningId, "woning");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documenten_overzicht")
    .select("*")
    .eq("woning_id", woningId)
    .eq("status", "actief")
    .is("samengevoegd_met_document_id", null)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(
      `Documenten ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as DocumentOverzicht[];
}

export async function getDocumentArchiefVoorWoning(
  woningId: number
): Promise<DocumentOverzicht[]> {
  valideerId(woningId, "woning");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documenten_overzicht")
    .select("*")
    .eq("woning_id", woningId)
    .eq("status", "gearchiveerd")
    .is("samengevoegd_met_document_id", null)
    .order("gearchiveerd_op", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Documentarchief ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as DocumentOverzicht[];
}

export async function getDocumentById(
  documentId: number
): Promise<DocumentOverzicht | null> {
  valideerId(documentId, "document");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documenten_overzicht")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Document ophalen mislukt: ${error.message}`
    );
  }

  return data as DocumentOverzicht | null;
}

export async function getDocumentVersies(
  documentId: number
): Promise<DocumentVersie[]> {
  valideerId(documentId, "document");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documentversies")
    .select("*")
    .eq("document_id", documentId)
    .order("versienummer", { ascending: false });

  if (error) {
    throw new Error(
      `Documentversies ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as DocumentVersie[];
}

export async function createDocument(
  woningId: number,
  formData: FormData
): Promise<number> {
  valideerId(woningId, "woning");

  const titel = schoon(formData.get("titel"));
  const omschrijving = schoon(
    formData.get("omschrijving")
  );
  const versieOpmerking = schoon(
    formData.get("versie_opmerking")
  );
  const documentType = schoon(
    formData.get("document_type")
  ) as DocumentType | null;
  const vertrouwelijkheid = schoon(
    formData.get("vertrouwelijkheid")
  ) as DocumentVertrouwelijkheid | null;
  const bestand = valideerBestand(
    formData.get("bestand")
  );
  const uploadSleutel = valideerUploadSleutel(
    formData.get("upload_sleutel")
  );
  const objectIdWaarde = schoon(
    formData.get("object_id")
  );
  const objectId = objectIdWaarde
    ? Number(objectIdWaarde)
    : null;

  if (
    objectId !== null &&
    (
      !Number.isInteger(objectId) ||
      objectId <= 0
    )
  ) {
    throw new Error("Ongeldig object.");
  }

  if (!titel) {
    throw new Error("Titel is verplicht.");
  }

  if (
    !documentType ||
    !toegestaneTypes.has(documentType)
  ) {
    throw new Error("Ongeldig documenttype.");
  }

  if (
    !vertrouwelijkheid ||
    !toegestaneVertrouwelijkheid.has(
      vertrouwelijkheid
    )
  ) {
    throw new Error("Ongeldige vertrouwelijkheid.");
  }

  const gebruikerId = await huidigeGebruikerId();
  const supabase = await createClient();

  const veiligeNaam = veiligeBestandsnaam(
    bestand.name
  );
  const bestandspad = [
    String(woningId),
    "uploads",
    `${uploadSleutel}-${veiligeNaam}`,
  ].join("/");

  const { error: uploadFout } = await supabase.storage
    .from(BUCKET)
    .upload(bestandspad, bestand, {
      upsert: true,
      contentType: bestand.type,
      cacheControl: "3600",
    });

  if (uploadFout) {
    throw new Error(
      `Document uploaden mislukt: ${uploadFout.message}`
    );
  }

  const { data: documentId, error: registratieFout } =
    await supabase.rpc("registreer_document_upload", {
      p_aangemaakt_door: gebruikerId,
      p_bestandsnaam: bestand.name,
      p_bestandsgrootte: bestand.size,
      p_bestandspad: bestandspad,
      p_document_type: documentType,
      p_mime_type: bestand.type,
      p_object_id: objectId,
      p_omschrijving: omschrijving,
      p_titel: titel,
      p_upload_sleutel: uploadSleutel,
      p_versie_opmerking: versieOpmerking,
      p_vertrouwelijkheid: vertrouwelijkheid,
      p_woning_id: woningId,
    });

  if (registratieFout || !documentId) {
    throw new Error(
      `Document registreren mislukt: ${registratieFout?.message ?? "onbekende fout"}`
    );
  }

  return Number(documentId);
}

export async function addDocumentVersie(
  documentId: number,
  woningId: number,
  formData: FormData
): Promise<void> {
  valideerId(documentId, "document");
  valideerId(woningId, "woning");

  const document = await getDocumentById(documentId);

  if (
    !document ||
    document.woning_id !== woningId
  ) {
    throw new Error("Document niet gevonden.");
  }

  if (document.status === "gearchiveerd") {
    throw new Error(
      "Aan een gearchiveerd document kan geen versie worden toegevoegd."
    );
  }

  const bestand = valideerBestand(
    formData.get("bestand")
  );
  const versieOpmerking = schoon(
    formData.get("versie_opmerking")
  );
  const uploadSleutel = valideerUploadSleutel(
    formData.get("upload_sleutel")
  );
  const gebruikerId = await huidigeGebruikerId();
  const supabase = await createClient();

  const veiligeNaam = veiligeBestandsnaam(
    bestand.name
  );
  const bestandspad = [
    String(woningId),
    String(documentId),
    `${uploadSleutel}-${veiligeNaam}`,
  ].join("/");

  const { error: uploadFout } = await supabase.storage
    .from(BUCKET)
    .upload(bestandspad, bestand, {
      upsert: true,
      contentType: bestand.type,
      cacheControl: "3600",
    });

  if (uploadFout) {
    throw new Error(
      `Nieuwe versie uploaden mislukt: ${uploadFout.message}`
    );
  }

  const { error } = await supabase.rpc(
    "registreer_documentversie_upload",
    {
      p_bestandsnaam: bestand.name,
      p_bestandsgrootte: bestand.size,
      p_bestandspad: bestandspad,
      p_document_id: documentId,
      p_geupload_door: gebruikerId,
      p_mime_type: bestand.type,
      p_upload_sleutel: uploadSleutel,
      p_versie_opmerking: versieOpmerking,
      p_woning_id: woningId,
    },
  );

  if (error) {
    throw new Error(
      `Nieuwe versie registreren mislukt: ${error.message}`
    );
  }
}

export async function archiveDocument(
  documentId: number,
  woningId: number,
  reden: string | null
): Promise<void> {
  valideerId(documentId, "document");
  valideerId(woningId, "woning");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "archiveer_document",
    {
      p_document_id: documentId,
      p_reden: reden,
      p_woning_id: woningId,
    },
  );

  if (error) {
    throw new Error(
      `Document archiveren mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Document niet gevonden.");
  }
}

export async function createDocumentDownloadUrl(
  documentId: number,
  versieId: number,
  woningId: number
): Promise<string> {
  valideerId(documentId, "document");
  valideerId(versieId, "documentversie");
  valideerId(woningId, "woning");

  const document = await getDocumentById(documentId);

  if (
    !document ||
    document.woning_id !== woningId
  ) {
    throw new Error("Document niet gevonden.");
  }

  const supabase = await createClient();

  const { data: versie, error: versieFout } =
    await supabase
      .from("documentversies")
      .select("bestandspad")
      .eq("id", versieId)
      .eq("document_id", documentId)
      .maybeSingle();

  if (versieFout || !versie) {
    throw new Error("Documentversie niet gevonden.");
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(versie.bestandspad, 300);

  if (error) {
    throw new Error(
      `Downloadlink maken mislukt: ${error.message}`
    );
  }

  return data.signedUrl;
}
