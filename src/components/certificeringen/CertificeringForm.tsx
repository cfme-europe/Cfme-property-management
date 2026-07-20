"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createCertificering,
  updateCertificering,
} from "@/services/certificeringen";
import type {
  Certificering,
  CertificeringInvoer,
  CertificeringType,
} from "@/types/certificering";

type Props = {
  woningId: number;
  certificering?: Certificering;
};

const typeLabels: Record<CertificeringType, string> = {
  scope: "Scope",
  brandblusser: "Brandblusser",
  cv: "CV",
  rookmelder: "Rookmelder",
  overig: "Overige keuring",
};

export default function CertificeringForm({
  woningId,
  certificering,
}: Props) {
  const router = useRouter();

  const [type, setType] = useState<CertificeringType>(
    certificering?.type ?? "scope"
  );
  const [naam, setNaam] = useState(
    certificering?.naam ?? ""
  );
  const [
    installatieOmschrijving,
    setInstallatieOmschrijving,
  ] = useState(
    certificering?.installatie_omschrijving ?? ""
  );
  const [certificaatnummer, setCertificaatnummer] =
    useState(certificering?.certificaatnummer ?? "");
  const [keuringsinstantie, setKeuringsinstantie] =
    useState(certificering?.keuringsinstantie ?? "");
  const [keuringsdatum, setKeuringsdatum] = useState(
    certificering?.keuringsdatum ??
      new Date().toISOString().slice(0, 10)
  );
  const [geldigTot, setGeldigTot] = useState(
    certificering?.geldig_tot ?? ""
  );
  const [waarschuwingsdagen, setWaarschuwingsdagen] =
    useState(
      String(certificering?.waarschuwingsdagen ?? 30)
    );
  const [actief, setActief] = useState(
    certificering?.actief ?? true
  );
  const [ingetrokkenOp, setIngetrokkenOp] = useState(
    certificering?.ingetrokken_op ?? ""
  );
  const [redenInhouding, setRedenInhouding] =
    useState(certificering?.reden_inhouding ?? "");
  const [opmerkingen, setOpmerkingen] = useState(
    certificering?.opmerkingen ?? ""
  );
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const invoerClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600";

  async function opslaan(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setBezig(true);
    setFout("");

    const invoer: CertificeringInvoer = {
      woning_id: woningId,
      type,
      naam,
      installatie_omschrijving:
        installatieOmschrijving,
      certificaatnummer,
      keuringsinstantie,
      keuringsdatum,
      geldig_tot: geldigTot,
      waarschuwingsdagen: Number(
        waarschuwingsdagen
      ),
      actief,
      ingetrokken_op: actief
        ? null
        : ingetrokkenOp,
      reden_inhouding: redenInhouding,
      opmerkingen,
    };

    try {
      if (certificering) {
        await updateCertificering(
          certificering.id,
          invoer
        );
      } else {
        await createCertificering(invoer);
      }

      router.push(`/woningen/${woningId}`);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Certificering opslaan mislukt."
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
            Type *
          </span>

          <select
            value={type}
            onChange={(event) =>
              setType(
                event.target.value as CertificeringType
              )
            }
            className={invoerClass}
          >
            {Object.entries(typeLabels).map(
              ([waarde, label]) => (
                <option key={waarde} value={waarde}>
                  {label}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Naam *
          </span>

          <input
            required
            value={naam}
            onChange={(event) =>
              setNaam(event.target.value)
            }
            className={invoerClass}
            placeholder="Bijvoorbeeld Scope 10-keuring"
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Installatie of object
          </span>

          <input
            value={installatieOmschrijving}
            onChange={(event) =>
              setInstallatieOmschrijving(
                event.target.value
              )
            }
            className={invoerClass}
            placeholder="Bijvoorbeeld cv-ketel zolder"
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Certificaatnummer
          </span>

          <input
            value={certificaatnummer}
            onChange={(event) =>
              setCertificaatnummer(event.target.value)
            }
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Keuringsinstantie
          </span>

          <input
            value={keuringsinstantie}
            onChange={(event) =>
              setKeuringsinstantie(event.target.value)
            }
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Waarschuwing vooraf
          </span>

          <input
            required
            type="number"
            min="0"
            max="365"
            step="1"
            value={waarschuwingsdagen}
            onChange={(event) =>
              setWaarschuwingsdagen(
                event.target.value
              )
            }
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Keuringsdatum *
          </span>

          <input
            required
            type="date"
            value={keuringsdatum}
            onChange={(event) =>
              setKeuringsdatum(event.target.value)
            }
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Geldig tot *
          </span>

          <input
            required
            type="date"
            value={geldigTot}
            min={keuringsdatum}
            onChange={(event) =>
              setGeldigTot(event.target.value)
            }
            className={invoerClass}
          />
        </label>
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
        <input
          type="checkbox"
          checked={actief}
          onChange={(event) =>
            setActief(event.target.checked)
          }
          className="h-5 w-5"
        />

        <span>
          <span className="block font-medium">
            Actieve certificering
          </span>
          <span className="text-sm text-slate-600">
            Schakel uit wanneer de certificering is
            ingetrokken of vervangen.
          </span>
        </span>
      </label>

      {!actief && (
        <div className="grid gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-medium">
              Ingetrokken op *
            </span>

            <input
              required
              type="date"
              value={ingetrokkenOp}
              onChange={(event) =>
                setIngetrokkenOp(event.target.value)
              }
              className={invoerClass}
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Reden
            </span>

            <input
              value={redenInhouding}
              onChange={(event) =>
                setRedenInhouding(event.target.value)
              }
              className={invoerClass}
            />
          </label>
        </div>
      )}

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
          type="submit"
          disabled={bezig}
          className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-60"
        >
          {bezig
            ? "Opslaan..."
            : certificering
              ? "Wijzigingen opslaan"
              : "Certificering opslaan"}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-slate-300 px-5 py-3 font-medium"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
