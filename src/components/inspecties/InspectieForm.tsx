"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createInspectie,
  updateInspectie,
} from "@/services/inspecties";
import type {
  AlgemeneToestand,
  Inspectie,
  InspectieInvoer,
  InspectieStatus,
  InspectieType,
} from "@/types/inspectie";

type Props = {
  woningId: number;
  verhuurperiodeId: number | null;
  inspectie?: Inspectie;
};

export default function InspectieForm({
  woningId,
  verhuurperiodeId,
  inspectie,
}: Props) {
  const router = useRouter();

  const [type, setType] = useState<InspectieType>(
    inspectie?.type ?? "periodiek"
  );
  const [inspectiedatum, setInspectiedatum] = useState(
    inspectie?.inspectiedatum ??
      new Date().toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<InspectieStatus>(
    inspectie?.status ?? "open"
  );
  const [algemeneToestand, setAlgemeneToestand] =
    useState<AlgemeneToestand>(
      inspectie?.algemene_toestand ?? "goed"
    );
  const [ordeNetheidScore, setOrdeNetheidScore] = useState(
    String(inspectie?.orde_netheid_score ?? 3)
  );
  const [schadeAanwezig, setSchadeAanwezig] = useState(
    inspectie?.schade_aanwezig ?? false
  );
  const [schadeOmschrijving, setSchadeOmschrijving] =
    useState(inspectie?.schade_omschrijving ?? "");
  const [uitgevoerdDoor, setUitgevoerdDoor] = useState(
    inspectie?.uitgevoerd_door ?? ""
  );
  const [opmerkingen, setOpmerkingen] = useState(
    inspectie?.opmerkingen ?? ""
  );
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const invoerClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 disabled:bg-slate-100";

  function wijzigSchadeAanwezig(waarde: boolean) {
    setSchadeAanwezig(waarde);

    if (!waarde) {
      setSchadeOmschrijving("");
    }
  }

  async function opslaan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBezig(true);
    setFout("");

    const invoer: InspectieInvoer = {
      woning_id: woningId,
      verhuurperiode_id: verhuurperiodeId,
      type,
      inspectiedatum,
      status,
      algemene_toestand: algemeneToestand,
      orde_netheid_score: Number(ordeNetheidScore),
      schade_aanwezig: schadeAanwezig,
      schade_omschrijving: schadeOmschrijving,
      uitgevoerd_door: uitgevoerdDoor,
      opmerkingen,
    };

    try {
      if (inspectie) {
        await updateInspectie(inspectie.id, invoer);
      } else {
        await createInspectie(invoer);
      }

      router.push(`/woningen/${woningId}`);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Inspectie opslaan mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <form onSubmit={opslaan} className="space-y-6">
      {fout && (
        <div className="rounded-xl bg-red-100 p-4 text-red-800">
          {fout}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <label>
          <span className="mb-1 block text-sm font-medium">
            Inspectietype *
          </span>

          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value as InspectieType)
            }
            className={invoerClass}
          >
            <option value="begininspectie">
              Begininspectie
            </option>
            <option value="periodiek">
              Periodieke inspectie
            </option>
            <option value="eindinspectie">
              Eindinspectie
            </option>
            <option value="incident">
              Incidentinspectie
            </option>
          </select>
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Inspectiedatum *
          </span>

          <input
            required
            type="date"
            value={inspectiedatum}
            onChange={(event) =>
              setInspectiedatum(event.target.value)
            }
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Status *
          </span>

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as InspectieStatus)
            }
            className={invoerClass}
          >
            <option value="open">Open</option>
            <option value="afgerond">Afgerond</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label>
          <span className="mb-1 block text-sm font-medium">
            Algemene toestand *
          </span>

          <select
            value={algemeneToestand}
            onChange={(event) =>
              setAlgemeneToestand(
                event.target.value as AlgemeneToestand
              )
            }
            className={invoerClass}
          >
            <option value="goed">Goed</option>
            <option value="aandacht_nodig">
              Aandacht nodig
            </option>
            <option value="slecht">Slecht</option>
          </select>
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Orde en netheid *
          </span>

          <select
            value={ordeNetheidScore}
            onChange={(event) =>
              setOrdeNetheidScore(event.target.value)
            }
            className={invoerClass}
          >
            <option value="1">1 — Zeer slecht</option>
            <option value="2">2 — Slecht</option>
            <option value="3">3 — Voldoende</option>
            <option value="4">4 — Goed</option>
            <option value="5">5 — Zeer goed</option>
          </select>
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Uitgevoerd door
          </span>

          <input
            value={uitgevoerdDoor}
            onChange={(event) =>
              setUitgevoerdDoor(event.target.value)
            }
            className={invoerClass}
            placeholder="Naam inspecteur"
          />
        </label>
      </div>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold">Schade</h2>

        <div className="mt-4 flex flex-wrap gap-6">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="schade"
              checked={!schadeAanwezig}
              onChange={() => wijzigSchadeAanwezig(false)}
              className="h-5 w-5"
            />
            <span>Geen schade aangetroffen</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="schade"
              checked={schadeAanwezig}
              onChange={() => wijzigSchadeAanwezig(true)}
              className="h-5 w-5"
            />
            <span>Schade aangetroffen</span>
          </label>
        </div>

        {schadeAanwezig && (
          <label className="mt-5 block">
            <span className="mb-1 block text-sm font-medium">
              Schadeomschrijving *
            </span>

            <textarea
              required
              rows={5}
              value={schadeOmschrijving}
              onChange={(event) =>
                setSchadeOmschrijving(event.target.value)
              }
              className={invoerClass}
              placeholder="Beschrijf de locatie, aard en omvang van de schade."
            />
          </label>
        )}
      </section>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Algemene opmerkingen
        </span>

        <textarea
          rows={6}
          value={opmerkingen}
          onChange={(event) =>
            setOpmerkingen(event.target.value)
          }
          className={invoerClass}
          placeholder="Aanvullende bevindingen en aandachtspunten."
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          disabled={bezig}
          className="rounded-xl bg-emerald-700 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {bezig
            ? "Opslaan..."
            : inspectie
              ? "Wijzigingen opslaan"
              : "Inspectie opslaan"}
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(`/woningen/${woningId}`)
          }
          className="rounded-xl border border-slate-300 px-6 py-3 font-medium"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
