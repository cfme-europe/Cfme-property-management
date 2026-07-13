"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  updateBedrijf,
  type NieuwBedrijf,
} from "@/services/bedrijven";
import type { Bedrijf } from "@/types/bedrijf";

type Props = {
  bedrijf: Bedrijf;
};

function waarde(tekst: string | null): string {
  return tekst ?? "";
}

function leegNaarNull(tekst: string): string | null {
  const schoon = tekst.trim();
  return schoon === "" ? null : schoon;
}

export default function BedrijfEditForm({ bedrijf }: Props) {
  const router = useRouter();

  const [formulier, setFormulier] = useState({
    naam: bedrijf.naam,
    klantnummer: waarde(bedrijf.klantnummer),
    kvk_nummer: waarde(bedrijf.kvk_nummer),
    btw_nummer: waarde(bedrijf.btw_nummer),
    contactpersoon: waarde(bedrijf.contactpersoon),
    telefoon: waarde(bedrijf.telefoon),
    email: waarde(bedrijf.email),
    factuur_email: waarde(bedrijf.factuur_email),
    factuuradres: waarde(bedrijf.factuuradres),
    postcode: waarde(bedrijf.postcode),
    plaats: waarde(bedrijf.plaats),
    opmerkingen: waarde(bedrijf.opmerkingen),
  });

  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  function wijzig(veld: keyof typeof formulier, tekst: string) {
    setFormulier((huidig) => ({
      ...huidig,
      [veld]: tekst,
    }));
  }

  async function opslaan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBezig(true);
    setFout("");

    const invoer: NieuwBedrijf = {
      naam: formulier.naam,
      klantnummer: leegNaarNull(formulier.klantnummer),
      kvk_nummer: leegNaarNull(formulier.kvk_nummer),
      btw_nummer: leegNaarNull(formulier.btw_nummer),
      contactpersoon: leegNaarNull(formulier.contactpersoon),
      telefoon: leegNaarNull(formulier.telefoon),
      email: leegNaarNull(formulier.email),
      factuur_email: leegNaarNull(formulier.factuur_email),
      factuuradres: leegNaarNull(formulier.factuuradres),
      postcode: leegNaarNull(formulier.postcode),
      plaats: leegNaarNull(formulier.plaats),
      opmerkingen: leegNaarNull(formulier.opmerkingen),
    };

    try {
      await updateBedrijf(bedrijf.id, invoer);
      router.push(`/bedrijven/${bedrijf.id}`);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Bedrijf wijzigen mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  const invoerClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600";

  return (
    <form onSubmit={opslaan} className="space-y-8">
      {fout && (
        <div className="rounded-xl bg-red-100 p-4 text-red-800">
          {fout}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["naam", "Bedrijfsnaam *"],
          ["klantnummer", "Klantnummer"],
          ["kvk_nummer", "KvK-nummer"],
          ["btw_nummer", "Btw-nummer"],
          ["contactpersoon", "Contactpersoon"],
          ["telefoon", "Telefoon"],
          ["email", "E-mail"],
          ["factuur_email", "Factuur-e-mail"],
          ["factuuradres", "Factuuradres"],
          ["postcode", "Postcode"],
          ["plaats", "Plaats"],
        ].map(([veld, label]) => (
          <label
            key={veld}
            className={veld === "factuuradres" ? "md:col-span-2" : ""}
          >
            <span className="mb-1 block text-sm font-medium">
              {label}
            </span>

            <input
              required={veld === "naam"}
              type={veld.includes("email") ? "email" : "text"}
              className={invoerClass}
              value={formulier[veld as keyof typeof formulier]}
              onChange={(event) =>
                wijzig(
                  veld as keyof typeof formulier,
                  event.target.value
                )
              }
            />
          </label>
        ))}
      </div>

      <label>
        <span className="mb-1 block text-sm font-medium">
          Opmerkingen
        </span>

        <textarea
          rows={5}
          className={invoerClass}
          value={formulier.opmerkingen}
          onChange={(event) =>
            wijzig("opmerkingen", event.target.value)
          }
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          disabled={bezig}
          className="rounded-xl bg-emerald-700 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {bezig ? "Opslaan..." : "Wijzigingen opslaan"}
        </button>

        <button
          type="button"
          onClick={() => router.push(`/bedrijven/${bedrijf.id}`)}
          className="rounded-xl border border-slate-300 px-6 py-3 font-medium"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
