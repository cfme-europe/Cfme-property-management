"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createBewoner,
  updateBewoner,
} from "@/services/bewoners";
import type {
  Bewoner,
  BewonerInvoer,
  BewonerStatus,
} from "@/types/bewoner";
import type { Huurder } from "@/types/huurder";
import type { Kamer } from "@/types/kamer";

type Props = {
  woningId: number;
  verhuurperiodeId: number;
  huurders: Huurder[];
  kamers: Kamer[];
  bewoner?: Bewoner;
};

function huurderNaam(huurder: Huurder): string {
  return [
    huurder.voornaam,
    huurder.tussenvoegsel,
    huurder.achternaam,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function BewonerForm({
  woningId,
  verhuurperiodeId,
  huurders,
  kamers,
  bewoner,
}: Props) {
  const router = useRouter();

  const [huurderId, setHuurderId] = useState(
    bewoner?.huurder_id ? String(bewoner.huurder_id) : ""
  );
  const [kamerId, setKamerId] = useState(
    bewoner?.kamer_id ? String(bewoner.kamer_id) : ""
  );
  const [voornaam, setVoornaam] = useState(
    bewoner?.voornaam ?? ""
  );
  const [tussenvoegsel, setTussenvoegsel] = useState(
    bewoner?.tussenvoegsel ?? ""
  );
  const [achternaam, setAchternaam] = useState(
    bewoner?.achternaam ?? ""
  );
  const [incheckdatum, setIncheckdatum] = useState(
    bewoner?.incheckdatum ?? ""
  );
  const [uitcheckdatum, setUitcheckdatum] = useState(
    bewoner?.uitcheckdatum ?? ""
  );
  const [status, setStatus] = useState<BewonerStatus>(
    bewoner?.status ?? "actief"
  );
  const [opmerkingen, setOpmerkingen] = useState(
    bewoner?.opmerkingen ?? ""
  );
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const invoerClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 disabled:bg-slate-100";

  function wijzigHuurder(waarde: string) {
    setHuurderId(waarde);

    const huurder = huurders.find(
      (item) => item.id === Number(waarde)
    );

    if (!huurder) return;

    setVoornaam(huurder.voornaam);
    setTussenvoegsel(huurder.tussenvoegsel ?? "");
    setAchternaam(huurder.achternaam);
  }

  function wijzigStatus(nieuweStatus: BewonerStatus) {
    setStatus(nieuweStatus);

    if (nieuweStatus === "actief") {
      setUitcheckdatum("");
    }
  }

  async function opslaan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBezig(true);
    setFout("");

    const invoer: BewonerInvoer = {
      verhuurperiode_id: verhuurperiodeId,
      huurder_id: huurderId ? Number(huurderId) : null,
      kamer_id: kamerId ? Number(kamerId) : null,
      voornaam,
      tussenvoegsel,
      achternaam,
      incheckdatum,
      uitcheckdatum,
      status,
      opmerkingen,
    };

    try {
      if (bewoner) {
        await updateBewoner(bewoner.id, invoer);
      } else {
        await createBewoner(invoer);
      }

      router.push(`/woningen/${woningId}`);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Bewoner opslaan mislukt."
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

      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium">
            Gekoppelde huurder
          </span>

          <select
            value={huurderId}
            onChange={(event) =>
              wijzigHuurder(event.target.value)
            }
            className={invoerClass}
          >
            <option value="">Geen huurder gekoppeld</option>

            {huurders.map((huurder) => (
              <option key={huurder.id} value={huurder.id}>
                {huurderNaam(huurder)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Kamer
          </span>

          <select
            value={kamerId}
            onChange={(event) => setKamerId(event.target.value)}
            className={invoerClass}
          >
            <option value="">Geen kamer toegewezen</option>

            {kamers
              .filter(
                (kamer) =>
                  kamer.actief || kamer.id === bewoner?.kamer_id
              )
              .map((kamer) => (
                <option key={kamer.id} value={kamer.id}>
                  {kamer.naam} — capaciteit {kamer.capaciteit}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label>
          <span className="mb-1 block text-sm font-medium">
            Voornaam *
          </span>

          <input
            required
            value={voornaam}
            onChange={(event) => setVoornaam(event.target.value)}
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Tussenvoegsel
          </span>

          <input
            value={tussenvoegsel}
            onChange={(event) =>
              setTussenvoegsel(event.target.value)
            }
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Achternaam *
          </span>

          <input
            required
            value={achternaam}
            onChange={(event) => setAchternaam(event.target.value)}
            className={invoerClass}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label>
          <span className="mb-1 block text-sm font-medium">
            Incheckdatum *
          </span>

          <input
            required
            type="date"
            value={incheckdatum}
            onChange={(event) =>
              setIncheckdatum(event.target.value)
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
              wijzigStatus(
                event.target.value as BewonerStatus
              )
            }
            className={invoerClass}
          >
            <option value="actief">Actief</option>
            <option value="uitgecheckt">Uitgecheckt</option>
          </select>
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Uitcheckdatum
          </span>

          <input
            type="date"
            min={incheckdatum || undefined}
            required={status === "uitgecheckt"}
            disabled={status === "actief"}
            value={
              status === "actief" ? "" : uitcheckdatum
            }
            onChange={(event) =>
              setUitcheckdatum(event.target.value)
            }
            className={invoerClass}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Opmerkingen
        </span>

        <textarea
          rows={5}
          value={opmerkingen}
          onChange={(event) =>
            setOpmerkingen(event.target.value)
          }
          className={invoerClass}
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          disabled={bezig}
          className="rounded-xl bg-emerald-700 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {bezig
            ? "Opslaan..."
            : bewoner
              ? "Wijzigingen opslaan"
              : "Bewoner toevoegen"}
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
