"use server";

import { revalidatePath } from "next/cache";
import {
  wijzigWoningstatus,
  type WoningStatuswijziging,
} from "@/services/woningarchief-server";

export type WoningStatusActieResultaat = {
  gelukt: boolean;
  fout: string | null;
  bestemming: string | null;
};

export async function woningStatusWijzigen(
  woningId: number,
  wijziging: WoningStatuswijziging,
  _vorigeStatus: WoningStatusActieResultaat,
  formData: FormData,
): Promise<WoningStatusActieResultaat> {
  try {
    const reden = String(formData.get("reden") ?? "");

    await wijzigWoningstatus(woningId, wijziging, reden);

    revalidatePath("/");
    revalidatePath("/woningen");
    revalidatePath("/woningen/archief");
    revalidatePath(`/woningen/${woningId}`);
    revalidatePath("/controleur");
    revalidatePath("/planning/intelligence");
    revalidatePath("/intelligence/predictive");
    revalidatePath("/bedrijven/energieanalyse");

    return {
      gelukt: true,
      fout: null,
      bestemming:
        wijziging === "archiveren"
          ? "/woningen/archief"
          : `/woningen/${woningId}`,
    };
  } catch (error) {
    return {
      gelukt: false,
      fout:
        error instanceof Error
          ? error.message
          : "De woningstatus kon niet worden gewijzigd.",
      bestemming: null,
    };
  }
}
