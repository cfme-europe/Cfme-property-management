"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createHuurder,
  updateHuurder,
} from "@/services/huurders";
import type {
  Huurder,
  HuurderDocumentType,
  HuurderInvoer,
} from "@/types/huurder";

type Props = {
  woningId: number;
  verhuurperiodeId: number;
  huurder?: Huurder;
};

export default function HuurderForm({
  woningId,
  verhuurperiodeId,
  huurder,
}: Props) {
  const router = useRouter();

  const [voornaam, setVoornaam] = useState(huurder?.voornaam ?? "");
  const [tussenvoegsel, setTussenvoegsel] = useState(
    huurder?.tussenvoegsel ?? ""
  );
  const [achternaam, setAchternaam] = useState(
    huurder?.achternaam ?? ""
  );
  const [geboortedatum, setGeboortedatum] = useState(
    huurder?.geboortedatum ?? ""
  );
  const [nationaliteit, setNationaliteit] = useState(
    huurder?.nationaliteit ?? ""
  );
  const [telefoon, setTelefoon] = useState(huurder?.telefoon ?? "");
  const [email, setEmail] = useState(huurder?.email ?? "");
  const [documentType, setDocumentType] = useState<
    HuurderDocumentType | ""
  >(huurder?.document_type ?? "");
  const [documentnummer, setDocumentnummer] = useState(
    huurder?.documentnummer ?? ""
  );
  const [opmerkingen, setOpmerkingen] = useState(
    huurder?.opmerkingen ?? ""
  );
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function opslaan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBezig(true);
    setFout("");

    const invoer: HuurderInvoer = {
      verhuurperiode_id: verhuurperiodeId,
      voornaam,
      tussenvoegsel,
      achternaam,
      geboortedatum,
      nationaliteit,
      telefoon,
      email,
      document_type: documentType || null,
      documentnummer,
      opmerkingen,
    };

    try {
      if (huurder) {
        await updateHuurder(huurder.id, invoer);
      } else {
        await createHuurder(invoer);
      }

      router.push(`/woningen/${woningId}`);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Huurder opslaan mislukt."
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
            onChange={(event) => setTussenvoegsel(event.target.value)}
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

      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium">
            Geboortedatum
          </span>
          <input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={geboortedatum}
            onChange={(event) => setGeboortedatum(event.target.value)}
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Nationaliteit
          </span>
          <input
            value={nationaliteit}
            onChange={(event) => setNationaliteit(event.target.value)}
            className={invoerClass}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium">
            Telefoonnummer
          </span>
          <input
            type="tel"
            value={telefoon}
            onChange={(event) => setTelefoon(event.target.value)}
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            E-mailadres
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={invoerClass}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium">
            Documenttype
          </span>
          <select
            value={documentType}
            onChange={(event) =>
              setDocumentType(
                event.target.value as HuurderDocumentType | ""
              )
            }
            className={invoerClass}
          >
            <option value="">Niet vastgelegd</option>
            <option value="identiteitskaart">Identiteitskaart</option>
            <option value="paspoort">Paspoort</option>
            <option value="verblijfsdocument">
              Verblijfsdocument
            </option>
            <option value="overig">Overig</option>
          </select>
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            ID- of paspoortnummer
          </span>
          <input
            value={documentnummer}
            onChange={(event) => setDocumentnummer(event.target.value)}
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
          onChange={(event) => setOpmerkingen(event.target.value)}
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
            : huurder
              ? "Wijzigingen opslaan"
              : "Huurder toevoegen"}
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
