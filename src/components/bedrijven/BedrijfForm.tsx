"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBedrijf } from "@/services/bedrijven";

type Formulier = {
  naam: string;
  klantnummer: string;
  kvk_nummer: string;
  btw_nummer: string;
  contactpersoon: string;
  telefoon: string;
  email: string;
  factuur_email: string;
  factuuradres: string;
  postcode: string;
  plaats: string;
  opmerkingen: string;
};

const beginwaarden: Formulier = {
  naam: "",
  klantnummer: "",
  kvk_nummer: "",
  btw_nummer: "",
  contactpersoon: "",
  telefoon: "",
  email: "",
  factuur_email: "",
  factuuradres: "",
  postcode: "",
  plaats: "",
  opmerkingen: "",
};

function leegNaarNull(waarde: string): string | null {
  const schoon = waarde.trim();
  return schoon === "" ? null : schoon;
}

export default function BedrijfForm() {
  const router = useRouter();
  const [formulier, setFormulier] = useState<Formulier>(beginwaarden);
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  function wijzig(
    veld: keyof Formulier,
    waarde: string
  ) {
    setFormulier((huidig) => ({
      ...huidig,
      [veld]: waarde,
    }));
  }

  async function opslaan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFout("");
    setBezig(true);

    try {
      const bedrijf = await createBedrijf({
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
      });

      router.push(`/bedrijven/${bedrijf.id}`);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Bedrijf opslaan mislukt."
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

      <section>
        <h2 className="mb-4 text-xl font-bold">Bedrijfsgegevens</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-medium">
              Bedrijfsnaam *
            </span>
            <input
              required
              minLength={2}
              className={invoerClass}
              value={formulier.naam}
              onChange={(event) => wijzig("naam", event.target.value)}
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Klantnummer
            </span>
            <input
              className={invoerClass}
              value={formulier.klantnummer}
              onChange={(event) =>
                wijzig("klantnummer", event.target.value)
              }
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              KvK-nummer
            </span>
            <input
              className={invoerClass}
              value={formulier.kvk_nummer}
              onChange={(event) =>
                wijzig("kvk_nummer", event.target.value)
              }
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Btw-nummer
            </span>
            <input
              className={invoerClass}
              value={formulier.btw_nummer}
              onChange={(event) =>
                wijzig("btw_nummer", event.target.value)
              }
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Contact</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-medium">
              Contactpersoon
            </span>
            <input
              className={invoerClass}
              value={formulier.contactpersoon}
              onChange={(event) =>
                wijzig("contactpersoon", event.target.value)
              }
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Telefoon
            </span>
            <input
              className={invoerClass}
              value={formulier.telefoon}
              onChange={(event) =>
                wijzig("telefoon", event.target.value)
              }
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              E-mail
            </span>
            <input
              type="email"
              className={invoerClass}
              value={formulier.email}
              onChange={(event) =>
                wijzig("email", event.target.value)
              }
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Factuur-e-mail
            </span>
            <input
              type="email"
              className={invoerClass}
              value={formulier.factuur_email}
              onChange={(event) =>
                wijzig("factuur_email", event.target.value)
              }
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Factuuradres</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium">
              Adres
            </span>
            <input
              className={invoerClass}
              value={formulier.factuuradres}
              onChange={(event) =>
                wijzig("factuuradres", event.target.value)
              }
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Postcode
            </span>
            <input
              className={invoerClass}
              value={formulier.postcode}
              onChange={(event) =>
                wijzig("postcode", event.target.value)
              }
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Plaats
            </span>
            <input
              className={invoerClass}
              value={formulier.plaats}
              onChange={(event) =>
                wijzig("plaats", event.target.value)
              }
            />
          </label>
        </div>
      </section>

      <label>
        <span className="mb-1 block text-sm font-medium">
          Opmerkingen
        </span>
        <textarea
          rows={4}
          className={invoerClass}
          value={formulier.opmerkingen}
          onChange={(event) =>
            wijzig("opmerkingen", event.target.value)
          }
        />
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={bezig}
          className="rounded-xl bg-emerald-700 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {bezig ? "Opslaan..." : "Bedrijf opslaan"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/bedrijven")}
          className="rounded-xl border border-slate-300 px-6 py-3 font-medium"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
