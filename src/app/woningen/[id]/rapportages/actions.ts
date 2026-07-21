"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMaandrapportageById } from "@/services/maandrapportages-server";
import { genereerMaandrapportageData } from "@/services/rapportagegenerator-server";

export async function rapportageSamenstellen(
  rapportageId: number
): Promise<void> {
  if (
    !Number.isInteger(rapportageId) ||
    rapportageId <= 0
  ) {
    throw new Error("Ongeldige maandrapportage.");
  }

  const rapportage =
    await getMaandrapportageById(rapportageId);

  if (!rapportage) {
    throw new Error(
      "Maandrapportage niet gevonden."
    );
  }

  const rapportData =
    await genereerMaandrapportageData(
      rapportage
    );

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("maandrapportages")
    .update({
      rapport_data: rapportData,
    })
    .eq("id", rapportage.id)
    .eq("woning_id", rapportage.woning_id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Rapportgegevens opslaan mislukt: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "Maandrapportage niet gevonden of onvoldoende rechten."
    );
  }

  revalidatePath(
    `/woningen/${rapportage.woning_id}`
  );

  revalidatePath(
    `/woningen/${rapportage.woning_id}/rapportages/${rapportage.id}`
  );
}
