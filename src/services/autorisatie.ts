import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function magRapportagebibliotheekBeheren(): Promise<boolean> {
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

  if (error || !data || !data.actief) {
    return false;
  }

  return data.rol === "admin";
}
