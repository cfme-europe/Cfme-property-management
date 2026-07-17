"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createRayon,
  updateRayon,
} from "@/services/planning";
import type {
  ProfielSamenvatting,
  Rayon,
  RayonInvoer,
} from "@/types/planning";

type Props = {
  rayons: Rayon[];
  profielen: ProfielSamenvatting[];
};

function profielNaam(
  profiel: ProfielSamenvatting
): string {
  return (
    profiel.volledige_naam ||
    profiel.email ||
    profiel.id
  );
}

export default function Rayonbeheer({
  rayons,
  profielen,
}: Props) {
  const router = useRouter();

  const [geselecteerd, setGeselecteerd] =
    useState<Rayon | null>(null);
  const [naam, setNaam] = useState("");
  const [code, setCode] = useState("");
  const [omschrijving, setOmschrijving] =
    useState("");
  const [controleurId, setControleurId] =
    useState("");
  const [frequentie, setFrequentie] =
    useState("14");
  const [actief, setActief] = useState(true);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const invoerClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 disabled:bg-slate-100";

  function leegFormulier() {
    setGeselecteerd(null);
    setNaam("");
    setCode("");
    setOmschrijving("");
    setControleurId("");
    setFrequentie("14");
    setActief(true);
    setFout("");
  }

  function bewerk(rayon: Rayon) {
    setGeselecteerd(rayon);
    setNaam(rayon.naam);
    setCode(rayon.code);
    setOmschrijving(rayon.omschrijving ?? "");
    setControleurId(
      rayon.standaard_controleur_id ?? ""
    );
    setFrequentie(
      String(
        rayon.standaard_controlefrequentie_dagen
      )
    );
    setActief(rayon.actief);
    setFout("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function opslaan(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setBezig(true);
    setFout("");

    const invoer: RayonInvoer = {
      naam,
      code,
      omschrijving,
      standaard_controleur_id:
        controleurId || null,
      standaard_controlefrequentie_dagen:
        Number(frequentie),
      actief,
    };

    try {
      if (geselecteerd) {
        await updateRayon(
          geselecteerd.id,
          invoer
        );
      } else {
        await createRayon(invoer);
      }

      leegFormulier();
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Rayon opslaan mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={opslaan}
        className="rounded-2xl bg-white p-6 shadow"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Rayonbeheer
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            {geselecteerd
              ? "Rayon bewerken"
              : "Nieuw rayon"}
          </h2>
        </div>

        {fout && (
          <p className="mt-5 rounded-xl bg-red-100 p-4 text-red-800">
            {fout}
          </p>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-medium">
              Rayonnaam *
            </span>

            <input
              required
              value={naam}
              onChange={(event) =>
                setNaam(event.target.value)
              }
              className={invoerClass}
              placeholder="Bijvoorbeeld Zuid-Limburg"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Rayoncode *
            </span>

            <input
              required
              value={code}
              onChange={(event) =>
                setCode(event.target.value)
              }
              className={invoerClass}
              placeholder="Bijvoorbeeld ZL"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Standaardcontroleur
            </span>

            <select
              value={controleurId}
              onChange={(event) =>
                setControleurId(event.target.value)
              }
              className={invoerClass}
            >
              <option value="">
                Geen standaardcontroleur
              </option>

              {profielen.map((profiel) => (
                <option
                  key={profiel.id}
                  value={profiel.id}
                >
                  {profielNaam(profiel)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Controlefrequentie in dagen *
            </span>

            <input
              required
              type="number"
              min="1"
              step="1"
              value={frequentie}
              onChange={(event) =>
                setFrequentie(event.target.value)
              }
              className={invoerClass}
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium">
            Omschrijving
          </span>

          <textarea
            rows={4}
            value={omschrijving}
            onChange={(event) =>
              setOmschrijving(event.target.value)
            }
            className={invoerClass}
          />
        </label>

        <label className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            checked={actief}
            onChange={(event) =>
              setActief(event.target.checked)
            }
            className="h-5 w-5"
          />

          <span className="font-medium">
            Rayon is actief
          </span>
        </label>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            disabled={bezig}
            className="rounded-xl bg-blue-700 px-6 py-3 font-medium text-white disabled:opacity-50"
          >
            {bezig
              ? "Opslaan..."
              : geselecteerd
                ? "Wijzigingen opslaan"
                : "Rayon toevoegen"}
          </button>

          {geselecteerd && (
            <button
              type="button"
              onClick={leegFormulier}
              className="rounded-xl border border-slate-300 px-6 py-3 font-medium"
            >
              Annuleren
            </button>
          )}
        </div>
      </form>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold">
          Geregistreerde rayons
        </h2>

        <p className="mt-1 text-slate-600">
          Beheer standaardcontroleurs en controlefrequenties.
        </p>

        {rayons.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-100 p-5 text-slate-600">
            Nog geen rayons geregistreerd.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead className="border-b bg-slate-100">
                <tr>
                  <th className="p-4 text-left">
                    Rayon
                  </th>
                  <th className="p-4 text-left">
                    Code
                  </th>
                  <th className="p-4 text-left">
                    Frequentie
                  </th>
                  <th className="p-4 text-left">
                    Status
                  </th>
                  <th className="p-4 text-right">
                    Actie
                  </th>
                </tr>
              </thead>

              <tbody>
                {rayons.map((rayon) => (
                  <tr
                    key={rayon.id}
                    className="border-b border-slate-200 last:border-0"
                  >
                    <td className="p-4">
                      <p className="font-semibold">
                        {rayon.naam}
                      </p>

                      {rayon.omschrijving && (
                        <p className="mt-1 text-sm text-slate-600">
                          {rayon.omschrijving}
                        </p>
                      )}
                    </td>

                    <td className="p-4">
                      {rayon.code}
                    </td>

                    <td className="p-4">
                      Iedere{" "}
                      {
                        rayon.standaard_controlefrequentie_dagen
                      }{" "}
                      dagen
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          rayon.actief
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {rayon.actief
                          ? "Actief"
                          : "Inactief"}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => bewerk(rayon)}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
                      >
                        Bewerken
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
