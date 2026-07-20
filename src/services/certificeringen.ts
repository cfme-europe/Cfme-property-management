import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  Certificering,
  CertificeringInvoer,
  CertificeringType,
} from "@/types/certificering";

const toegestaneTypes: CertificeringType[] = [
  "scope",
  "brandblusser",
  "cv",
  "rookmelder",
  "overig",
];

function schoon(
  waarde: string | null | undefined
): string | null {
  const resultaat = waarde?.trim() ?? "";
  return resultaat || null;
}

function valideer(
  invoer: CertificeringInvoer
): CertificeringInvoer {
  if (
    !Number.isInteger(invoer.woning_id) ||
    invoer.woning_id <= 0
  ) {
    throw new Error("Ongeldige woning.");
  }

  if (!toegestaneTypes.includes(invoer.type)) {
    throw new Error("Ongeldig certificeringstype.");
  }

  const naam = invoer.naam.trim();

  if (!naam) {
    throw new Error("Naam is verplicht.");
  }

  if (!invoer.keuringsdatum) {
    throw new Error("Keuringsdatum is verplicht.");
  }

  if (!invoer.geldig_tot) {
    throw new Error("Geldig-totdatum is verplicht.");
  }

  if (invoer.geldig_tot < invoer.keuringsdatum) {
    throw new Error(
      "De geldig-totdatum mag niet vóór de keuringsdatum liggen."
    );
  }

  if (
    !Number.isInteger(invoer.waarschuwingsdagen) ||
    invoer.waarschuwingsdagen < 0 ||
    invoer.waarschuwingsdagen > 365
  ) {
    throw new Error(
      "Waarschuwingsdagen moet tussen 0 en 365 liggen."
    );
  }

  const ingetrokkenOp = invoer.actief
    ? null
    : invoer.ingetrokken_op;

  if (!invoer.actief && !ingetrokkenOp) {
    throw new Error(
      "Vul een intrekkingsdatum in bij een ingetrokken certificering."
    );
  }

  return {
    woning_id: invoer.woning_id,
    type: invoer.type,
    naam,
    installatie_omschrijving: schoon(
      invoer.installatie_omschrijving
    ),
    certificaatnummer: schoon(
      invoer.certificaatnummer
    ),
    keuringsinstantie: schoon(
      invoer.keuringsinstantie
    ),
    keuringsdatum: invoer.keuringsdatum,
    geldig_tot: invoer.geldig_tot,
    waarschuwingsdagen:
      invoer.waarschuwingsdagen,
    actief: invoer.actief,
    ingetrokken_op: ingetrokkenOp,
    reden_inhouding: schoon(
      invoer.reden_inhouding
    ),
    opmerkingen: schoon(invoer.opmerkingen),
  };
}

export async function getCertificeringenVoorWoning(
  woningId: number
): Promise<Certificering[]> {
  if (
    !Number.isInteger(woningId) ||
    woningId <= 0
  ) {
    throw new Error("Ongeldige woning.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("certificeringen_overzicht")
    .select("*")
    .eq("woning_id", woningId)
    .order("actief", { ascending: false })
    .order("geldig_tot", { ascending: true });

  if (error) {
    throw new Error(
      `Certificeringen ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Certificering[];
}

export async function getCertificeringById(
  certificeringId: number
): Promise<Certificering | null> {
  if (
    !Number.isInteger(certificeringId) ||
    certificeringId <= 0
  ) {
    throw new Error("Ongeldige certificering.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("certificeringen_overzicht")
    .select("*")
    .eq("id", certificeringId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Certificering ophalen mislukt: ${error.message}`
    );
  }

  return data as Certificering | null;
}

export async function createCertificering(
  invoer: CertificeringInvoer
): Promise<Certificering> {
  const geldig = valideer(invoer);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("certificeringen")
    .insert(geldig)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "Voor dit object bestaat al een actieve certificering van hetzelfde type."
      );
    }

    throw new Error(
      `Certificering opslaan mislukt: ${error.message}`
    );
  }

  const resultaat = await getCertificeringById(data.id);

  if (!resultaat) {
    throw new Error(
      "Certificering is opgeslagen maar kon niet worden herladen."
    );
  }

  return resultaat;
}

export async function updateCertificering(
  certificeringId: number,
  invoer: CertificeringInvoer
): Promise<Certificering> {
  if (
    !Number.isInteger(certificeringId) ||
    certificeringId <= 0
  ) {
    throw new Error("Ongeldige certificering.");
  }

  const geldig = valideer(invoer);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("certificeringen")
    .update(geldig)
    .eq("id", certificeringId)
    .eq("woning_id", geldig.woning_id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "Voor dit object bestaat al een actieve certificering van hetzelfde type."
      );
    }

    throw new Error(
      `Certificering wijzigen mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Certificering niet gevonden.");
  }

  const resultaat = await getCertificeringById(
    certificeringId
  );

  if (!resultaat) {
    throw new Error(
      "Certificering is gewijzigd maar kon niet worden herladen."
    );
  }

  return resultaat;
}
