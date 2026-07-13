"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { uploadInspectieFoto } from "@/services/inspectiefotos";

type Props = {
  inspectieId: number;
};

type UploadResultaat = {
  bestandsnaam: string;
  status: "wachten" | "bezig" | "geslaagd" | "mislukt";
  fout?: string;
};

const MAXIMAAL_AANTAL = 10;

export default function InspectieFotoUpload({
  inspectieId,
}: Props) {
  const router = useRouter();
  const bestandInput = useRef<HTMLInputElement>(null);

  const [bestanden, setBestanden] = useState<File[]>([]);
  const [omschrijving, setOmschrijving] = useState("");
  const [resultaten, setResultaten] = useState<
    UploadResultaat[]
  >([]);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  function selecteerBestanden(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectie = Array.from(
      event.target.files ?? []
    );

    setFout("");

    if (selectie.length > MAXIMAAL_AANTAL) {
      setBestanden([]);
      setFout(
        `Selecteer maximaal ${MAXIMAAL_AANTAL} foto's tegelijk.`
      );
      return;
    }

    setBestanden(selectie);
    setResultaten(
      selectie.map((bestand) => ({
        bestandsnaam: bestand.name,
        status: "wachten",
      }))
    );
  }

  async function uploaden(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (bestanden.length === 0) {
      setFout("Selecteer minimaal één foto.");
      return;
    }

    setBezig(true);
    setFout("");

    let mislukt = 0;

    for (let index = 0; index < bestanden.length; index += 1) {
      const bestand = bestanden[index];

      setResultaten((huidig) =>
        huidig.map((resultaat, resultaatIndex) =>
          resultaatIndex === index
            ? {
                ...resultaat,
                status: "bezig",
                fout: undefined,
              }
            : resultaat
        )
      );

      try {
        await uploadInspectieFoto({
          inspectie_id: inspectieId,
          bestand,
          omschrijving,
        });

        setResultaten((huidig) =>
          huidig.map((resultaat, resultaatIndex) =>
            resultaatIndex === index
              ? {
                  ...resultaat,
                  status: "geslaagd",
                  fout: undefined,
                }
              : resultaat
          )
        );
      } catch (error) {
        mislukt += 1;

        setResultaten((huidig) =>
          huidig.map((resultaat, resultaatIndex) =>
            resultaatIndex === index
              ? {
                  ...resultaat,
                  status: "mislukt",
                  fout:
                    error instanceof Error
                      ? error.message
                      : "Upload mislukt.",
                }
              : resultaat
          )
        );
      }
    }

    setBezig(false);

    if (mislukt === 0) {
      setBestanden([]);
      setOmschrijving("");

      if (bestandInput.current) {
        bestandInput.current.value = "";
      }

      router.refresh();
    } else {
      setFout(
        `${mislukt} van de ${bestanden.length} foto's kon niet worden geüpload.`
      );

      router.refresh();
    }
  }

  function statusLabel(
    status: UploadResultaat["status"]
  ): string {
    const labels = {
      wachten: "Wachten",
      bezig: "Uploaden...",
      geslaagd: "Geüpload",
      mislukt: "Mislukt",
    };

    return labels[status];
  }

  return (
    <form
      onSubmit={uploaden}
      className="rounded-xl border border-slate-200 p-5"
    >
      <h3 className="font-semibold">
        Foto&apos;s toevoegen
      </h3>

      <p className="mt-1 text-sm text-slate-600">
        Selecteer maximaal {MAXIMAAL_AANTAL} foto&apos;s
        tegelijk. Maximaal 10 MB per foto.
      </p>

      {fout && (
        <div className="mt-4 rounded-xl bg-red-100 p-4 text-red-800">
          {fout}
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium">
            Foto&apos;s *
          </span>

          <input
            ref={bestandInput}
            required
            multiple
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            disabled={bezig}
            onChange={selecteerBestanden}
            className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-700 file:px-4 file:py-2 file:font-medium file:text-white"
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Omschrijving
          </span>

          <input
            value={omschrijving}
            disabled={bezig}
            onChange={(event) =>
              setOmschrijving(event.target.value)
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 disabled:bg-slate-100"
            placeholder="Bijvoorbeeld schade keuken"
          />
        </label>
      </div>

      {resultaten.length > 0 && (
        <div className="mt-5 space-y-2">
          {resultaten.map((resultaat, index) => (
            <div
              key={`${resultaat.bestandsnaam}-${index}`}
              className="rounded-lg bg-slate-100 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="break-all text-sm font-medium">
                  {resultaat.bestandsnaam}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    resultaat.status === "geslaagd"
                      ? "bg-emerald-100 text-emerald-800"
                      : resultaat.status === "mislukt"
                        ? "bg-red-100 text-red-800"
                        : resultaat.status === "bezig"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {statusLabel(resultaat.status)}
                </span>
              </div>

              {resultaat.fout && (
                <p className="mt-2 text-sm text-red-700">
                  {resultaat.fout}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        disabled={bezig || bestanden.length === 0}
        className="mt-5 rounded-xl bg-emerald-700 px-6 py-3 font-medium text-white disabled:opacity-50"
      >
        {bezig
          ? "Foto's uploaden..."
          : `${bestanden.length || ""} ${
              bestanden.length === 1 ? "foto" : "foto's"
            } uploaden`}
      </button>
    </form>
  );
}
