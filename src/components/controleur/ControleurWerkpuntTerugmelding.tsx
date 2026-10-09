"use client";

import Link from "next/link";
import { useState } from "react";
import { registreerWerkpuntTerugmelding } from "@/services/controleurflow";
import type {
  ControleurRoutepunt,
} from "@/types/controleurflow";
import type {
  IntelligenceWerkpunt,
  IntelligenceWerkpuntTerugmelding,
  IntelligenceWerkpuntTerugmeldingUitkomst,
} from "@/types/intelligence";

type Props = {
  werkpunt: IntelligenceWerkpunt;
  controlesessieId: number;
  route: ControleurRoutepunt[];
  bestaandeTerugmelding:
    IntelligenceWerkpuntTerugmelding | null;
};

function bronLink(werkpunt: IntelligenceWerkpunt): string {
  const aanwijzing =
    `${werkpunt.categorie} ${werkpunt.titel}`.toLowerCase();
  const basis = `/woningen/${werkpunt.woning_id}`;

  if (aanwijzing.includes("melding")) return `${basis}#meldingen`;
  if (aanwijzing.includes("taak") || aanwijzing.includes("deadline")) {
    return `${basis}#taken`;
  }
  if (
    aanwijzing.includes("inspectie") ||
    aanwijzing.includes("orde") ||
    aanwijzing.includes("netheid")
  ) {
    return `${basis}#inspecties`;
  }
  if (
    aanwijzing.includes("energie") ||
    aanwijzing.includes("verbruik") ||
    aanwijzing.includes("water") ||
    aanwijzing.includes("gas") ||
    aanwijzing.includes("stroom") ||
    aanwijzing.includes("meter")
  ) {
    return `${basis}#meterstanden`;
  }

  return basis;
}

function uitkomstLabel(
  uitkomst: IntelligenceWerkpuntTerugmeldingUitkomst,
): string {
  if (uitkomst === "actie_uitgevoerd") return "Actie uitgevoerd";
  if (uitkomst === "vervolg_nodig") return "Vervolg nodig";
  return "Gecontroleerd";
}

function datumTijd(waarde: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(waarde));
}

export default function ControleurWerkpuntTerugmelding({
  werkpunt,
  controlesessieId,
  route,
  bestaandeTerugmelding,
}: Props) {
  const [terugmelding, setTerugmelding] = useState(
    bestaandeTerugmelding,
  );
  const [uitkomst, setUitkomst] =
    useState<IntelligenceWerkpuntTerugmeldingUitkomst>(
      "gecontroleerd",
    );
  const [bevinding, setBevinding] = useState("");
  const [controlepuntId, setControlepuntId] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function opslaan(): Promise<void> {
    setBezig(true);
    setFout("");

    try {
      const resultaat = await registreerWerkpuntTerugmelding({
        werkpunt_id: werkpunt.id,
        controlesessie_id: controlesessieId,
        uitkomst,
        bevinding,
        woning_controlepunt_id: controlepuntId
          ? Number(controlepuntId)
          : null,
      });

      setTerugmelding(resultaat);
      setBevinding("");
      setControlepuntId("");
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Werkpunt terugmelden mislukt.",
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="mt-3 border-t border-amber-100 pt-3">
      <Link
        href={bronLink(werkpunt)}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-bold text-violet-700 underline"
      >
        Bron bekijken
      </Link>

      {terugmelding ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
          <p className="font-bold">
            Teruggemeld: {uitkomstLabel(terugmelding.uitkomst)}
          </p>
          <p className="mt-1">{terugmelding.bevinding}</p>
          <p className="mt-2 text-xs text-emerald-800">
            {terugmelding.geregistreerd_door_naam} ·{" "}
            {datumTijd(terugmelding.created_at)}
          </p>
          <p className="mt-2 text-xs text-emerald-800">
            Management beoordeelt en handelt het werkpunt definitief af.
          </p>
        </div>
      ) : (
        <details className="mt-3 rounded-lg bg-amber-100/70 p-3">
          <summary className="cursor-pointer text-sm font-bold text-amber-950">
            Controlebevinding terugmelden
          </summary>

          <label className="mt-3 block text-sm font-medium text-slate-800">
            Uitkomst
            <select
              value={uitkomst}
              onChange={(event) =>
                setUitkomst(
                  event.target.value as IntelligenceWerkpuntTerugmeldingUitkomst,
                )
              }
              disabled={bezig}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value="gecontroleerd">Gecontroleerd</option>
              <option value="actie_uitgevoerd">Actie uitgevoerd</option>
              <option value="vervolg_nodig">Vervolg nodig</option>
            </select>
          </label>

          <label className="mt-3 block text-sm font-medium text-slate-800">
            Wat heb je feitelijk vastgesteld of gedaan?{" "}
            <span aria-hidden="true">*</span>
            <textarea
              value={bevinding}
              onChange={(event) => setBevinding(event.target.value)}
              maxLength={2000}
              required
              rows={3}
              disabled={bezig}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              placeholder="Beschrijf de controle, uitgevoerde actie of benodigde opvolging."
            />
          </label>

          <label className="mt-3 block text-sm font-medium text-slate-800">
            Koppel controlebewijs (optioneel)
            <select
              value={controlepuntId}
              onChange={(event) => setControlepuntId(event.target.value)}
              disabled={bezig}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value="">Geen controlepunt koppelen</option>
              {route.map((punt) => (
                <option
                  key={punt.woning_controlepunt_id}
                  value={punt.woning_controlepunt_id}
                >
                  {punt.ruimte_naam} ·{" "}
                  {punt.object_naam
                    ? `${punt.object_naam} · `
                    : ""}
                  {punt.controlepunt_naam}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-600">
              Sla het gekozen controlepunt en eventuele foto’s eerst op.
            </span>
          </label>

          {fout && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {fout}
            </p>
          )}

          <button
            type="button"
            onClick={opslaan}
            disabled={bezig || !bevinding.trim()}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {bezig ? "Opslaan…" : "Terugmelding vastleggen"}
          </button>
        </details>
      )}
    </div>
  );
}
