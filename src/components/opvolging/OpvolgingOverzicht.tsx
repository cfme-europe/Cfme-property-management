"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateOpvolgitem } from "@/services/opvolging";
import type { OpvolgItem, OpvolgStatus } from "@/types/opvolging";

type Props = { woningId: number; items: OpvolgItem[] };

const statusLabels: Record<OpvolgStatus, string> = {
  open: "Open",
  in_behandeling: "In behandeling",
  afgehandeld: "Afgehandeld",
  niet_relevant: "Niet relevant",
};

const statusKleuren: Record<OpvolgStatus, string> = {
  open: "bg-amber-100 text-amber-900",
  in_behandeling: "bg-blue-100 text-blue-900",
  afgehandeld: "bg-emerald-100 text-emerald-900",
  niet_relevant: "bg-slate-200 text-slate-800",
};

function datum(waarde: string | null): string {
  if (!waarde) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(waarde.length === 10 ? `${waarde}T00:00:00` : waarde));
}

function bronLink(item: OpvolgItem): string | null {
  if (item.melding_id) return `/woningen/${item.woning_id}/meldingen/${item.melding_id}`;
  if (item.taak_ids[0]) return `/woningen/${item.woning_id}/taken/${item.taak_ids[0]}/bewerken`;
  if (item.afwijking_id) return `/woningen/${item.woning_id}/afwijkingen`;
  return null;
}

export default function OpvolgingOverzicht({ woningId, items }: Props) {
  const router = useRouter();
  const [bewerken, setBewerken] = useState<OpvolgItem | null>(null);
  const [status, setStatus] = useState<OpvolgStatus>("open");
  const [verantwoordelijke, setVerantwoordelijke] = useState("");
  const [deadline, setDeadline] = useState("");
  const [oplossing, setOplossing] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const openAantal = items.filter((item) =>
    item.status === "open" || item.status === "in_behandeling",
  ).length;
  const overDeadline = items.filter((item) =>
    (item.status === "open" || item.status === "in_behandeling")
      && item.deadline !== null
      && item.deadline < new Date().toISOString().slice(0, 10),
  ).length;

  function openFormulier(item: OpvolgItem): void {
    setBewerken(item);
    setStatus(item.status);
    setVerantwoordelijke(item.verantwoordelijke ?? "");
    setDeadline(item.deadline ?? "");
    setOplossing(item.oplossing ?? "");
    setFout("");
  }

  async function opslaan(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!bewerken) return;
    setBezig(true);
    setFout("");
    try {
      await updateOpvolgitem(bewerken.bron_type, bewerken.bron_id, woningId, {
        status, verantwoordelijke, deadline: deadline || null, oplossing,
      });
      setBewerken(null);
      router.refresh();
    } catch (error) {
      setFout(error instanceof Error ? error.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <section className="mb-8 rounded-2xl bg-white p-6 shadow" id="opvolging">
      <span id="meldingen" className="scroll-mt-6" />
      <span id="taken" className="scroll-mt-6" />
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Eén werklijst</p>
          <h2 className="mt-1 text-xl font-bold">Opvolging</h2>
          <p className="mt-1 max-w-2xl text-slate-600">
            Meldingen, controleafwijkingen en taken staan hier per kwestie bij elkaar.
          </p>
        </div>
        <Link href={`/woningen/${woningId}/meldingen/nieuw`} className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white">
          Nieuw opvolgpunt
        </Link>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-100 p-4"><p className="text-sm text-slate-600">Openstaand</p><p className="mt-1 text-2xl font-bold">{openAantal}</p></div>
        <div className="rounded-xl bg-red-50 p-4"><p className="text-sm text-red-700">Over deadline</p><p className="mt-1 text-2xl font-bold text-red-900">{overDeadline}</p></div>
        <div className="rounded-xl bg-emerald-50 p-4"><p className="text-sm text-emerald-700">Totaal dossiers</p><p className="mt-1 text-2xl font-bold text-emerald-900">{items.length}</p></div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl bg-slate-100 p-5 text-slate-600">Er zijn nog geen opvolgpunten.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const link = bronLink(item);
            return (
              <article key={item.sleutel} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusKleuren[item.status]}`}>{statusLabels[item.status]}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm capitalize text-slate-700">{item.prioriteit}</span>
                      <span className="text-sm text-slate-500">Bron: {item.bron_type}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-bold">{item.titel}</h3>
                    <p className="mt-1 text-slate-600">{item.omschrijving}</p>
                  </div>
                  <button type="button" onClick={() => openFormulier(item)} className="rounded-xl border border-emerald-700 px-4 py-2 font-medium text-emerald-800">
                    Beheren
                  </button>
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><dt className="text-slate-500">Verantwoordelijke</dt><dd className="font-medium">{item.verantwoordelijke ?? "Nog niet toegewezen"}</dd></div>
                  <div><dt className="text-slate-500">Deadline</dt><dd className="font-medium">{datum(item.deadline)}</dd></div>
                  <div><dt className="text-slate-500">Registraties</dt><dd className="font-medium">{[item.afwijking_id && "afwijking", item.melding_id && "melding", item.taak_ids.length > 0 && `${item.taak_ids.length} taak/taken`].filter(Boolean).join(" · ")}</dd></div>
                  <div><dt className="text-slate-500">Bewijs</dt><dd className="font-medium">{item.bewijs_aantal} bestand(en)</dd></div>
                </dl>

                {item.oplossing && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950"><strong>Afhandeling:</strong> {item.oplossing}</p>}
                {link && <Link href={link} className="mt-4 inline-block font-medium text-emerald-700 hover:underline">Volledig dossier bekijken →</Link>}
              </article>
            );
          })}
        </div>
      )}

      {bewerken && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Opvolgitem beheren">
          <form onSubmit={opslaan} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-sm font-semibold uppercase text-emerald-700">Opvolging beheren</p><h3 className="mt-1 text-xl font-bold">{bewerken.titel}</h3></div>
              <button type="button" onClick={() => setBewerken(null)} className="rounded-lg px-3 py-2 text-slate-600">Sluiten</button>
            </div>
            {fout && <p className="mt-4 rounded-xl bg-red-100 p-3 text-red-900">{fout}</p>}
            <div className="mt-5 space-y-4">
              <label className="block font-medium">Status<select value={status} onChange={(event) => setStatus(event.target.value as OpvolgStatus)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"><option value="open">Open</option><option value="in_behandeling">In behandeling</option><option value="afgehandeld">Afgehandeld</option><option value="niet_relevant">Niet relevant</option></select></label>
              <label className="block font-medium">Verantwoordelijke<input value={verantwoordelijke} onChange={(event) => setVerantwoordelijke(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Naam of organisatie" /></label>
              <label className="block font-medium">Deadline<input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
              <label className="block font-medium">Afhandeling / toelichting<textarea value={oplossing} onChange={(event) => setOplossing(event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="Wat is gedaan, of waarom is dit niet relevant?" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setBewerken(null)} className="rounded-xl border border-slate-300 px-4 py-3">Annuleren</button><button disabled={bezig} className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-60">{bezig ? "Opslaan…" : "Opslaan"}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
