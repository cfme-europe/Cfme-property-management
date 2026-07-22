"use client";

import Link from "next/link";
import {
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";

export default function NieuweWoningPage() {
  const router = useRouter();

  const [adres, setAdres] =
    useState("");
  const [postcode, setPostcode] =
    useState("");
  const [plaats, setPlaats] =
    useState("");
  const [fout, setFout] =
    useState("");
  const [bezig, setBezig] =
    useState(false);

  async function opslaan(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setFout("");
    setBezig(true);

    try {
      const response = await fetch(
        "/api/woningen",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            adres,
            postcode,
            plaats,
          }),
        }
      );

      const resultaat =
        (await response.json()) as {
          id?: number;
          error?: string;
        };

      if (
        !response.ok ||
        !resultaat.id
      ) {
        throw new Error(
          resultaat.error ??
            "Woning opslaan mislukt."
        );
      }

      router.push(
        `/woningen/${resultaat.id}`
      );
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Woning opslaan mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  const invoerClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-emerald-600";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/woningen"
          className="mb-6 inline-block font-medium text-emerald-700 hover:underline"
        >
          ← Terug naar woningen
        </Link>

        <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-bold">
            Nieuwe woning toevoegen
          </h1>

          <p className="mt-2 text-slate-600">
            Vul de woninggegevens in.
          </p>

          <form
            onSubmit={opslaan}
            className="mt-8 grid gap-5"
          >
            {fout && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-4 text-red-800"
              >
                {fout}
              </p>
            )}

            <label className="grid gap-2">
              <span className="font-medium">
                Adres
              </span>
              <input
                required
                minLength={3}
                value={adres}
                onChange={(event) =>
                  setAdres(
                    event.target.value
                  )
                }
                className={invoerClass}
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">
                Postcode
              </span>
              <input
                required
                minLength={4}
                value={postcode}
                onChange={(event) =>
                  setPostcode(
                    event.target.value
                  )
                }
                className={invoerClass}
              />
            </label>

            <label className="grid gap-2">
              <span className="font-medium">
                Plaats
              </span>
              <input
                required
                minLength={2}
                value={plaats}
                onChange={(event) =>
                  setPlaats(
                    event.target.value
                  )
                }
                className={invoerClass}
              />
            </label>

            <button
              type="submit"
              disabled={bezig}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-50"
            >
              {bezig
                ? "Opslaan..."
                : "Woning opslaan"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
