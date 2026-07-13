"use client";

import { useActionState } from "react";
import {
  login,
  type LoginState,
} from "@/app/login/actions";

type Props = {
  volgende: string;
};

const beginState: LoginState = {
  fout: "",
};

export default function LoginForm({
  volgende,
}: Props) {
  const [state, formAction, bezig] =
    useActionState(login, beginState);

  return (
    <form
      action={formAction}
      className="mt-8 space-y-5"
    >
      <input
        type="hidden"
        name="volgende"
        value={volgende}
      />

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          E-mailadres
        </span>

        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          autoFocus
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Wachtwoord
        </span>

        <input
          type="password"
          name="wachtwoord"
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        />
      </label>

      {state.fout && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {state.fout}
        </p>
      )}

      <button
        type="submit"
        disabled={bezig}
        className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {bezig
          ? "Bezig met inloggen..."
          : "Inloggen"}
      </button>
    </form>
  );
}
