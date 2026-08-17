import "server-only";

import {
  rolMagGebruikersBeheren,
} from "@/lib/auth/rollen";
import { createClient } from "@/lib/supabase/server";
import type {
  Gebruikersprofiel,
  Gebruikersrol,
} from "@/types/gebruiker";

const toegestaneRollen: Gebruikersrol[] = [
  "admin",
  "medewerker",
  "planner",
  "controleur",
  "administratie",
  "management",
  "lezen",
];

type SupabaseServerClient =
  Awaited<ReturnType<typeof createClient>>;

type HuidigeGebruikersbeheerder = {
  supabase: SupabaseServerClient;
  id: string;
  rol: Gebruikersrol;
};

function isGebruikersrol(
  waarde: string
): waarde is Gebruikersrol {
  return toegestaneRollen.includes(
    waarde as Gebruikersrol
  );
}

async function getHuidigeGebruikersbeheerder():
  Promise<HuidigeGebruikersbeheerder | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: gebruikerFout,
  } = await supabase.auth.getUser();

  if (gebruikerFout || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("rol, actief")
    .eq("id", user.id)
    .maybeSingle();

  if (
    error ||
    !data?.actief ||
    !rolMagGebruikersBeheren(data.rol)
  ) {
    return null;
  }

  return {
    supabase,
    id: user.id,
    rol: data.rol,
  };
}

export async function huidigeGebruikerMagGebruikersBeheren():
  Promise<boolean> {
  return Boolean(
    await getHuidigeGebruikersbeheerder()
  );
}

export async function getGebruikersprofielen(): Promise<
  Gebruikersprofiel[]
> {
  const beheerder =
    await getHuidigeGebruikersbeheerder();

  if (!beheerder) {
    throw new Error(
      "Alleen admin of management mag gebruikers beheren."
    );
  }

  const { data, error } = await beheerder.supabase
    .from("profiles")
    .select(
      "id, created_at, updated_at, email, volledige_naam, rol, actief"
    )
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
      `Gebruikersprofielen ophalen mislukt: ${error.message}`
    );
  }

  return (data ?? []) as Gebruikersprofiel[];
}

export async function wijzigGebruikersprofiel(
  id: string,
  rol: string,
  actief: boolean
): Promise<void> {
  const profielId = id.trim();

  if (!profielId) {
    throw new Error("Gebruikers-ID ontbreekt.");
  }

  if (!isGebruikersrol(rol)) {
    throw new Error("Ongeldige gebruikersrol.");
  }

  const beheerder =
    await getHuidigeGebruikersbeheerder();

  if (!beheerder) {
    throw new Error(
      "Alleen admin of management mag gebruikers beheren."
    );
  }

  if (
    beheerder.id === profielId &&
    !actief
  ) {
    throw new Error(
      "Je kunt je eigen account niet deactiveren."
    );
  }

  if (
    beheerder.id === profielId &&
    rol !== beheerder.rol
  ) {
    throw new Error(
      "Je kunt je eigen rol niet wijzigen."
    );
  }

  const { error } = await beheerder.supabase
    .from("profiles")
    .update({
      rol,
      actief,
    })
    .eq("id", profielId);

  if (error) {
    throw new Error(
      `Gebruikersprofiel wijzigen mislukt: ${error.message}`
    );
  }
}
