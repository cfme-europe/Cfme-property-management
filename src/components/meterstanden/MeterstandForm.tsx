"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createMeterstand,
  updateMeterstand,
} from "@/services/meterstanden";
import type {
  Meterstand,
  MeterstandInvoer,
} from "@/types/meterstand";

type Props = {
  woningId: number;
  standaardBewonersAantal: number;
  meterstand?: Meterstand;
};

function nummerOfNull(waarde: string): number | null {
  const schoon = waarde.trim();

  if (!schoon) {
    return null;
  }

  return Number(schoon.replace(",", "."));
}

export default function MeterstandForm({
  woningId,
  standaardBewonersAantal,
  meterstand,
}: Props) {
  const router = useRouter();

  const [opnamedatum, setOpnamedatum] = useState(
    meterstand?.opnamedatum ??
      new Date().toISOString().slice(0, 10)
  );
  const [bewonersAantal, setBewonersAantal] = useState(
    String(
      meterstand?.bewoners_aantal ??
        standaardBewonersAantal
    )
  );
  const [elektriciteit, setElektriciteit] = useState(
    meterstand?.elektriciteit_kwh !== null &&
      meterstand?.elektriciteit_kwh !== undefined
      ? String(meterstand.elektriciteit_kwh)
      : ""
  );
  const [gas, setGas] = useState(
    meterstand?.gas_m3 !== null &&
      meterstand?.gas_m3 !== undefined
      ? String(meterstand.gas_m3)
      : ""
  );
  const [water, setWater] = useState(
    meterstand?.water_m3 !== null &&
      meterstand?.water_m3 !== undefined
      ? String(meterstand.water_m3)
      : ""
  );
  const [opgenomenDoor, setOpgenomenDoor] = useState(
    meterstand?.opgenomen_door ?? ""
  );
  const [opmerkingen, setOpmerkingen] = useState(
    meterstand?.opmerkingen ?? ""
  );
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const invoerClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600";

  async function opslaan(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setBezig(true);
    setFout("");

    const invoer: MeterstandInvoer = {
      woning_id: woningId,
      opnamedatum,
      bewoners_aantal: Number(bewonersAantal),
      elektriciteit_kwh: nummerOfNull(elektriciteit),
      gas_m3: nummerOfNull(gas),
      water_m3: nummerOfNull(water),
      opgenomen_door: opgenomenDoor,
      opmerkingen,
    };

    try {
      if (meterstand) {
        await updateMeterstand(meterstand.id, invoer);
      } else {
        await createMeterstand(invoer);
      }

      router.push(`/woningen/${woningId}`);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Meterstand opslaan mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

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
            Opnamedatum *
          </span>

          <input
            required
            type="date"
            value={opnamedatum}
            onChange={(event) =>
              setOpnamedatum(event.target.value)
            }
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Aantal bewoners *
          </span>

          <input
            required
            type="number"
            min="0"
            step="1"
            value={bewonersAantal}
            onChange={(event) =>
              setBewonersAantal(event.target.value)
            }
            className={invoerClass}
          />
        </label>

        <label>
          <span className="mb-1 block text-sm font-medium">
            Opgenomen door
          </span>

          <input
            value={opgenomenDoor}
            onChange={(event) =>
              setOpgenomenDoor(event.target.value)
            }
            className={invoerClass}
            placeholder="Naam medewerker"
          />
        </label>
      </div>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold">
          Cumulatieve meterstanden
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Vul minimaal één stand in. Gebruik de actuele
          totaalstand van de meter.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label>
            <span className="mb-1 block text-sm font-medium">
              Elektriciteit (kWh)
            </span>

            <input
              inputMode="decimal"
              type="number"
              min="0"
              step="0.001"
              value={elektriciteit}
              onChange={(event) =>
                setElektriciteit(event.target.value)
              }
              className={invoerClass}
              placeholder="0,000"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Gas (m³)
            </span>

            <input
              inputMode="decimal"
              type="number"
              min="0"
              step="0.001"
              value={gas}
              onChange={(event) =>
                setGas(event.target.value)
              }
              className={invoerClass}
              placeholder="0,000"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Water (m³)
            </span>

            <input
              inputMode="decimal"
              type="number"
              min="0"
              step="0.001"
              value={water}
              onChange={(event) =>
                setWater(event.target.value)
              }
              className={invoerClass}
              placeholder="0,000"
            />
          </label>
        </div>
      </section>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">
          Opmerkingen
        </span>

        <textarea
          rows={5}
          value={opmerkingen}
          onChange={(event) =>
            setOpmerkingen(event.target.value)
          }
          className={invoerClass}
          placeholder="Bijzonderheden over de opname of meter."
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          disabled={bezig}
          className="rounded-xl bg-emerald-700 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {bezig
            ? "Opslaan..."
            : meterstand
              ? "Wijzigingen opslaan"
              : "Meterstand opslaan"}
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(`/woningen/${woningId}`)
          }
          className="rounded-xl border border-slate-300 px-6 py-3 font-medium"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
