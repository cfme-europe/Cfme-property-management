"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Bedrijf } from "@/types/bedrijf";
import { createVerhuurperiode } from "@/services/verhuurperiodes";

type Props = {
  woningId: number;
  bedrijven: Bedrijf[];
};

function leegNaarNull(waarde: string): string | null {
  const schoon = waarde.trim();
  return schoon === "" ? null : schoon;
}

export default function VerhuurperiodeForm({
  woningId,
  bedrijven,
}: Props) {
  const router = useRouter();

  const [bedrijfId, setBedrijfId] = useState("");
  const [startdatum, setStartdatum] = useState("");
  const [einddatum, setEinddatum] = useState("");
  const [maandhuur, setMaandhuur] = useState("");
  const [borg, setBorg] = useState("");
  const [facturatieDag, setFacturatieDag] = useState("1");
  const [referentie, setReferentie] = useState("");
  const [opmerkingen, setOpmerkingen] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function opslaan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBezig(true);
    setFout("");

    try {
      await createVerhuurperiode({
        woning_id: woningId,
        bedrijf_id: Number(bedrijfId),
        startdatum,
        geplande_einddatum: leegNaarNull(einddatum),
        maandhuur: Number(maandhuur),
        borg: borg.trim() === "" ? null : Number(borg),
        facturatie_dag: Number(facturatieDag),
        referentie: leegNaarNull(referentie),
        opmerkingen: leegNaarNull(opmerkingen),
      });

      router.push(`/woningen/${woningId}`);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Verhuurperiode opslaan mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  const invoerClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600";

  return (
    <form onSubmit={opslaan} className="space-y-6">
      {fout && (
        <div className="rounded-xl bg-red-100 p-4 text-red-800">
          {fout}
        </div>
      )}

      <label>
        <span className="mb-1 block text-sm font-medium">
          Huurder *
        </span>

        <select
          required
          value={bedrijfId}
          onChange={(event) => setBedrijfId(event.target.value)}
          className={invoerClass}
        >
          <option value="">Selecteer een bedrijf</option>

          {bedrijven
            .filter((bedrijf) => bedrijf.actief)
            .map((bedrijf) => (
              <option key={bedrijf.id} value={bedrijf.id}>
                {bedrijf.naam}
              </option>
            ))}
        </select>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium">
            Startdatum *
          </span>
          <input
            required
            type="date"
            value={startdatum}
            onChange={(event) => setStartdatum(event.target.value)}
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Geplande einddatum
          </span>
          <input
            type="date"
            value={einddatum}
            onChange={(event) => setEinddatum(event.target.value)}
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Maandhuur *
          </span>
          <input
            required
            min="0"
            step="0.01"
            type="number"
            value={maandhuur}
            onChange={(event) => setMaandhuur(event.target.value)}
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Borg
          </span>
          <input
            min="0"
            step="0.01"
            type="number"
            value={borg}
            onChange={(event) => setBorg(event.target.value)}
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Facturatiedag
          </span>
          <input
            required
            min="1"
            max="28"
            type="number"
            value={facturatieDag}
            onChange={(event) => setFacturatieDag(event.target.value)}
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Contractreferentie
          </span>
          <input
            value={referentie}
            onChange={(event) => setReferentie(event.target.value)}
            className={invoerClass}
          />
        </label>
      </div>

      <label>
        <span className="mb-1 block text-sm font-medium">
          Opmerkingen
        </span>
        <textarea
          rows={4}
          value={opmerkingen}
          onChange={(event) => setOpmerkingen(event.target.value)}
          className={invoerClass}
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          disabled={bezig}
          className="rounded-xl bg-emerald-700 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {bezig ? "Opslaan..." : "Verhuurperiode starten"}
        </button>

        <button
          type="button"
          onClick={() => router.push(`/woningen/${woningId}`)}
          className="rounded-xl border border-slate-300 px-6 py-3 font-medium"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
