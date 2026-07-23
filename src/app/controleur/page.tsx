import Link from "next/link";
import { redirect } from "next/navigation";
import ControleStartButton from "@/components/controleur/ControleStartButton";
import UitloggenLink from "@/components/auth/UitloggenLink";
import { getControleurWerkplek, type ControleurWoning } from "@/services/controleurwerkplek-server";

export const dynamic = "force-dynamic";

function datum(waarde: string | null): string {
  if (!waarde) return "Nog niet gecontroleerd";
  return new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${waarde}T00:00:00`));
}

function datumTijd(waarde: string | null): string {
  if (!waarde) return "—";
  return new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(waarde));
}

function volgendeControle(woning: ControleurWoning): Date {
  const basis = woning.laatste_inspectiedatum ?? woning.geldig_vanaf;
  const resultaat = new Date(`${basis}T00:00:00`);
  if (woning.laatste_inspectiedatum) resultaat.setDate(resultaat.getDate() + woning.controlefrequentie_dagen);
  return resultaat;
}

function status(woning: ControleurWoning) {
  if (woning.controlesessie_status === "bezig") return { label: "Bezig", klasse: "bg-blue-100 text-blue-800", volgorde: 0 };
  const vandaag = new Date(); vandaag.setHours(0, 0, 0, 0);
  const verschil = Math.ceil((volgendeControle(woning).getTime() - vandaag.getTime()) / 86400000);
  if (verschil < 0) return { label: `${Math.abs(verschil)} dagen te laat`, klasse: "bg-red-100 text-red-800", volgorde: 1 };
  if (verschil === 0) return { label: "Vandaag", klasse: "bg-amber-100 text-amber-800", volgorde: 2 };
  return { label: `Over ${verschil} dagen`, klasse: "bg-emerald-100 text-emerald-800", volgorde: 3 };
}

function locatieLabel(waarde: ControleurWoning["locatie_status"]): string {
  const labels = { niet_geprobeerd: "Nog niet bepaald", beschikbaar: "Locatie vastgelegd", niet_beschikbaar: "Locatie niet beschikbaar", toestemming_geweigerd: "Locatietoegang geweigerd", fout: "Locatiebepaling mislukt" };
  return waarde ? labels[waarde] : "Nog niet bepaald";
}

export default async function ControleurPage() {
  let werkplek;

  try {
    werkplek = await getControleurWerkplek();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Geen geldige gebruikerssessie."
    ) {
      redirect("/login?volgende=/controleur");
    }

    throw error;
  }
  const naam = werkplek.profiel.volledige_naam ?? werkplek.profiel.email ?? "Controleur";
  const vandaag = new Date(); vandaag.setHours(0, 0, 0, 0);
  const grens = new Date(vandaag); grens.setDate(grens.getDate() + 7);

  const actielijst = werkplek.woningen
    .filter((woning) => woning.controlesessie_status === "bezig" || woning.open_inspectie_id !== null || woning.urgente_meldingen > 0 || volgendeControle(woning) <= grens)
    .sort((a, b) => status(a).volgorde - status(b).volgorde || a.adres.localeCompare(b.adres, "nl"));

  return <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-900 sm:px-6 md:py-8"><div className="mx-auto max-w-5xl"><header className="rounded-3xl bg-slate-950 p-6 text-white shadow-lg md:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">CFME Control</p><h1 className="mt-2 text-3xl font-bold">Mijn controles</h1><p className="mt-2 text-slate-300">{naam}</p></div><UitloggenLink /></div><div className="mt-6 rounded-2xl bg-slate-800 p-4"><p className="text-sm text-slate-300">Nu aandacht nodig</p><p className="mt-1 text-3xl font-bold">{actielijst.length}</p></div></header>{actielijst.length === 0 ? <section className="mt-6 rounded-2xl bg-white p-7 shadow-sm"><h2 className="text-xl font-bold">Geen controles open</h2><p className="mt-2 text-slate-600">Er zijn geen gestarte, achterstallige of binnen zeven dagen geplande controles aan jou toegewezen.</p></section> : <div className="mt-6 space-y-5">{actielijst.map((woning) => { const woningStatus = status(woning); return <article key={woning.woning_id} className="rounded-2xl bg-white p-5 shadow-sm md:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-emerald-700">{woning.rayon_naam} · {woning.rayon_code}</p><h2 className="mt-1 text-2xl font-bold">{woning.adres}</h2><p className="mt-1 text-slate-600">{woning.postcode} {woning.plaats}</p></div><span className={`rounded-full px-3 py-1 text-sm font-semibold ${woningStatus.klasse}`}>{woningStatus.label}</span></div><dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl bg-slate-100 p-4"><dt className="text-sm text-slate-500">Laatste controle</dt><dd className="mt-1 font-bold">{datum(woning.laatste_inspectiedatum)}</dd></div><div className="rounded-xl bg-slate-100 p-4"><dt className="text-sm text-slate-500">Volgende controle</dt><dd className="mt-1 font-bold">{datum(volgendeControle(woning).toISOString().slice(0,10))}</dd></div><div className="rounded-xl bg-slate-100 p-4"><dt className="text-sm text-slate-500">Urgente meldingen</dt><dd className="mt-1 font-bold">{woning.urgente_meldingen}</dd></div><div className="rounded-xl bg-slate-100 p-4"><dt className="text-sm text-slate-500">Frequentie</dt><dd className="mt-1 font-bold">{woning.controlefrequentie_dagen} dagen</dd></div></dl>{woning.controlesessie_status === "bezig" && woning.open_inspectie_id ? <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="font-bold text-blue-900">Controle gestart: {datumTijd(woning.gestart_at)}</p><p className="mt-1 text-sm text-blue-800">{locatieLabel(woning.locatie_status)}</p><Link href={`/woningen/${woning.woning_id}/inspecties/${woning.open_inspectie_id}`} className="mt-4 block rounded-xl bg-blue-700 px-5 py-4 text-center font-bold text-white">Doorgaan met controle</Link></div> : <div className="mt-5"><ControleStartButton woningId={woning.woning_id} verhuurperiodeId={woning.verhuurperiode_id} controleurId={werkplek.profiel.id} controleurNaam={naam} openInspectieId={woning.open_inspectie_id} /></div>}</article>; })}</div>}</div></main>;
}
