import "server-only";

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

function isGebruikersrol(
  waarde: string
): waarde is Gebruikersrol {
  return toegestaneRollen.includes(
    waarde as Gebruikersrol
  );
}

export async function huidigeGebruikerIsAdmin(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
    error: gebruikerFout,
  } = await supabase.auth.getUser();

  if (gebruikerFout || !user) {
    return false;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("rol, actief")
    .eq("id", user.id)
    .maybeSingle();

  return Boolean(
    !error &&
      data?.actief &&
      data.rol === "admin"
  );
}

export async function getGebruikersprofielen(): Promise<
  Gebruikersprofiel[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
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

  const supabase = await createClient();

  const {
    data: { user },
    error: gebruikerFout,
  } = await supabase.auth.getUser();

  if (gebruikerFout || !user) {
    throw new Error(
      "Geen aangemelde gebruiker gevonden."
    );
  }

  if (user.id === profielId && !actief) {
    throw new Error(
      "Je kunt je eigen account niet deactiveren."
    );
  }

  if (
    user.id === profielId &&
    rol !== "admin"
  ) {
    throw new Error(
      "Je kunt je eigen adminrol niet verwijderen."
    );
  }

  const { error } = await supabase
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
