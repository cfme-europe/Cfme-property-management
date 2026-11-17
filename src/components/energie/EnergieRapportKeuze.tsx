"use client";
import { useActionState } from "react";
import Link from "next/link";
import { bewaarTijdlijnRapport } from "@/app/bedrijven/energieanalyse/tijdlijn-rapport-actions";
export default function EnergieRapportKeuze({
  rapporten,
  panden,
  jaar,
  vergelijkjaar,
  van,
  tot,
  persoon,
  product,
  vergelijk,
  saldo,
}: {
  rapporten: {
    id: number;
    woning_id: number;
    rapportjaar: number;
    rapportmaand: number;
  }[];
  panden: { id: number; adres: string }[];
  jaar: number;
  vergelijkjaar: number;
  van: number;
  tot: number;
  persoon: boolean;
  product: string;
  vergelijk: string;
  saldo: boolean;
}) {
  const [state, action, pending] = useActionState(bewaarTijdlijnRapport, {});
  return (
    <details className="rounded-xl border bg-white p-4">
      <summary className="cursor-pointer font-semibold text-emerald-950">
        Meenemen in klantrapportage
      </summary>
      <p className="my-3 text-sm">
        Maak een vaste kopie van de gekozen maanden, producten en eenheid voor
        het pand en de klant van de onderstaande rapportage. Bij meerdere panden
        maakt u per pand een bijlage. Eerdere rapportversies blijven behouden.
      </p>
      {vergelijk === "pand" && (
        <p className="my-3 text-amber-900">
          Een vergelijking met een ander pand gaat niet mee: deze bijlage bevat
          uitsluitend het rapportpand en zijn klantgegevens.
        </p>
      )}
      {rapporten.length ? (
        <form action={action} className="space-y-3">
          <label className="block">
            Rapportage
            <select
              required
              name="rapportage_id"
              className="block w-full rounded border border-slate-400 bg-white p-3 text-slate-950"
            >
              {rapporten.map((r) => (
                <option key={r.id} value={r.id}>
                  {panden.find((p) => p.id === r.woning_id)?.adres} ·{" "}
                  {r.rapportjaar}-{String(r.rapportmaand).padStart(2, "0")} · #
                  {r.id}
                </option>
              ))}
            </select>
          </label>
          {Object.entries({
            jaar,
            vergelijkjaar,
            van,
            tot,
            persoon: persoon ? "1" : "0",
            product,
            vergelijk,
            saldo: saldo ? "1" : "0",
          }).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <button
            disabled={pending}
            className="rounded-lg bg-emerald-900 px-5 py-3 text-white"
          >
            {pending ? "Momentopname bewaren…" : "Klantbijlage vastleggen"}
          </button>
          {state.fout && (
            <p role="alert" className="text-rose-900">
              {state.fout}
            </p>
          )}
          {state.url && (
            <p role="status">
              Bewaard.{" "}
              <Link className="underline" href={state.url}>
                Open rapportage en kies deze energieversie bij Klantversie
                maken.
              </Link>
            </p>
          )}
        </form>
      ) : (
        <p>
          Voor deze pandselectie zijn geen rapportages beschikbaar. Maak eerst
          de klantrapportage in het woningdossier.
        </p>
      )}
    </details>
  );
}
