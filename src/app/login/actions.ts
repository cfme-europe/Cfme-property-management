"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  fout: string;
};

export async function login(
  vorigeState: LoginState,
  formData: FormData
): Promise<LoginState> {
  void vorigeState;

  const emailWaarde =
    formData.get("email");
  const wachtwoordWaarde =
    formData.get("wachtwoord");
  const volgendeWaarde =
    formData.get("volgende");

  const email =
    typeof emailWaarde === "string"
      ? emailWaarde.trim()
      : "";

  const wachtwoord =
    typeof wachtwoordWaarde === "string"
      ? wachtwoordWaarde
      : "";

  const volgende =
    typeof volgendeWaarde === "string" &&
    volgendeWaarde.startsWith("/") &&
    !volgendeWaarde.startsWith("//")
      ? volgendeWaarde
      : "/";

  if (!email || !wachtwoord) {
    return {
      fout: "Vul het e-mailadres en wachtwoord in.",
    };
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password: wachtwoord,
    });

  if (error) {
    return {
      fout:
        "Inloggen mislukt. Controleer het e-mailadres en wachtwoord.",
    };
  }

  redirect(volgende);
}
