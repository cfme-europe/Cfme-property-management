import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ActieveRapporttemplate,
  Rapportblok,
  Rapporttemplate,
  RapporttemplateMetVersies,
  Rapporttemplateversie,
  RapporttemplateversieMetBlokken,
} from "@/types/rapportagebibliotheek";

function valideerId(id: number, naam: string): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Ongeldige ${naam}.`);
  }
}

export async function getRapportblokken(
  alleenActief = false
): Promise<Rapportblok[]> {
  const supabase = await createClient();

  let query = supabase
    .from("rapportblokken")
    .select("*")
    .order("actief", { ascending: false })
    .order("naam", { ascending: true });

  if (alleenActief) {
    query = query.eq("actief", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Rapportblokken ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Rapportblok[];
}

export async function getRapportblokById(
  rapportblokId: number
): Promise<Rapportblok | null> {
  valideerId(rapportblokId, "rapportblok");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rapportblokken")
    .select("*")
    .eq("id", rapportblokId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Rapportblok ophalen mislukt: ${error.message}`
    );
  }

  return data as Rapportblok | null;
}

export async function getRapporttemplates(): Promise<
  Rapporttemplate[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rapporttemplates")
    .select("*")
    .order("actief", { ascending: false })
    .order("naam", { ascending: true });

  if (error) {
    throw new Error(
      `Rapporttemplates ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Rapporttemplate[];
}

export async function getRapporttemplatesMetVersies(): Promise<
  RapporttemplateMetVersies[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rapporttemplates")
    .select(`
      *,
      versies:rapporttemplateversies (
        *
      )
    `)
    .order("actief", { ascending: false })
    .order("naam", { ascending: true });

  if (error) {
    throw new Error(
      `Rapporttemplates met versies ophalen mislukt: ${error.message}`
    );
  }

  return ((data ?? []) as RapporttemplateMetVersies[]).map(
    (template) => ({
      ...template,
      versies: [...template.versies].sort(
        (a, b) => b.versienummer - a.versienummer
      ),
    })
  );
}

export async function getRapporttemplateById(
  templateId: number
): Promise<Rapporttemplate | null> {
  valideerId(templateId, "rapporttemplate");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rapporttemplates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Rapporttemplate ophalen mislukt: ${error.message}`
    );
  }

  return data as Rapporttemplate | null;
}

export async function getRapporttemplateversies(
  templateId: number
): Promise<Rapporttemplateversie[]> {
  valideerId(templateId, "rapporttemplate");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rapporttemplateversies")
    .select("*")
    .eq("template_id", templateId)
    .order("versienummer", { ascending: false });

  if (error) {
    throw new Error(
      `Templateversies ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Rapporttemplateversie[];
}

export async function getRapporttemplateversieMetBlokken(
  templateversieId: number
): Promise<RapporttemplateversieMetBlokken | null> {
  valideerId(templateversieId, "templateversie");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rapporttemplateversies")
    .select(`
      *,
      blokken:rapporttemplateblokken (
        *,
        rapportblok:rapportblokken (
          *
        )
      )
    `)
    .eq("id", templateversieId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Templateversie ophalen mislukt: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  const versie =
    data as RapporttemplateversieMetBlokken;

  return {
    ...versie,
    blokken: [...versie.blokken].sort(
      (a, b) => a.volgorde - b.volgorde
    ),
  };
}

export async function getActieveRapporttemplates(): Promise<
  ActieveRapporttemplate[]
> {
  const supabase = await createClient();

  const { data: templates, error: templatesFout } =
    await supabase
      .from("rapporttemplates")
      .select("*")
      .eq("status", "actief")
      .eq("actief", true)
      .order("naam", { ascending: true });

  if (templatesFout) {
    throw new Error(
      `Actieve rapporttemplates ophalen mislukt: ${templatesFout.message}`
    );
  }

  const resultaten: ActieveRapporttemplate[] = [];

  for (const template of (templates ??
    []) as Rapporttemplate[]) {
    const { data: versie, error: versieFout } =
      await supabase
        .from("rapporttemplateversies")
        .select(`
          *,
          blokken:rapporttemplateblokken (
            *,
            rapportblok:rapportblokken (
              *
            )
          )
        `)
        .eq("template_id", template.id)
        .eq("status", "actief")
        .maybeSingle();

    if (versieFout) {
      throw new Error(
        `Actieve templateversie ophalen mislukt: ${versieFout.message}`
      );
    }

    if (!versie) {
      continue;
    }

    const getypeerdeVersie =
      versie as RapporttemplateversieMetBlokken;

    resultaten.push({
      template,
      versie: {
        ...getypeerdeVersie,
        blokken: [...getypeerdeVersie.blokken].sort(
          (a, b) => a.volgorde - b.volgorde
        ),
      },
    });
  }

  return resultaten;
}

export async function getActieveRapporttemplateversie(
  templateversieId: number
): Promise<RapporttemplateversieMetBlokken | null> {
  valideerId(templateversieId, "templateversie");

  const versie =
    await getRapporttemplateversieMetBlokken(
      templateversieId
    );

  if (!versie || versie.status !== "actief") {
    return null;
  }

  return versie;
}