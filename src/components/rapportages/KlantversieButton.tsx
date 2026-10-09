"use client";

import { useMemo, useState } from "react";
import {
  alleKlantversieOnderdelen,
  klantversieOnderdelen,
  type KlantversieOnderdeel,
} from "@/lib/rapportages/klantversie-onderdelen";
import type { Maandrapportage } from "@/types/maandrapportage";

export default function KlantversieButton({
  rapportage,
}: {
  rapportage: Maandrapportage;
}) {
  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [selectie, setSelectie] = useState<Set<KlantversieOnderdeel>>(
    alleKlantversieOnderdelen,
  );

  const samengesteld = Boolean(
    rapportage.rapport_data.gegenereerd_op,
  );
  const query = useMemo(
    () =>
      new URLSearchParams({
        variant: "klantwaarde",
        onderdelen: [...selectie].join(","),
      }).toString(),
    [selectie],
  );
  const rapportBasis = `/woningen/${rapportage.woning_id}/rapportages/${rapportage.id}`;
  const pdfUrl = `${rapportBasis}/pdf`;
  const voorbeeldUrl = `${rapportBasis}/klantversie`;

  function wissel(onderdeel: KlantversieOnderdeel) {
    setSelectie((actueel) => {
      const volgende = new Set(actueel);
      if (volgende.has(onderdeel)) {
        volgende.delete(onderdeel);
      } else {
        volgende.add(onderdeel);
      }
      return volgende;
    });
  }

  async function downloaden() {
    if (selectie.size === 0) return;
    setBezig(true);
    setFout("");

    try {
      const response = await fetch(`${pdfUrl}?${query}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        const resultaat = await response.json().catch(() => null);
        throw new Error(
          resultaat?.fout ?? "Klantversie downloaden mislukt.",
        );
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const bestandsnaam =
        disposition?.match(/filename="([^"]+)"/)?.[1] ??
        `klantversie-${rapportage.id}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = bestandsnaam;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Klantversie downloaden mislukt.",
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((waarde) => !waarde)}
        className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white"
      >
        Klantversie maken
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-3 w-[min(92vw,28rem)] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
          <h2 className="text-lg font-bold">Klantversie samenstellen</h2>
          <p className="mt-1 text-sm text-slate-600">
            Kies wat de klant in de compacte rapportage van maximaal twee pagina&apos;s ziet.
          </p>

          {!samengesteld && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              Stel eerst de rapportgegevens samen. De keuze blijft daarna beschikbaar.
            </p>
          )}

          <fieldset className="mt-4 space-y-3">
            <legend className="sr-only">Te rapporteren gegevens</legend>
            {klantversieOnderdelen.map(([sleutel, label]) => (
              <label key={sleutel} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={selectie.has(sleutel)}
                  onChange={() => wissel(sleutel)}
                  className="h-4 w-4 accent-emerald-700"
                />
                {label}
              </label>
            ))}
          </fieldset>

          {selectie.size === 0 && (
            <p className="mt-3 text-sm text-red-700">
              Selecteer minimaal één onderdeel.
            </p>
          )}
          {fout && <p className="mt-3 text-sm text-red-700">{fout}</p>}

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={`${voorbeeldUrl}?${query}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!samengesteld || selectie.size === 0}
              className={`rounded-xl border px-4 py-2 text-sm font-medium ${
                samengesteld && selectie.size > 0
                  ? "border-slate-900 text-slate-900"
                  : "pointer-events-none border-slate-200 text-slate-400"
              }`}
            >
              Bekijken
            </a>
            <button
              type="button"
              disabled={!samengesteld || selectie.size === 0 || bezig}
              onClick={downloaden}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {bezig ? "Downloaden..." : "Downloaden"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
