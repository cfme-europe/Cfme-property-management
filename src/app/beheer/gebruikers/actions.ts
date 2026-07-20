"use server";

import { revalidatePath } from "next/cache";
import {
  huidigeGebruikerIsAdmin,
  wijzigGebruikersprofiel,
} from "@/services/gebruikersbeheer";

export type GebruikerWijzigenState = {
  fout: string;
  succes: string;
};

export async function wijzigGebruiker(
  vorigeState: GebruikerWijzigenState,
  formData: FormData
): Promise<GebruikerWijzigenState> {
  void vorigeState;

  if (!(await huidigeGebruikerIsAdmin())) {
    return {
      fout: "Alleen een admin mag gebruikers beheren.",
      succes: "",
    };
  }

  const idWaarde = formData.get("id");
  const rolWaarde = formData.get("rol");
  const actiefWaarde = formData.get("actief");

  const id =
    typeof idWaarde === "string"
      ? idWaarde
      : "";

  const rol =
    typeof rolWaarde === "string"
      ? rolWaarde
      : "";

  try {
    await wijzigGebruikersprofiel(
      id,
      rol,
      actiefWaarde === "on"
    );

    revalidatePath("/beheer/gebruikers");

    return {
      fout: "",
      succes: "Gebruiker bijgewerkt.",
    };
  } catch (error) {
    return {
      fout:
        error instanceof Error
          ? error.message
          : "Gebruiker bijwerken mislukt.",
      succes: "",
    };
  }
}
