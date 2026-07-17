"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  beeindigWoningRayonToewijzing,
  wijsWoningToeAanRayon,
} from "@/services/planning-client";
import type {
  ActieveWoningplanning,
  ProfielSamenvatting,
  Rayon,
  WoningRayonToewijzing,
} from "@/types/planning";

type Props = {
  woningId: number;
  rayons: Rayon[];
  profielen: ProfielSamenvatting[];
  planning: ActieveWoningplanning | null;
  toewijzing: WoningRayonToewijzing | null;
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

export default function WoningPlanningBeheer({
  woningId,
  rayons,
  profielen,
  planning,
  toewijzing,
}: Props) {
  const router = useRouter();

  const [rayonId, setRayonId] = useState("");
  const [controleurId, setControleurId] =
    useState("");
  const [frequentie, setFrequentie] =
    useState("");
  const [geldigVanaf, setGeldigVanaf] =
    useState(
      new Date().toISOString().slice(0, 10)
    );
  const [reden, setReden] = useState("");
  const [opmerkingen, setOpmerkingen] =
    useState("");
  const [einddatum, setEinddatum] =
    useState(
      new Date().toISOString().slice(0, 10)
    );
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const invoerClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 disabled:bg-slate-100";

  async function opslaan(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setBezig(true);
    setFout("");

    try {
      await wijsWoningToeAanRayon({
        woning_id: woningId,
        rayon_id: Number(rayonId),
        standaard_controleur_id:
          controleurId || null,
        controlefrequentie_dagen:
          frequentie.trim() === ""
            ? null
            : Number(frequentie),
        geldig_vanaf: geldigVanaf,
        reden,
        opmerkingen,
      });

      router.push(`/woningen/${woningId}`);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Planning opslaan mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  async function beeindigen() {
    if (!toewijzing) return;

    const bevestigd = window.confirm(
      "De actieve rayontoewijzing beëindigen? De historie blijft behouden."
    );

    if (!bevestigd) return;

    setBezig(true);
    setFout("");

    try {
      await beeindigWoningRayonToewijzing(
        toewijzing.id,
        woningId,
        einddatum
      );

      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Planning beëindigen mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  if (planning && toewijzing) {
    return (
      <div className="space-y-6">
        {fout && (
          <p className="rounded-xl bg-red-100 p-4 text-red-800">
            {fout}
          </p>
        )}

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">
            Actieve planning
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-sm text-slate-500">
                Rayon
              </p>
              <p className="mt-1 font-bold">
                {planning.rayon_naam}
              </p>
              <p className="text-sm text-slate-600">
                {planning.rayon_code}
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-sm text-slate-500">
                Controleur
              </p>
              <p className="mt-1 font-bold">
                {planning.controleur_naam ||
                  planning.controleur_email ||
                  "Niet toegewezen"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-sm text-slate-500">
                Frequentie
              </p>
              <p className="mt-1 font-bold">
                Iedere{" "}
                {planning.controlefrequentie_dagen} dagen
              </p>
            </div>
          </div>

          <div className="mt-6 max-w-sm">
            <label>
              <span className="mb-1 block text-sm font-medium">
                Einddatum *
              </span>

              <input
                required
                type="date"
                min={toewijzing.geldig_vanaf}
                value={einddatum}
                onChange={(event) =>
                  setEinddatum(event.target.value)
                }
                className={invoerClass}
              />
            </label>

            <button
              type="button"
              disabled={bezig}
              onClick={beeindigen}
              className="mt-4 rounded-xl bg-red-700 px-5 py-3 font-medium text-white disabled:opacity-50"
            >
              {bezig
                ? "Beëindigen..."
                : "Rayontoewijzing beëindigen"}
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <form
      onSubmit={opslaan}
      className="space-y-6 rounded-2xl bg-white p-6 shadow"
    >
      <div>
        <h2 className="text-xl font-bold">
          Nieuwe rayontoewijzing
        </h2>

        <p className="mt-1 text-slate-600">
          Koppel de woning aan een actief rayon.
        </p>
      </div>

      {fout && (
        <p className="rounded-xl bg-red-100 p-4 text-red-800">
          {fout}
        </p>
      )}

      {rayons.length === 0 ? (
        <p className="rounded-xl bg-amber-50 p-5 text-amber-900">
          Er zijn nog geen actieve rayons geregistreerd.
        </p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-medium">
                Rayon *
              </span>

              <select
                required
                value={rayonId}
                onChange={(event) =>
                  setRayonId(event.target.value)
                }
                className={invoerClass}
              >
                <option value="">
                  Selecteer een rayon
                </option>

                {rayons.map((rayon) => (
                  <option
                    key={rayon.id}
                    value={rayon.id}
                  >
                    {rayon.naam} — {rayon.code}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium">
                Afwijkende controleur
              </span>

              <select
                value={controleurId}
                onChange={(event) =>
                  setControleurId(event.target.value)
                }
                className={invoerClass}
              >
                <option value="">
                  Standaard van rayon gebruiken
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
                Afwijkende frequentie
              </span>

              <input
                type="number"
                min="1"
                step="1"
                value={frequentie}
                onChange={(event) =>
                  setFrequentie(event.target.value)
                }
                className={invoerClass}
                placeholder="Standaard van rayon gebruiken"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium">
                Ingangsdatum *
              </span>

              <input
                required
                type="date"
                value={geldigVanaf}
                onChange={(event) =>
                  setGeldigVanaf(event.target.value)
                }
                className={invoerClass}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Reden
            </span>

            <input
              value={reden}
              onChange={(event) =>
                setReden(event.target.value)
              }
              className={invoerClass}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Opmerkingen
            </span>

            <textarea
              rows={4}
              value={opmerkingen}
              onChange={(event) =>
                setOpmerkingen(event.target.value)
              }
              className={invoerClass}
            />
          </label>

          <button
            disabled={bezig}
            className="rounded-xl bg-blue-700 px-6 py-3 font-medium text-white disabled:opacity-50"
          >
            {bezig
              ? "Opslaan..."
              : "Rayontoewijzing opslaan"}
          </button>
        </>
      )}
    </form>
  );
}
