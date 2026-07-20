"use client";

import { useRef, useState, type FormEvent } from "react";
import { taakOpslaan } from "@/app/woningen/[id]/taken/actions";
import type {
  Taak,
  TaakCategorie,
  TaakInvoer,
  TaakPrioriteit,
  TaakStatus,
} from "@/types/taak";

type Props = {
  woningId: number;
  taak?: Taak;
};

const categorieLabels: Record<TaakCategorie, string> = {
  inspectie: "Inspectie",
  schade: "Schade",
  onderhoud: "Onderhoud",
  veiligheid: "Veiligheid",
  schoonmaak: "Schoonmaak",
  installatie: "Installatie",
  administratie: "Administratie",
  overig: "Overig",
};

const prioriteitLabels: Record<TaakPrioriteit, string> = {
  laag: "Laag",
  normaal: "Normaal",
  hoog: "Hoog",
  spoed: "Spoed",
};

const statusLabels: Record<TaakStatus, string> = {
  open: "Open",
  in_behandeling: "In behandeling",
  afgerond: "Afgerond",
  geannuleerd: "Geannuleerd",
};

function leegNaarNull(waarde: string): string | null {
  const schoon = waarde.trim();
  return schoon || null;
}

export default function TaakForm({
  woningId,
  taak,
}: Props) {
  const verzendingActief = useRef(false);

  const [titel, setTitel] = useState(taak?.titel ?? "");
  const [omschrijving, setOmschrijving] = useState(
    taak?.omschrijving ?? ""
  );
  const [categorie, setCategorie] =
    useState<TaakCategorie>(
      taak?.categorie ?? "overig"
    );
  const [prioriteit, setPrioriteit] =
    useState<TaakPrioriteit>(
      taak?.prioriteit ?? "normaal"
    );
  const [status, setStatus] = useState<TaakStatus>(
    taak?.status ?? "open"
  );
  const [startdatum, setStartdatum] = useState(
    taak?.startdatum ?? ""
  );
  const [deadline, setDeadline] = useState(
    taak?.deadline ?? ""
  );
  const [toegewezenAan, setToegewezenAan] = useState(
    taak?.toegewezen_aan ?? ""
  );
  const [externeReferentie, setExterneReferentie] =
    useState(taak?.externe_referentie ?? "");
  const [opmerkingen, setOpmerkingen] = useState(
    taak?.opmerkingen ?? ""
  );
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const invoerClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600";

  async function opslaan(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (verzendingActief.current) {
      return;
    }

    verzendingActief.current = true;
    setBezig(true);
    setFout("");

    const invoer: TaakInvoer = {
      woning_id: woningId,
      inspectie_id: taak?.inspectie_id ?? null,
      melding_id: taak?.melding_id ?? null,
      titel,
      omschrijving: leegNaarNull(omschrijving),
      categorie,
      prioriteit,
      status,
      startdatum: leegNaarNull(startdatum),
      deadline: leegNaarNull(deadline),
      afgerond_op:
        status === "afgerond"
          ? taak?.afgerond_op ??
            new Date().toISOString().slice(0, 10)
          : null,
      toegewezen_aan: leegNaarNull(toegewezenAan),
      externe_referentie:
        leegNaarNull(externeReferentie),
      opmerkingen: leegNaarNull(opmerkingen),
    };

    try {
      await taakOpslaan(taak?.id ?? null, invoer);
      window.location.replace(`/woningen/${woningId}`);
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Taak opslaan mislukt."
      );
    } finally {
      verzendingActief.current = false;
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

      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Titel *
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

      <label className="block">
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

      <div className="grid gap-4 md:grid-cols-3">
        <label>
          <span className="mb-1 block text-sm font-medium">
            Categorie *
          </span>
          <select
            value={categorie}
            onChange={(event) =>
              setCategorie(
                event.target.value as TaakCategorie
              )
            }
            className={invoerClass}
          >
            {Object.entries(categorieLabels).map(
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
            Prioriteit *
          </span>
          <select
            value={prioriteit}
            onChange={(event) =>
              setPrioriteit(
                event.target.value as TaakPrioriteit
              )
            }
            className={invoerClass}
          >
            {Object.entries(prioriteitLabels).map(
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
            Status *
          </span>
          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value as TaakStatus
              )
            }
            className={invoerClass}
          >
            {Object.entries(statusLabels).map(
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
            Startdatum
          </span>
          <input
            type="date"
            value={startdatum}
            onChange={(event) =>
              setStartdatum(event.target.value)
            }
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Deadline
          </span>
          <input
            type="date"
            min={startdatum || undefined}
            value={deadline}
            onChange={(event) =>
              setDeadline(event.target.value)
            }
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Toegewezen aan
          </span>
          <input
            value={toegewezenAan}
            onChange={(event) =>
              setToegewezenAan(event.target.value)
            }
            className={invoerClass}
            placeholder="Naam medewerker of bedrijf"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Externe referentie
        </span>
        <input
          value={externeReferentie}
          onChange={(event) =>
            setExterneReferentie(event.target.value)
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

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={bezig}
          className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-60"
        >
          {bezig
            ? "Opslaan..."
            : taak
              ? "Wijzigingen opslaan"
              : "Taak opslaan"}
        </button>

        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-xl border border-slate-300 px-5 py-3 font-medium"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
