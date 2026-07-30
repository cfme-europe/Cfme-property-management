"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function WachtwoordVergetenForm() {
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState("");
  const [fout, setFout] = useState("");

  async function verstuurHerstelmail(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setBezig(true);
    setMelding("");
    setFout("");

    try {
      const supabase = createClient();
      const redirectTo =
        `${window.location.origin}/auth/herstel`;

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo }
        );

      if (error) {
        console.warn(
          "[CFME Auth] Herstelmail aanvragen mislukt",
          {
            message: error.message || null,
            code: error.code || null,
          }
        );

        setFout(
          "De aanvraag kon niet worden verwerkt. Probeer het later opnieuw."
        );
        return;
      }

      setMelding(
        "Als dit e-mailadres bij CFME Control bekend is, ontvang je een herstelmail. Controleer ook de map met ongewenste e-mail."
      );
    } catch {
      setFout(
        "De aanvraag kon niet worden verwerkt. Controleer de verbinding en probeer opnieuw."
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <form
      onSubmit={verstuurHerstelmail}
      className="mt-8 space-y-5"
    >
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          E-mailadres
        </span>

        <input
          type="email"
          name="email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          autoComplete="email"
          required
          autoFocus
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 caret-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        />
      </label>

      {fout && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {fout}
        </p>
      )}

      {melding && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          {melding}
        </p>
      )}

      <button
        type="submit"
        disabled={bezig}
        className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {bezig
          ? "Herstelmail aanvragen..."
          : "Stuur herstelmail"}
      </button>
    </form>
  );
}
