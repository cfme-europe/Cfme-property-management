import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Woning } from "@/types/woning";

export type WoningStatuswijziging = "archiveren" | "heractiveren";

export async function wijzigWoningstatus(
  woningId: number,
  wijziging: WoningStatuswijziging,
  reden: string,
): Promise<Woning> {
  if (!Number.isInteger(woningId) || woningId <= 0) {
    throw new Error("Ongeldige woning.");
  }

  const opgeschoondeReden = reden.trim();

  if (
    opgeschoondeReden.length < 5 ||
    opgeschoondeReden.length > 1000
  ) {
    throw new Error(
      "De reden moet tussen 5 en 1000 tekens bevatten.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: gebruikerFout,
  } = await supabase.auth.getUser();

  if (gebruikerFout || !user) {
    throw new Error("Je sessie is verlopen. Log opnieuw in.");
  }

  const functienaam =
    wijziging === "archiveren"
      ? "archiveer_woning"
      : "heractiveer_woning";

  const { data, error } = await supabase.rpc(functienaam, {
    p_woning_id: woningId,
    p_reden: opgeschoondeReden,
  });

  if (error) {
    throw new Error(
      `Woning ${wijziging} mislukt: ${error.message}`,
    );
  }

  const woning = Array.isArray(data) ? data[0] : data;

  if (!woning) {
    throw new Error("De woningstatus is niet gewijzigd.");
  }

  return woning as Woning;
}
