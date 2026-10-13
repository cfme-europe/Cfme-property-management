"use client";

import Link from "next/link";
import { useState } from "react";
import type { CockpitWoning } from "@/types/business-intelligence";

type WoningSnelkoppelingenProps = {
  woningen: CockpitWoning[];
};

type Snelactie = {
  label: string;
  pad: (woningId: number) => string;
  className: string;
};

const snelacties: Snelactie[] = [
  {
    label: "Woningdossier",
    pad: (woningId) => `/woningen/${woningId}`,
    className: "border-slate-500 text-slate-800 hover:bg-slate-50",
  },
  {
    label: "Nieuwe inspectie",
    pad: (woningId) => `/woningen/${woningId}/inspecties/nieuw`,
    className: "border-emerald-700 text-emerald-800 hover:bg-emerald-50",
  },
  {
    label: "Opvolging",
    pad: (woningId) => `/woningen/${woningId}#opvolging`,
    className: "border-amber-600 text-amber-800 hover:bg-amber-50",
  },
  {
    label: "Compliance",
    pad: (woningId) => `/woningen/${woningId}/compliance`,
    className: "border-emerald-700 text-emerald-800 hover:bg-emerald-50",
  },
  {
    label: "Woninggegevens",
    pad: (woningId) => `/woningen/${woningId}/bewerken`,
    className: "border-slate-500 text-slate-800 hover:bg-slate-50",
  },
  {
    label: "Woningconfiguratie",
    pad: (woningId) => `/woningen/${woningId}/configuratie`,
    className: "border-blue-700 text-blue-800 hover:bg-blue-50",
  },
  {
    label: "Planning",
    pad: (woningId) => `/woningen/${woningId}/planning`,
    className: "border-blue-700 text-blue-800 hover:bg-blue-50",
  },
  {
    label: "Verhuur beheren",
    pad: (woningId) => `/woningen/${woningId}#verhuur`,
    className: "border-amber-600 text-amber-800 hover:bg-amber-50",
  },
];

export default function WoningSnelkoppelingen({
  woningen,
}: WoningSnelkoppelingenProps) {
  const [geselecteerdeWoningId, setGeselecteerdeWoningId] =
    useState<number | null>(null);

  const geselecteerdeWoning = woningen.find(
    (woning) => woning.id === geselecteerdeWoningId,
  );

  return (
    <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm md:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,2fr)] lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Woning snel openen
          </p>
          <label
            htmlFor="dashboard-woningkeuze"
            className="mt-2 block text-xl font-bold"
          >
            Kies een woning
          </label>
          <select
            id="dashboard-woningkeuze"
            value={geselecteerdeWoningId ?? ""}
            onChange={(event) =>
              setGeselecteerdeWoningId(
                event.target.value ? Number(event.target.value) : null,
              )
            }
            className="mt-3 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base"
          >
            <option value="">Selecteer een woning</option>
            {woningen.map((woning) => (
              <option key={woning.id} value={woning.id}>
                {woning.adres} · {woning.postcode} {woning.plaats}
              </option>
            ))}
          </select>
        </div>

        <div>
          {geselecteerdeWoning ? (
            <>
              <p className="mb-3 text-sm text-slate-600">
                Direct naar een onderdeel van {geselecteerdeWoning.adres}
              </p>
              <div className="flex flex-wrap gap-3">
                {snelacties.map((actie) => (
                  <Link
                    key={actie.label}
                    href={actie.pad(geselecteerdeWoning.id)}
                    className={`inline-flex min-h-12 items-center justify-center rounded-xl border px-4 py-3 font-medium transition ${actie.className}`}
                  >
                    {actie.label}
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-slate-100 px-5 py-4 text-slate-600">
              Kies eerst een woning; daarna verschijnen de beschikbare snelkoppelingen.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
