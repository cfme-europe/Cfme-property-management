import { supabase } from "@/lib/supabase";
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

export async function createRayon(
  invoer: RayonInvoer
): Promise<Rayon> {
  const geldig = valideerRayonInvoer(invoer);

  const { data, error } = await supabase
    .from("rayons")
    .insert(geldig)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "Er bestaat al een rayon met deze code."
      );
    }

    throw new Error(
      `Rayon opslaan mislukt: ${error.message}`
    );
  }

  return data as Rayon;
}

export async function updateRayon(
  rayonId: number,
  invoer: RayonInvoer
): Promise<Rayon> {
  valideerId(rayonId, "rayon");

  const geldig = valideerRayonInvoer(invoer);

  const { data, error } = await supabase
    .from("rayons")
    .update(geldig)
    .eq("id", rayonId)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "Er bestaat al een rayon met deze code."
      );
    }

    throw new Error(
      `Rayon wijzigen mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Rayon niet gevonden.");
  }

  return data as Rayon;
}

export async function wijsWoningToeAanRayon(
  invoer: WoningRayonToewijzingInvoer
): Promise<WoningRayonToewijzing> {
  const geldig = valideerToewijzing(invoer);

  const { data: huidig, error: huidigeFout } =
    await supabase
      .from("woning_rayon_toewijzingen")
      .select("id")
      .eq("woning_id", geldig.woning_id)
      .eq("actief", true)
      .is("geldig_tot", null)
      .maybeSingle();

  if (huidigeFout) {
    throw new Error(
      `Huidige rayontoewijzing controleren mislukt: ${huidigeFout.message}`
    );
  }

  if (huidig) {
    throw new Error(
      "Deze woning heeft al een actieve rayontoewijzing."
    );
  }

  const { data, error } = await supabase
    .from("woning_rayon_toewijzingen")
    .insert({
      ...geldig,
      actief: true,
      geldig_tot: null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Woning aan rayon toewijzen mislukt: ${error.message}`
    );
  }

  return data as WoningRayonToewijzing;
}

export async function beeindigWoningRayonToewijzing(
  toewijzingId: number,
  woningId: number,
  geldigTot: string
): Promise<WoningRayonToewijzing> {
  valideerId(toewijzingId, "rayontoewijzing");
  valideerId(woningId, "woning");

  if (!geldigTot) {
    throw new Error("Einddatum is verplicht.");
  }

  const { data, error } = await supabase
    .from("woning_rayon_toewijzingen")
    .update({
      actief: false,
      geldig_tot: geldigTot,
    })
    .eq("id", toewijzingId)
    .eq("woning_id", woningId)
    .eq("actief", true)
    .is("geldig_tot", null)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Rayontoewijzing beëindigen mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "Actieve rayontoewijzing niet gevonden."
    );
  }

  return data as WoningRayonToewijzing;
}
