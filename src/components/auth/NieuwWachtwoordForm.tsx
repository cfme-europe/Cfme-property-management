"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NieuwWachtwoordForm() {
  const router = useRouter();
  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestiging, setBevestiging] = useState("");
  const [sessieGeldig, setSessieGeldig] =
    useState<boolean | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [melding, setMelding] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let actief = true;

    async function controleerSessie() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (actief) {
        setSessieGeldig(Boolean(session));
      }
    }

    void controleerSessie();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!actief) {
          return;
        }

        if (
          event === "PASSWORD_RECOVERY" ||
          event === "SIGNED_IN"
        ) {
          setSessieGeldig(Boolean(session));
        }
      }
    );

    return () => {
      actief = false;
      subscription.unsubscribe();
    };
  }, []);

  async function wijzigWachtwoord(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setFout("");
    setMelding("");

    if (wachtwoord.length < 12) {
      setFout(
        "Gebruik een wachtwoord van minimaal twaalf tekens."
      );
      return;
    }

    if (wachtwoord !== bevestiging) {
      setFout(
        "De twee ingevoerde wachtwoorden zijn niet gelijk."
      );
      return;
    }

    setBezig(true);

    try {
      const supabase = createClient();

      const { error } =
        await supabase.auth.updateUser({
          password: wachtwoord,
        });

      if (error) {
        console.warn(
          "[CFME Auth] Wachtwoord wijzigen mislukt",
          {
            message: error.message || null,
            code: error.code || null,
          }
        );

        setFout(
          "Het wachtwoord kon niet worden gewijzigd. Vraag zo nodig een nieuwe herstelmail aan."
        );
        return;
      }

      setMelding(
        "Je wachtwoord is gewijzigd. Je wordt doorgestuurd naar de inlogpagina."
      );

      await supabase.auth.signOut();

      window.setTimeout(() => {
        router.replace("/login");
        router.refresh();
      }, 1200);
    } catch {
      setFout(
        "Het wachtwoord kon niet worden gewijzigd. Controleer de verbinding en probeer opnieuw."
      );
    } finally {
      setBezig(false);
    }
  }

  if (sessieGeldig === null) {
    return (
      <p className="mt-8 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
        Herstelsessie controleren...
      </p>
    );
  }

  if (!sessieGeldig) {
    return (
      <div className="mt-8 space-y-4">
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          Deze herstellink is ongeldig of verlopen.
        </p>

        <a
          href="/wachtwoord-vergeten"
          className="inline-flex font-semibold text-emerald-700 hover:text-emerald-600"
        >
          Nieuwe herstelmail aanvragen
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={wijzigWachtwoord}
      className="mt-8 space-y-5"
    >
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Nieuw wachtwoord
        </span>

        <input
          type="password"
          name="wachtwoord"
          value={wachtwoord}
          onChange={(event) =>
            setWachtwoord(event.target.value)
          }
          autoComplete="new-password"
          minLength={12}
          required
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 caret-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Herhaal nieuw wachtwoord
        </span>

        <input
          type="password"
          name="bevestiging"
          value={bevestiging}
          onChange={(event) =>
            setBevestiging(event.target.value)
          }
          autoComplete="new-password"
          minLength={12}
          required
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 caret-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
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
          ? "Wachtwoord wijzigen..."
          : "Nieuw wachtwoord opslaan"}
      </button>
    </form>
  );
}
