"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createMaandrapportage,
  updateMaandrapportage,
} from "@/services/maandrapportages";
import type {
  Maandrapportage,
  MaandrapportageInvoer,
  MaandrapportageStatus,
} from "@/types/maandrapportage";

type Props = {
  woningId: number;
  verhuurperiodeId: number | null;
  standaardOntvangerNaam?: string;
  standaardOntvangerEmail?: string;
  rapportage?: Maandrapportage;
};

const maanden = [
  "Januari",
  "Februari",
  "Maart",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Augustus",
  "September",
  "Oktober",
  "November",
  "December",
];

export default function MaandrapportageForm({
  woningId,
  verhuurperiodeId,
  standaardOntvangerNaam = "",
  standaardOntvangerEmail = "",
  rapportage,
}: Props) {
  const router = useRouter();
  const vandaag = new Date();

  const [rapportjaar, setRapportjaar] = useState(
    String(rapportage?.rapportjaar ?? vandaag.getFullYear())
  );
  const [rapportmaand, setRapportmaand] = useState(
    String(rapportage?.rapportmaand ?? vandaag.getMonth() + 1)
  );
  const [titel, setTitel] = useState(
    rapportage?.titel ??
      `Maandrapportage ${maanden[vandaag.getMonth()]} ${vandaag.getFullYear()}`
  );
  const [status, setStatus] =
    useState<MaandrapportageStatus>(
      rapportage?.status ?? "concept"
    );
  const [ontvangerNaam, setOntvangerNaam] = useState(
    rapportage?.ontvanger_naam ??
      standaardOntvangerNaam
  );
  const [ontvangerEmail, setOntvangerEmail] = useState(
    rapportage?.ontvanger_email ??
      standaardOntvangerEmail
  );
  const [opmerkingen, setOpmerkingen] = useState(
    rapportage?.opmerkingen ?? ""
  );
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const invoerClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600";

  function wijzigPeriode(
    jaar: string,
    maand: string
  ) {
    setRapportjaar(jaar);
    setRapportmaand(maand);

    if (!rapportage) {
      const maandNummer = Number(maand);
      const maandNaam =
        maanden[maandNummer - 1] ?? "";

      setTitel(
        `Maandrapportage ${maandNaam} ${jaar}`
      );
    }
  }

  async function opslaan(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setBezig(true);
    setFout("");

    const invoer: MaandrapportageInvoer = {
      woning_id: woningId,
      verhuurperiode_id: verhuurperiodeId,
      rapportjaar: Number(rapportjaar),
      rapportmaand: Number(rapportmaand),
      titel,
      status,
      ontvanger_naam: ontvangerNaam,
      ontvanger_email: ontvangerEmail,
      opmerkingen,
      rapport_data: rapportage?.rapport_data ?? {},
    };

    try {
      const opgeslagen = rapportage
        ? await updateMaandrapportage(
            rapportage.id,
            invoer
          )
        : await createMaandrapportage(invoer);

      router.push(
        `/woningen/${woningId}/rapportages/${opgeslagen.id}`
      );
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Maandrapportage opslaan mislukt."
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
            Rapportjaar *
          </span>

          <input
            required
            type="number"
            min="2000"
            max="2100"
            value={rapportjaar}
            onChange={(event) =>
              wijzigPeriode(
                event.target.value,
                rapportmaand
              )
            }
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Rapportmaand *
          </span>

          <select
            value={rapportmaand}
            onChange={(event) =>
              wijzigPeriode(
                rapportjaar,
                event.target.value
              )
            }
            className={invoerClass}
          >
            {maanden.map((maand, index) => (
              <option
                key={maand}
                value={index + 1}
              >
                {maand}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Status *
          </span>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target
                  .value as MaandrapportageStatus
              )
            }
            className={invoerClass}
          >
            <option value="concept">Concept</option>
            <option value="definitief">
              Definitief
            </option>
            <option value="verzonden">
              Verzonden
            </option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Rapporttitel *
        </span>

        <input
          required
          value={titel}
          onChange={(event) =>
            setTitel(event.target.value)
          }
          className={invoerClass}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium">
            Ontvanger
          </span>

          <input
            value={ontvangerNaam}
            onChange={(event) =>
              setOntvangerNaam(event.target.value)
            }
            className={invoerClass}
            placeholder="Bedrijf of contactpersoon"
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            E-mailadres ontvanger
          </span>

          <input
            type="email"
            value={ontvangerEmail}
            onChange={(event) =>
              setOntvangerEmail(event.target.value)
            }
            className={invoerClass}
            placeholder="rapportage@bedrijf.nl"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Interne opmerkingen
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
            : rapportage
              ? "Wijzigingen opslaan"
              : "Rapportage aanmaken"}
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
