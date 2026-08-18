"use client";

import {
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  updateWoningGegevens,
} from "@/services/woningen";
import type { Woning } from "@/types/woning";

type Props = {
  woning: Woning;
};

export default function WoningBewerkenForm({
  woning,
}: Props) {
  const router = useRouter();

  const [adres, setAdres] =
    useState(woning.adres);
  const [postcode, setPostcode] =
    useState(woning.postcode);
  const [plaats, setPlaats] =
    useState(woning.plaats);
  const [bezig, setBezig] =
    useState(false);
  const [fout, setFout] =
    useState("");

  async function opslaan(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setBezig(true);
    setFout("");

    try {
      await updateWoningGegevens({
        id: woning.id,
        adres,
        postcode,
        plaats,
      });

      router.push(`/woningen/${woning.id}`);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Woninggegevens wijzigen mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  const invoerClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600";

  return (
    <form
      onSubmit={opslaan}
      className="space-y-6"
    >
      {fout && (
        <div className="rounded-xl bg-red-100 p-4 text-red-800">
          {fout}
        </div>
      )}

      <div className="rounded-xl bg-slate-100 p-4">
        <p className="text-sm text-slate-500">
          Dossiernummer
        </p>
        <p className="mt-1 font-semibold">
          {woning.dossiernummer}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Het dossiernummer wordt hier niet gewijzigd.
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Adres *
        </span>
        <input
          required
          value={adres}
          onChange={(event) =>
            setAdres(event.target.value)
          }
          className={invoerClass}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium">
            Postcode *
          </span>
          <input
            required
            value={postcode}
            onChange={(event) =>
              setPostcode(event.target.value)
            }
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Plaats *
          </span>
          <input
            required
            value={plaats}
            onChange={(event) =>
              setPlaats(event.target.value)
            }
            className={invoerClass}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          disabled={bezig}
          className="rounded-xl bg-emerald-700 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {bezig
            ? "Opslaan..."
            : "Woninggegevens opslaan"}
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(`/woningen/${woning.id}`)
          }
          className="rounded-xl border border-slate-300 px-6 py-3 font-medium"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
