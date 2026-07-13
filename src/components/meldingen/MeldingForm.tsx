"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createMelding,
  updateMelding,
} from "@/services/meldingen";
import type { Inspectie } from "@/types/inspectie";
import type {
  FactuurOntvanger,
  Melding,
  MeldingCategorie,
  MeldingInvoer,
  MeldingPrioriteit,
  MeldingStatus,
} from "@/types/melding";

type Props = {
  woningId: number;
  inspecties: Inspectie[];
  standaardInspectieId?: number | null;
  melding?: Melding;
};

function inspectieLabel(inspectie: Inspectie): string {
  const typeLabels = {
    begininspectie: "Begininspectie",
    periodiek: "Periodieke inspectie",
    eindinspectie: "Eindinspectie",
    incident: "Incidentinspectie",
  };

  const datum = new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(
    new Date(`${inspectie.inspectiedatum}T00:00:00`)
  );

  return `${datum} — ${typeLabels[inspectie.type]}`;
}

export default function MeldingForm({
  woningId,
  inspecties,
  standaardInspectieId = null,
  melding,
}: Props) {
  const router = useRouter();

  const [inspectieId, setInspectieId] = useState(
    melding?.inspectie_id
      ? String(melding.inspectie_id)
      : standaardInspectieId
        ? String(standaardInspectieId)
        : ""
  );
  const [titel, setTitel] = useState(
    melding?.titel ?? ""
  );
  const [omschrijving, setOmschrijving] = useState(
    melding?.omschrijving ?? ""
  );
  const [categorie, setCategorie] =
    useState<MeldingCategorie>(
      melding?.categorie ?? "overig"
    );
  const [prioriteit, setPrioriteit] =
    useState<MeldingPrioriteit>(
      melding?.prioriteit ?? "normaal"
    );
  const [status, setStatus] =
    useState<MeldingStatus>(
      melding?.status ?? "open"
    );
  const [melddatum, setMelddatum] = useState(
    melding?.melddatum ??
      new Date().toISOString().slice(0, 10)
  );
  const [oplosdatum, setOplosdatum] = useState(
    melding?.oplosdatum ?? ""
  );
  const [verantwoordelijke, setVerantwoordelijke] =
    useState(melding?.verantwoordelijke ?? "");
  const [oplossing, setOplossing] = useState(
    melding?.oplossing ?? ""
  );
  const [factuurNaar, setFactuurNaar] = useState<
    FactuurOntvanger | ""
  >(melding?.factuur_naar ?? "nog_te_bepalen");
  const [
    externReferentienummer,
    setExternReferentienummer,
  ] = useState(
    melding?.extern_referentienummer ?? ""
  );
  const [opmerkingen, setOpmerkingen] = useState(
    melding?.opmerkingen ?? ""
  );
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const invoerClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 disabled:bg-slate-100";

  function wijzigStatus(
    nieuweStatus: MeldingStatus
  ) {
    setStatus(nieuweStatus);

    if (nieuweStatus !== "opgelost") {
      setOplosdatum("");
      setOplossing("");
    }
  }

  async function opslaan(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setBezig(true);
    setFout("");

    const invoer: MeldingInvoer = {
      woning_id: woningId,
      inspectie_id: inspectieId
        ? Number(inspectieId)
        : null,
      titel,
      omschrijving,
      categorie,
      prioriteit,
      status,
      melddatum,
      oplosdatum,
      verantwoordelijke,
      oplossing,
      factuur_naar: factuurNaar || null,
      extern_referentienummer:
        externReferentienummer,
      opmerkingen,
    };

    try {
      if (melding) {
        await updateMelding(melding.id, invoer);
      } else {
        await createMelding(invoer);
      }

      router.push(`/woningen/${woningId}`);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Melding opslaan mislukt."
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
            Titel *
          </span>

          <input
            required
            value={titel}
            onChange={(event) =>
              setTitel(event.target.value)
            }
            className={invoerClass}
            placeholder="Korte omschrijving van de melding"
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Gekoppelde inspectie
          </span>

          <select
            value={inspectieId}
            onChange={(event) =>
              setInspectieId(event.target.value)
            }
            className={invoerClass}
          >
            <option value="">
              Geen inspectie gekoppeld
            </option>

            {inspecties.map((inspectie) => (
              <option
                key={inspectie.id}
                value={inspectie.id}
              >
                {inspectieLabel(inspectie)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Omschrijving *
        </span>

        <textarea
          required
          rows={5}
          value={omschrijving}
          onChange={(event) =>
            setOmschrijving(event.target.value)
          }
          className={invoerClass}
          placeholder="Beschrijf het probleem, de locatie en de gewenste opvolging."
        />
      </label>

      <div className="grid gap-4 md:grid-cols-4">
        <label>
          <span className="mb-1 block text-sm font-medium">
            Categorie *
          </span>

          <select
            value={categorie}
            onChange={(event) =>
              setCategorie(
                event.target.value as MeldingCategorie
              )
            }
            className={invoerClass}
          >
            <option value="schade">Schade</option>
            <option value="onderhoud">
              Onderhoud
            </option>
            <option value="veiligheid">
              Veiligheid
            </option>
            <option value="schoonmaak">
              Schoonmaak
            </option>
            <option value="installatie">
              Installatie
            </option>
            <option value="overig">Overig</option>
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
                event.target.value as MeldingPrioriteit
              )
            }
            className={invoerClass}
          >
            <option value="laag">Laag</option>
            <option value="normaal">Normaal</option>
            <option value="hoog">Hoog</option>
            <option value="spoed">Spoed</option>
          </select>
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Status *
          </span>

          <select
            value={status}
            onChange={(event) =>
              wijzigStatus(
                event.target.value as MeldingStatus
              )
            }
            className={invoerClass}
          >
            <option value="open">Open</option>
            <option value="in_behandeling">
              In behandeling
            </option>
            <option value="opgelost">
              Opgelost
            </option>
          </select>
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Melddatum *
          </span>

          <input
            required
            type="date"
            value={melddatum}
            onChange={(event) =>
              setMelddatum(event.target.value)
            }
            className={invoerClass}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label>
          <span className="mb-1 block text-sm font-medium">
            Verantwoordelijke
          </span>

          <input
            value={verantwoordelijke}
            onChange={(event) =>
              setVerantwoordelijke(event.target.value)
            }
            className={invoerClass}
            placeholder="Persoon, leverancier of afdeling"
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Factuur naar
          </span>

          <select
            value={factuurNaar}
            onChange={(event) =>
              setFactuurNaar(
                event.target.value as
                  | FactuurOntvanger
                  | ""
              )
            }
            className={invoerClass}
          >
            <option value="">
              Niet van toepassing
            </option>
            <option value="nog_te_bepalen">
              Nog te bepalen
            </option>
            <option value="cfme">CFME</option>
            <option value="hurend_bedrijf">
              Hurend bedrijf
            </option>
            <option value="eigenaar">
              Eigenaar
            </option>
          </select>
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Extern referentienummer
          </span>

          <input
            value={externReferentienummer}
            onChange={(event) =>
              setExternReferentienummer(
                event.target.value
              )
            }
            className={invoerClass}
            placeholder="Werkbon- of factuurnummer"
          />
        </label>
      </div>

      {status === "opgelost" && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-semibold text-emerald-900">
            Oplossing
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label>
              <span className="mb-1 block text-sm font-medium">
                Oplosdatum *
              </span>

              <input
                required
                type="date"
                min={melddatum || undefined}
                value={oplosdatum}
                onChange={(event) =>
                  setOplosdatum(event.target.value)
                }
                className={invoerClass}
              />
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium">
                Uitgevoerde oplossing
              </span>

              <textarea
                rows={3}
                value={oplossing}
                onChange={(event) =>
                  setOplossing(event.target.value)
                }
                className={invoerClass}
                placeholder="Beschrijf hoe de melding is opgelost."
              />
            </label>
          </div>
        </section>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Interne opmerkingen
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
          disabled={bezig}
          className="rounded-xl bg-emerald-700 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {bezig
            ? "Opslaan..."
            : melding
              ? "Wijzigingen opslaan"
              : "Melding opslaan"}
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
