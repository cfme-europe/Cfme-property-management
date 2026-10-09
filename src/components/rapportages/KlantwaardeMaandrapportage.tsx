import {
  alsObject,
  tekst,
} from "@/lib/rapportages/zakelijke-rapportage";
import {
  bouwKlantwaardeRapportage,
} from "@/lib/rapportages/klantwaarde-rapportage";
import type { Maandrapportage } from "@/types/maandrapportage";

function korteDatum(waarde: string): string {
  if (!waarde) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${waarde}T00:00:00Z`));
}

function verbruiksgetal(waarde: number | null): string {
  if (waarde === null) return "Geen meting";
  return new Intl.NumberFormat("nl-NL", {
    maximumFractionDigits: 2,
  }).format(waarde);
}

function RapportKop({
  rapportage,
  pagina,
}: {
  rapportage: Maandrapportage;
  pagina: number;
}) {
  const data = rapportage.rapport_data;
  const woning = alsObject(data.woning);
  const periode = alsObject(data.rapportperiode);

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-emerald-300 pb-5">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
          CFME Control
        </p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">
          Managementrapportage klant
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {tekst(woning, "adres")} · {korteDatum(tekst(periode, "vanaf"))} t/m {korteDatum(tekst(periode, "tot_en_met"))}
        </p>
      </div>
      <span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white">
        Pagina {pagina} van 2
      </span>
    </header>
  );
}

export default function KlantwaardeMaandrapportage({
  rapportage,
}: {
  rapportage: Maandrapportage;
}) {
  const waarde = bouwKlantwaardeRapportage(
    rapportage.rapport_data,
  );

  const kpis = [
    ["Inspecties", waarde.inspecties, "Preventieve controle"],
    ["Opgelost", waarde.opgelost, "In deze rapportmaand"],
    [
      "Gemiddelde oplostijd",
      waarde.gemiddelde_oplostijd_dagen === null
        ? "—"
        : `${waarde.gemiddelde_oplostijd_dagen} dag${waarde.gemiddelde_oplostijd_dagen === 1 ? "" : "en"}`,
      "Van melding tot oplossing",
    ],
    ["Nog open", waarde.open_einde_periode, "Stand einde maand"],
  ] as const;

  return (
    <div className="mt-8 space-y-8 print:space-y-0">
      <section className="mx-auto min-h-[900px] max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:min-h-0 print:break-after-page print:rounded-none print:border-0 print:shadow-none">
        <RapportKop rapportage={rapportage} pagina={1} />

        <div className="mt-8 rounded-2xl bg-slate-950 p-7 text-white">
          <p className="text-sm font-bold uppercase tracking-wider text-emerald-300">
            CFME-meerwaarde in één oogopslag
          </p>
          <h3 className="mt-2 text-3xl font-black">
            Problemen zichtbaar, opgevolgd en aantoonbaar opgelost
          </h3>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map(([label, getal, toelichting]) => (
            <article key={label} className="rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-black text-emerald-700">{getal}</p>
              <p className="mt-1 text-xs text-slate-500">{toelichting}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-emerald-50 p-6">
            <h3 className="text-xl font-black text-slate-950">
              Wat CFME deze maand bereikte
            </h3>
            <ul className="mt-4 space-y-3">
              {waarde.meerwaarde.map((regel) => (
                <li key={regel} className="flex gap-3 text-sm text-slate-800">
                  <span className="font-black text-emerald-700">✓</span>
                  {regel}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 p-6">
            <h3 className="text-xl font-black text-slate-950">Opvolging</h3>
            <dl className="mt-4 space-y-4 text-sm">
              <div className="flex justify-between gap-4"><dt>Nieuwe meldingen</dt><dd className="font-bold">{waarde.ontvangen}</dd></div>
              <div className="flex justify-between gap-4"><dt>Opgelost in de maand</dt><dd className="font-bold">{waarde.opgelost}</dd></div>
              <div className="flex justify-between gap-4"><dt>Dezelfde dag opgelost</dt><dd className="font-bold">{waarde.dezelfde_dag_opgelost}</dd></div>
              <div className="flex justify-between gap-4 border-t pt-4"><dt>Oplossingspercentage</dt><dd className="font-black text-emerald-700">{waarde.oplossingspercentage === null ? "—" : `${waarde.oplossingspercentage}%`}</dd></div>
            </dl>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-xl font-black text-slate-950">
                Energieverbruik versus vorige periode
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Verbruik per persoon per week; zo blijft ontwikkeling eerlijk vergelijkbaar.
              </p>
            </div>
            <div className="flex gap-4 text-xs text-slate-500">
              <span><i className="mr-1 inline-block h-2 w-3 rounded bg-slate-300" />Vorige</span>
              <span><i className="mr-1 inline-block h-2 w-3 rounded bg-emerald-600" />Huidige</span>
            </div>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {waarde.energie.map((item) => {
              const maximum = Math.max(item.huidig ?? 0, item.vorig ?? 0, 1);
              const vorigBreedte = `${Math.round(((item.vorig ?? 0) / maximum) * 100)}%`;
              const huidigBreedte = `${Math.round(((item.huidig ?? 0) / maximum) * 100)}%`;
              return (
                <article key={item.sleutel}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-950">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.eenheid} p.p. per week</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${item.verschil_percentage !== null && item.verschil_percentage > 0 ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>
                      {item.verschil_percentage === null ? "Geen vergelijking" : `${item.verschil_percentage >= 0 ? "+" : ""}${item.verschil_percentage}%`}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-slate-300" style={{ width: vorigBreedte }} /></div>
                    <div className="h-3 rounded-full bg-emerald-100"><div className="h-3 rounded-full bg-emerald-600" style={{ width: huidigBreedte }} /></div>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    {verbruiksgetal(item.vorig)} → <strong>{verbruiksgetal(item.huidig)}</strong>
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      </section>

      <section className="mx-auto min-h-[900px] max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:min-h-0 print:rounded-none print:border-0 print:shadow-none">
        <RapportKop rapportage={rapportage} pagina={2} />
        <h3 className="mt-8 text-2xl font-black text-slate-950">
          Probleem → actie → oplossing
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Herleidbare voorbeelden uit de rapportmaand, maximaal zes regels.
        </p>

        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
          {waarde.oplossingen.length === 0 ? (
            <p className="p-6 text-sm text-slate-600">Geen afgeronde problemen in deze rapportmaand.</p>
          ) : (
            waarde.oplossingen.map((item) => (
              <article key={`${item.titel}-${item.oplosdatum}`} className="grid gap-3 border-b border-slate-200 p-4 last:border-b-0 md:grid-cols-[1fr_1.4fr_auto]">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Probleem</p>
                  <p className="mt-1 font-bold text-slate-950">{item.titel}</p>
                  <p className="mt-1 text-xs text-slate-500">Gemeld {korteDatum(item.melddatum)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Oplossing</p>
                  <p className="mt-1 text-sm text-slate-700">{item.oplossing}</p>
                </div>
                <div className="md:text-right">
                  <p className="text-xs font-bold uppercase text-slate-500">Doorlooptijd</p>
                  <p className="mt-1 text-lg font-black text-emerald-700">{item.doorlooptijd_dagen} dag{item.doorlooptijd_dagen === 1 ? "" : "en"}</p>
                  <p className="text-xs text-slate-500">Opgelost {korteDatum(item.oplosdatum)}</p>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="mt-8 rounded-2xl bg-slate-950 p-7 text-white">
          <h3 className="text-xl font-black">Conclusie voor de klant</h3>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            CFME maakte deze maand {waarde.ontvangen} nieuwe melding{waarde.ontvangen === 1 ? "" : "en"} zichtbaar, rondde {waarde.opgelost} probleem{waarde.opgelost === 1 ? "" : "en"} aantoonbaar af en bewaakte de resterende werkvoorraad. De getoonde oplostijd is gemeten van melddatum tot geregistreerde oplossing.
          </p>
        </div>
      </section>
    </div>
  );
}
