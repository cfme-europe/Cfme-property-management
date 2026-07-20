"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  Rapportblok,
  RapportblokInvoer,
  Rapporttemplate,
  RapporttemplateblokInvoer,
  RapporttemplateInvoer,
  Rapporttemplateversie,
  RapporttemplateversieInvoer,
} from "@/types/rapportagebibliotheek";

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

function valideerCode(waarde: string): string {
  const code = waarde
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!code) {
    throw new Error("Code is verplicht.");
  }

  return code;
}

function valideerRapportblok(
  invoer: RapportblokInvoer
): RapportblokInvoer {
  const naam = invoer.naam.trim();

  if (!naam) {
    throw new Error("Naam van het rapportblok is verplicht.");
  }

  return {
    code: valideerCode(invoer.code),
    naam,
    omschrijving: schoon(invoer.omschrijving),
    bloktype: invoer.bloktype,
    doelgroep: invoer.doelgroep,
    standaard_zichtbaar:
      invoer.standaard_zichtbaar,
    actief: invoer.actief,
    configuratie: invoer.configuratie ?? {},
  };
}

function valideerRapporttemplate(
  invoer: RapporttemplateInvoer
): RapporttemplateInvoer {
  const naam = invoer.naam.trim();

  if (!naam) {
    throw new Error(
      "Naam van het rapporttemplate is verplicht."
    );
  }

  return {
    code: valideerCode(invoer.code),
    naam,
    omschrijving: schoon(invoer.omschrijving),
    doelgroep: invoer.doelgroep,
    actief: invoer.actief,
  };
}

function valideerTemplateversie(
  invoer: RapporttemplateversieInvoer
): RapporttemplateversieInvoer {
  valideerId(invoer.template_id, "rapporttemplate");

  return {
    template_id: invoer.template_id,
    geldig_vanaf: schoon(invoer.geldig_vanaf),
    toelichting: schoon(invoer.toelichting),
    configuratie: invoer.configuratie ?? {},
  };
}

function valideerTemplateblokken(
  blokken: RapporttemplateblokInvoer[]
): RapporttemplateblokInvoer[] {
  if (blokken.length === 0) {
    throw new Error(
      "Een templateversie moet minimaal één rapportblok bevatten."
    );
  }

  const blokIds = new Set<number>();
  const volgordes = new Set<number>();

  return blokken
    .map((blok) => {
      valideerId(blok.rapportblok_id, "rapportblok");

      if (
        !Number.isInteger(blok.volgorde) ||
        blok.volgorde <= 0
      ) {
        throw new Error(
          "De volgorde moet een positief geheel getal zijn."
        );
      }

      if (blokIds.has(blok.rapportblok_id)) {
        throw new Error(
          "Een rapportblok mag maar één keer voorkomen."
        );
      }

      if (volgordes.has(blok.volgorde)) {
        throw new Error(
          "Iedere blokvolgorde moet uniek zijn."
        );
      }

      if (blok.verplicht && !blok.zichtbaar) {
        throw new Error(
          "Een verplicht rapportblok moet zichtbaar zijn."
        );
      }

      blokIds.add(blok.rapportblok_id);
      volgordes.add(blok.volgorde);

      return {
        rapportblok_id: blok.rapportblok_id,
        volgorde: blok.volgorde,
        verplicht: blok.verplicht,
        zichtbaar: blok.zichtbaar,
        titel_override: schoon(
          blok.titel_override
        ),
        configuratie: blok.configuratie ?? {},
      };
    })
    .sort((a, b) => a.volgorde - b.volgorde);
}

export async function createRapportblok(
  invoer: RapportblokInvoer
): Promise<Rapportblok> {
  const supabase = createClient();
  const geldig = valideerRapportblok(invoer);

  const { data, error } = await supabase
    .from("rapportblokken")
    .insert(geldig)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "Er bestaat al een rapportblok met deze code."
      );
    }

    throw new Error(
      `Rapportblok opslaan mislukt: ${error.message}`
    );
  }

  return data as Rapportblok;
}

export async function updateRapportblok(
  rapportblokId: number,
  invoer: RapportblokInvoer
): Promise<Rapportblok> {
  valideerId(rapportblokId, "rapportblok");

  const supabase = createClient();
  const geldig = valideerRapportblok(invoer);

  const { data, error } = await supabase
    .from("rapportblokken")
    .update(geldig)
    .eq("id", rapportblokId)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "Er bestaat al een rapportblok met deze code."
      );
    }

    throw new Error(
      `Rapportblok wijzigen mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Rapportblok niet gevonden.");
  }

  return data as Rapportblok;
}

export async function createRapporttemplate(
  invoer: RapporttemplateInvoer
): Promise<Rapporttemplate> {
  const supabase = createClient();
  const geldig = valideerRapporttemplate(invoer);

  const { data, error } = await supabase
    .from("rapporttemplates")
    .insert({
      ...geldig,
      status: "concept",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "Er bestaat al een rapporttemplate met deze code."
      );
    }

    throw new Error(
      `Rapporttemplate opslaan mislukt: ${error.message}`
    );
  }

  return data as Rapporttemplate;
}

export async function updateRapporttemplate(
  templateId: number,
  invoer: RapporttemplateInvoer
): Promise<Rapporttemplate> {
  valideerId(templateId, "rapporttemplate");

  const supabase = createClient();
  const geldig = valideerRapporttemplate(invoer);

  const { data: bestaand, error: leesFout } =
    await supabase
      .from("rapporttemplates")
      .select("status")
      .eq("id", templateId)
      .maybeSingle();

  if (leesFout) {
    throw new Error(
      `Rapporttemplate controleren mislukt: ${leesFout.message}`
    );
  }

  if (!bestaand) {
    throw new Error("Rapporttemplate niet gevonden.");
  }

  if (bestaand.status === "gearchiveerd") {
    throw new Error(
      "Een gearchiveerd rapporttemplate kan niet worden gewijzigd."
    );
  }

  const { data, error } = await supabase
    .from("rapporttemplates")
    .update(geldig)
    .eq("id", templateId)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "Er bestaat al een rapporttemplate met deze code."
      );
    }

    throw new Error(
      `Rapporttemplate wijzigen mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Rapporttemplate niet gevonden.");
  }

  return data as Rapporttemplate;
}

export async function archiveerRapporttemplate(
  templateId: number
): Promise<Rapporttemplate> {
  valideerId(templateId, "rapporttemplate");

  const supabase = createClient();

  const { data, error } = await supabase
    .from("rapporttemplates")
    .update({
      status: "gearchiveerd",
      actief: false,
    })
    .eq("id", templateId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Rapporttemplate archiveren mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Rapporttemplate niet gevonden.");
  }

  return data as Rapporttemplate;
}

export async function createRapporttemplateversie(
  invoer: RapporttemplateversieInvoer
): Promise<Rapporttemplateversie> {
  const supabase = createClient();
  const geldig = valideerTemplateversie(invoer);

  const { data: laatsteVersie, error: leesFout } =
    await supabase
      .from("rapporttemplateversies")
      .select("versienummer")
      .eq("template_id", geldig.template_id)
      .order("versienummer", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (leesFout) {
    throw new Error(
      `Laatste templateversie ophalen mislukt: ${leesFout.message}`
    );
  }

  const versienummer =
    (laatsteVersie?.versienummer ?? 0) + 1;

  const { data, error } = await supabase
    .from("rapporttemplateversies")
    .insert({
      ...geldig,
      versienummer,
      status: "concept",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "De templateversie kon door gelijktijdige wijziging niet worden aangemaakt. Vernieuw de pagina."
      );
    }

    throw new Error(
      `Templateversie opslaan mislukt: ${error.message}`
    );
  }

  return data as Rapporttemplateversie;
}

export async function updateConceptTemplateversie(
  templateversieId: number,
  invoer: RapporttemplateversieInvoer
): Promise<Rapporttemplateversie> {
  valideerId(templateversieId, "templateversie");

  const supabase = createClient();
  const geldig = valideerTemplateversie(invoer);

  const { data, error } = await supabase
    .from("rapporttemplateversies")
    .update({
      geldig_vanaf: geldig.geldig_vanaf,
      toelichting: geldig.toelichting,
      configuratie: geldig.configuratie,
    })
    .eq("id", templateversieId)
    .eq("template_id", geldig.template_id)
    .eq("status", "concept")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Conceptversie wijzigen mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "Conceptversie niet gevonden of niet meer wijzigbaar."
    );
  }

  return data as Rapporttemplateversie;
}

export async function slaConceptTemplateblokkenOp(
  templateversieId: number,
  blokken: RapporttemplateblokInvoer[]
): Promise<void> {
  valideerId(templateversieId, "templateversie");

  const supabase = createClient();
  const geldigeBlokken =
    valideerTemplateblokken(blokken);

  const { data: versie, error: versieFout } =
    await supabase
      .from("rapporttemplateversies")
      .select("id, status")
      .eq("id", templateversieId)
      .maybeSingle();

  if (versieFout) {
    throw new Error(
      `Templateversie controleren mislukt: ${versieFout.message}`
    );
  }

  if (!versie || versie.status !== "concept") {
    throw new Error(
      "Alleen een conceptversie kan worden ingericht."
    );
  }

  const { data: bestaandeBlokken, error: leesFout } =
    await supabase
      .from("rapporttemplateblokken")
      .select("id, rapportblok_id")
      .eq("templateversie_id", templateversieId);

  if (leesFout) {
    throw new Error(
      `Bestaande templateblokken ophalen mislukt: ${leesFout.message}`
    );
  }

  const gekozenIds = new Set(
    geldigeBlokken.map(
      (blok) => blok.rapportblok_id
    )
  );

  const uitgeschakeldeIds = (
    bestaandeBlokken ?? []
  )
    .filter(
      (blok) =>
        !gekozenIds.has(blok.rapportblok_id)
    )
    .map((blok) => blok.id);

  if (uitgeschakeldeIds.length > 0) {
    const { error: uitschakelFout } =
      await supabase
        .from("rapporttemplateblokken")
        .update({
          verplicht: false,
          zichtbaar: false,
        })
        .in("id", uitgeschakeldeIds);

    if (uitschakelFout) {
      throw new Error(
        `Oude templateblokken uitschakelen mislukt: ${uitschakelFout.message}`
      );
    }
  }

  const rijen = geldigeBlokken.map((blok) => ({
    templateversie_id: templateversieId,
    ...blok,
  }));

  const { error } = await supabase
    .from("rapporttemplateblokken")
    .upsert(rijen, {
      onConflict:
        "templateversie_id,rapportblok_id",
    });

  if (error) {
    throw new Error(
      `Templateblokken opslaan mislukt: ${error.message}`
    );
  }
}