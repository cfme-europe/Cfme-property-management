import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ActieveWoningplanning,
  ProfielSamenvatting,
  Rayon,
  RayonInvoer,
  WoningRayonToewijzing,
  WoningRayonToewijzingInvoer,
} from "@/types/planning";

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

function valideerRayonInvoer(
  invoer: RayonInvoer
): RayonInvoer {
  const naam = invoer.naam.trim();
  const code = invoer.code.trim().toUpperCase();

  if (!naam) {
    throw new Error("Rayonnaam is verplicht.");
  }

  if (!code) {
    throw new Error("Rayoncode is verplicht.");
  }

  if (
    !Number.isInteger(
      invoer.standaard_controlefrequentie_dagen
    ) ||
    invoer.standaard_controlefrequentie_dagen <= 0
  ) {
    throw new Error(
      "De standaardcontrolefrequentie moet groter zijn dan nul."
    );
  }

  return {
    naam,
    code,
    omschrijving: schoon(invoer.omschrijving),
    standaard_controleur_id: schoon(
      invoer.standaard_controleur_id
    ),
    standaard_controlefrequentie_dagen:
      invoer.standaard_controlefrequentie_dagen,
    actief: invoer.actief,
  };
}

function valideerToewijzing(
  invoer: WoningRayonToewijzingInvoer
): WoningRayonToewijzingInvoer {
  valideerId(invoer.woning_id, "woning");
  valideerId(invoer.rayon_id, "rayon");

  if (!invoer.geldig_vanaf) {
    throw new Error("Ingangsdatum is verplicht.");
  }

  if (
    invoer.controlefrequentie_dagen !== null &&
    (
      !Number.isInteger(
        invoer.controlefrequentie_dagen
      ) ||
      invoer.controlefrequentie_dagen <= 0
    )
  ) {
    throw new Error(
      "De controlefrequentie moet groter zijn dan nul."
    );
  }

  return {
    woning_id: invoer.woning_id,
    rayon_id: invoer.rayon_id,
    standaard_controleur_id: schoon(
      invoer.standaard_controleur_id
    ),
    controlefrequentie_dagen:
      invoer.controlefrequentie_dagen,
    geldig_vanaf: invoer.geldig_vanaf,
    reden: schoon(invoer.reden),
    opmerkingen: schoon(invoer.opmerkingen),
  };
}

export async function getRayons(
  alleenActief = false
): Promise<Rayon[]> {
  const supabase = await createClient();
  let query = supabase
    .from("rayons")
    .select("*")
    .order("actief", {
      ascending: false,
    })
    .order("naam", {
      ascending: true,
    });

  if (alleenActief) {
    query = query.eq("actief", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Rayons ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Rayon[];
}

export async function getActieveProfielen(): Promise<
  ProfielSamenvatting[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, volledige_naam, rol, actief"
    )
    .eq("actief", true)
    .order("volledige_naam", {
      ascending: true,
      nullsFirst: false,
    })
    .order("email", {
      ascending: true,
      nullsFirst: false,
    });

  if (error) {
    throw new Error(
      `Actieve profielen ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as ProfielSamenvatting[];
}

export async function getActieveWoningRayonToewijzing(
  woningId: number
): Promise<WoningRayonToewijzing | null> {
  const supabase = await createClient();
  valideerId(woningId, "woning");

  const { data, error } = await supabase
    .from("woning_rayon_toewijzingen")
    .select("*")
    .eq("woning_id", woningId)
    .eq("actief", true)
    .is("geldig_tot", null)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Actieve rayontoewijzing ophalen mislukt: ${error.message}`
    );
  }

  return data as WoningRayonToewijzing | null;
}

export async function getActieveWoningplanning(
  woningId: number
): Promise<ActieveWoningplanning | null> {
  const supabase = await createClient();
  valideerId(woningId, "woning");

  const { data, error } = await supabase.rpc(
    "get_actieve_woningplanning",
    {
      p_woning_id: woningId,
    }
  );

  if (error) {
    throw new Error(
      `Woningplanning ophalen mislukt: ${error.message}`
    );
  }

  const rij = Array.isArray(data)
    ? data[0] ?? null
    : null;

  return rij as ActieveWoningplanning | null;
}
