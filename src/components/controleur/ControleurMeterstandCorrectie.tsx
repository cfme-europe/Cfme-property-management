"use client";

import { useMemo, useState } from "react";
import {
  bepaalRegisterBuren,
  type VoorgangerRegister,
} from "@/lib/meterstanden/voorganger";
import { corrigeerControleurMeterstand } from "@/services/meterstanden";
import type { ControleurFlowGegevens } from "@/types/controleurflow";

const REGISTERS: { register: VoorgangerRegister; label: string }[] = [
  { register: "dagstroom_kwh", label: "Elektriciteitsmeter dag (kWh)" },
  { register: "nachtstroom_kwh", label: "Elektriciteitsmeter nacht (kWh)" },
  { register: "gas_m3", label: "Gasmeter (m³)" },
  { register: "water_m3", label: "Watermeter (m³)" },
];

export default function ControleurMeterstandCorrectie({
  sessieId,
  historie,
  onGecorrigeerd,
}: {
  sessieId: number;
  historie: ControleurFlowGegevens["meterstand_historie"];
  onGecorrigeerd: () => void;
}) {
  const [meterstandId, setMeterstandId] = useState<number | null>(null);
  const [register, setRegister] = useState<VoorgangerRegister | null>(null);
  const [waarde, setWaarde] = useState("");
  const [reden, setReden] = useState("");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  const gekozen = historie.find((m) => m.id === meterstandId) ?? null;
  const buren = useMemo(
    () =>
      meterstandId && register
        ? bepaalRegisterBuren(historie, meterstandId, register)
        : null,
    [historie, meterstandId, register],
  );

  async function opslaan() {
    if (!meterstandId || !register) return;
    setBezig(true);
    setFout(null);
    setMelding(null);
    try {
      const resultaat = await corrigeerControleurMeterstand({
        controlesessie_id: sessieId,
        meterstand_id: meterstandId,
        register,
        waarde: Number(waarde.replace(",", ".")),
        reden,
      });
      setMelding(resultaat.analyse.samenvatting);
      setWaarde("");
      setReden("");
      onGecorrigeerd();
    } catch (error) {
      setFout(error instanceof Error ? error.message : "Correctie mislukt.");
    } finally {
      setBezig(false);
    }
  }

  if (historie.length === 0) return null;

  return (
    <details className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <summary className="cursor-pointer font-bold text-slate-950">
        Eerdere meterstand corrigeren
      </summary>
      <div className="mt-3 space-y-3">
        <select
          className="w-full rounded-lg border p-3"
          value={meterstandId ?? ""}
          onChange={(e) => {
            setMeterstandId(e.target.value ? Number(e.target.value) : null);
            setRegister(null);
          }}
        >
          <option value="">Kies een opname</option>
          {historie.slice(0, 24).map((m) => (
            <option key={m.id} value={m.id}>
              {m.opnamedatum}
            </option>
          ))}
        </select>

        {gekozen && (
          <select
            className="w-full rounded-lg border p-3"
            value={register ?? ""}
            onChange={(e) =>
              setRegister((e.target.value || null) as VoorgangerRegister | null)
            }
          >
            <option value="">Kies een meter</option>
            {REGISTERS.filter((r) => gekozen[r.register] !== null).map((r) => (
              <option key={r.register} value={r.register}>
                {r.label}: {gekozen[r.register]}
              </option>
            ))}
          </select>
        )}

        {buren && (
          <p className="text-sm text-slate-700">
            Toegestaan tussen vorige stand{" "}
            {buren.vorige
              ? `${buren.vorige.waarde} (${buren.vorige.opnamedatum})`
              : "—"}{" "}
            en volgende stand{" "}
            {buren.volgende
              ? `${buren.volgende.waarde} (${buren.volgende.opnamedatum})`
              : "—"}
            .
          </p>
        )}

        {register && (
          <>
            <input
              inputMode="decimal"
              className="w-full rounded-lg border p-3"
              placeholder="Juiste stand"
              value={waarde}
              onChange={(e) => setWaarde(e.target.value)}
            />
            <textarea
              className="w-full rounded-lg border p-3"
              placeholder="Reden van de correctie (verplicht)"
              value={reden}
              onChange={(e) => setReden(e.target.value)}
            />
            <button
              type="button"
              disabled={bezig || !waarde.trim() || !reden.trim()}
              onClick={() => void opslaan()}
              className="w-full rounded-xl bg-amber-700 px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              {bezig ? "Opslaan..." : "Correctie opslaan"}
            </button>
          </>
        )}

        {fout && <p className="font-semibold text-red-700">{fout}</p>}
        {melding && <p className="text-emerald-800">Gecorrigeerd. {melding}</p>}
      </div>
    </details>
  );
}
