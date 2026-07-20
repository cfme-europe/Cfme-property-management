"use client";

import { useActionState } from "react";
import {
  wijzigGebruiker,
  type GebruikerWijzigenState,
} from "@/app/beheer/gebruikers/actions";
import type { Gebruikersprofiel } from "@/types/gebruiker";

type Props = {
  profiel: Gebruikersprofiel;
  eigenGebruikerId: string;
};

const beginState: GebruikerWijzigenState = {
  fout: "",
  succes: "",
};

export default function GebruikerBeheerForm({
  profiel,
  eigenGebruikerId,
}: Props) {
  const [state, action, bezig] = useActionState(
    wijzigGebruiker,
    beginState
  );

  const eigenProfiel =
    profiel.id === eigenGebruikerId;

  return (
    <form
      action={action}
      className="rounded-xl border border-slate-300 p-4"
    >
      <input
        type="hidden"
        name="id"
        value={profiel.id}
      />

      <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
        <div>
          <p className="font-semibold text-slate-950">
            {profiel.volledige_naam ||
              profiel.email ||
              "Naamloos profiel"}
          </p>

          <p className="mt-1 text-sm text-slate-600">
            {profiel.email ?? "Geen e-mailadres"}
          </p>

          {eigenProfiel && (
            <p className="mt-1 text-xs font-medium text-emerald-700">
              Eigen account
            </p>
          )}
        </div>

        <label className="grid gap-1 text-sm font-medium">
          Rol
          <select
            name="rol"
            defaultValue={profiel.rol}
            disabled={eigenProfiel}
            className="rounded-xl border border-slate-300 bg-white px-3 py-3 disabled:bg-slate-100"
          >
            <option value="admin">Admin</option>
            <option value="medewerker">
              Medewerker
            </option>
            <option value="planner">Planner</option>
            <option value="controleur">
              Controleur
            </option>
            <option value="administratie">
              Administratie
            </option>
            <option value="management">
              Management
            </option>
            <option value="lezen">
              Alleen lezen
            </option>
          </select>

          {eigenProfiel && (
            <input
              type="hidden"
              name="rol"
              value="admin"
            />
          )}
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="actief"
              defaultChecked={profiel.actief}
              disabled={eigenProfiel}
              className="h-5 w-5"
            />
            Actief
          </label>

          {eigenProfiel && (
            <input
              type="hidden"
              name="actief"
              value="on"
            />
          )}

          <button
            type="submit"
            disabled={bezig}
            className="rounded-xl bg-emerald-700 px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {bezig ? "Opslaan..." : "Opslaan"}
          </button>
        </div>
      </div>

      {state.fout && (
        <p className="mt-3 text-sm text-red-700">
          {state.fout}
        </p>
      )}

      {state.succes && (
        <p className="mt-3 text-sm text-emerald-700">
          {state.succes}
        </p>
      )}
    </form>
  );
}
