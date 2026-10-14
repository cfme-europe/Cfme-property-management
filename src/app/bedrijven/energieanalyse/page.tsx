import Link from "next/link";
import {
  getEnergieAnalyseBrondata,
  getEnergieUitbreiding,
} from "@/services/energieanalyse-server";
import {
  bouwEnergiePortfolioAnalyse,
  type EnergieAnalyseRij,
  type Energiedrager,
} from "@/lib/energie/portfolio-analyse";
import {
  EnergieSelectieValidatieFout,
  leesSelectie,
  type Parameters,
} from "@/lib/energie/selectie";
import { berekenEnergiekosten } from "@/lib/energie/tarieven";

export const dynamic = "force-dynamic";

const productNamen: Record<Energiedrager, string> = {
  elektriciteit: "Elektriciteit totaal",
  dagstroom: "Dagstroom",
  nachtstroom: "Nachtstroom",
  gas: "Gas",
  water: "Water",
};
const getal = (waarde: number | null, decimalen = 2) =>
  waarde === null
    ? "—"
    : new Intl.NumberFormat("nl-NL", {
        maximumFractionDigits: decimalen,
      }).format(waarde);

function uitleg(rij: EnergieAnalyseRij, totaalDagen: number) {
  if (rij.dekking_percentage < 100)
    return `${getal(rij.dekking_percentage)}% tijdsdekking; voor een volledig vergelijkbaar cijfer zijn meetgegevens over de hele periode nodig.`;
  if (!rij.persoonsdagen)
    return "Bewonersgegevens ontbreken; persoonsverbruik en persoonskosten zijn daarom niet berekend.";
  if (rij.meldingen.some((melding) => melding.includes("spreken elkaar tegen")))
    return "De bewonersregistratie wijkt af van de meteropname; controleer de bezetting.";
  if (rij.persoonsdagen < totaalDagen)
    return "De bewonersregistratie dekt niet alle geselecteerde dagen.";
  return "";
}

function Pandrij({
  rij,
  eenheid,
  dagen,
  drager,
  maximum,
  tarieven,
}: {
  rij: EnergieAnalyseRij;
  eenheid: string;
  dagen: number;
  drager: Energiedrager;
  maximum: number;
  tarieven: Awaited<ReturnType<typeof getEnergieUitbreiding>>["tarieven"];
}) {
  const register =
    drager === "dagstroom"
      ? "dag"
      : drager === "nachtstroom"
        ? "nacht"
        : undefined;
  const kosten = berekenEnergiekosten(
    rij.intervallen,
    tarieven,
    drager,
    eenheid,
    register,
  );
  const kostenPerPersoonPerWeek =
    kosten.totaal !== null &&
    rij.persoonsdagen > 0 &&
    rij.dekking_percentage === 100 &&
    rij.per_persoon_per_periode !== null
      ? kosten.totaal / (rij.persoonsdagen / 7)
      : null;
  const beknopteUitleg = uitleg(rij, dagen);
  const prorata = rij.intervallen.some((interval) => interval.geschat);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-[minmax(11rem,1fr)_minmax(10rem,2fr)_auto] sm:items-center">
        <div>
          <Link
            href={`/woningen/${rij.woning_id}`}
            className="inline-flex min-h-11 items-center font-bold text-emerald-800 underline decoration-emerald-300 underline-offset-4"
          >
            {rij.adres}
          </Link>
          <p className="text-sm text-slate-600">
            {rij.bedrijven.join(", ") || "Geen klantregistratie"}
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="h-5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100"
            role="img"
            aria-label={`${rij.adres}: ${getal(rij.per_persoon_per_periode)} ${eenheid} per persoon in de gekozen periode`}
          >
            <div
              className="h-full rounded-full bg-emerald-700"
              style={{
                width: `${
                  rij.per_persoon_per_periode === null || maximum <= 0
                    ? 0
                    : Math.max(
                        0,
                        Math.min(
                          100,
                          (rij.per_persoon_per_periode / maximum) * 100,
                        ),
                      )
                }%`,
              }}
            />
          </div>
          <strong className="min-w-28 text-right text-sm">
            {getal(rij.per_persoon_per_periode)} {eenheid}
          </strong>
        </div>
        <div className="rounded-xl bg-emerald-50 px-3 py-2 sm:min-w-48">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
            Kosten per persoon / week
          </p>
          <p className="text-lg font-bold text-emerald-950">
            {kostenPerPersoonPerWeek === null || kosten.valuta === null
              ? "—"
              : `${getal(kostenPerPersoonPerWeek)} ${kosten.valuta}`}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
        <span>
          {getal(rij.dekking_percentage, 1)}% tijdsdekking
          {rij.dekking_percentage === 100 && prorata
            ? " · naar rato berekend"
            : ""}
        </span>
        <span>{rij.persoonsdagen} persoonsdagen</span>
        {beknopteUitleg && (
          <span className="font-medium text-amber-900">{beknopteUitleg}</span>
        )}
        {kosten.totaal === null && (
          <span className="font-medium text-amber-900">
            Kosten onvolledig: {kosten.ontbrekend[0] ?? "tarief ontbreekt"}
          </span>
        )}
      </div>
      <details className="mt-2 border-t border-slate-100 pt-2">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-emerald-800">
          Details · bronnen, meetintervallen en tarieven
        </summary>
        <div className="grid gap-4 pt-2 lg:grid-cols-2">
          <section>
            <h3 className="font-semibold">Meetintervallen en rekenstappen</h3>
            <p className="mt-1 text-sm text-slate-600">
              Verbruik per persoon over deze periode = bruikbaar verbruik ÷
              (persoonsdagen ÷ {dagen} geselecteerde dagen). Intervallen zijn
              halfopen; grensintervallen worden naar rato verdeeld.
            </p>
            <div className="mt-2 space-y-2">
              {rij.intervallen.map((interval, index) => (
                <div
                  key={`${interval.bronVanaf}-${interval.bronTot}-${index}`}
                  className="rounded-lg bg-slate-50 p-3 text-sm"
                >
                  <p>
                    {interval.bronVanaf}–{interval.bronTot} →{" "}
                    {interval.vanDatum}–{interval.totDatum} (eind exclusief)
                  </p>
                  <p>
                    {getal(interval.waarde)} {eenheid} · {interval.dagen} dagen
                    {interval.geschat ? " · naar rato" : ""}
                  </p>
                  <p className="text-xs text-slate-600">
                    Meteropnamen: {interval.bronIds.join(", ") || "onbekend"}
                  </p>
                  {interval.meldingen.map((melding) => (
                    <p key={melding} className="mt-1 text-xs text-amber-900">
                      {melding}
                    </p>
                  ))}
                </div>
              ))}
              {!rij.intervallen.length && (
                <p className="text-sm text-slate-600">
                  Geen bruikbaar meetinterval in deze selectie.
                </p>
              )}
            </div>
          </section>
          <section>
            <h3 className="font-semibold">Kosten en prijsdekking</h3>
            <p className="mt-1 text-sm">
              {kosten.totaal === null
                ? `Bekend subtotaal: ${getal(kosten.bekend_subtotaal)} ${kosten.valuta ?? ""}; niet gedekte delen zijn niet als €0 gerekend.`
                : `Totaal: ${getal(kosten.totaal)} ${kosten.valuta ?? ""} · ${getal(kostenPerPersoonPerWeek)} ${kosten.valuta ?? ""} per persoon per week.`}
            </p>
            <div className="mt-2 space-y-2">
              {kosten.regels.map((regel, index) => (
                <div
                  key={`${regel.tarief_id}-${regel.vanaf}-${regel.soort}-${index}`}
                  className="rounded-lg bg-slate-50 p-3 text-sm"
                >
                  <p>
                    {regel.vanaf}–{regel.tot} · {regel.soort}:{" "}
                    {getal(regel.hoeveelheid, 3)} × {regel.eenheidsprijs} ={" "}
                    {getal(regel.totaal)} {regel.valuta}
                  </p>
                  <p className="text-xs text-slate-600">
                    {regel.bron} · tariefversie {regel.tarief_id} ·{" "}
                    {regel.inclusief_btw ? "inclusief" : "exclusief"} btw
                  </p>
                </div>
              ))}
              {kosten.ontbrekend.map((melding) => (
                <p key={melding} className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
                  {melding}
                </p>
              ))}
            </div>
          </section>
        </div>
      </details>
    </article>
  );
}

export default async function EnergieanalysePage({
  searchParams,
}: {
  searchParams: Promise<Parameters>;
}) {
  const [parameters, bron, uitbreiding] = await Promise.all([
    searchParams,
    getEnergieAnalyseBrondata(),
    getEnergieUitbreiding(),
  ]);
  bron.meterconfiguraties = uitbreiding.configuraties;
  let selectie: ReturnType<typeof leesSelectie>["selectie"];
  let validatiefout = "";
  try {
    selectie = leesSelectie(parameters, bron).selectie;
  } catch (error) {
    validatiefout =
      error instanceof EnergieSelectieValidatieFout || error instanceof Error
        ? error.message
        : "Ongeldige selectie.";
    selectie = leesSelectie({}, bron).selectie;
  }
  const vanaf = Array.isArray(parameters.vanaf)
    ? ""
    : (parameters.vanaf ?? selectie.vanaf);
  const tot = Array.isArray(parameters.tot)
    ? ""
    : (parameters.tot ?? selectie.totEnMet);
  const woningIds = Array.isArray(parameters.woning)
    ? parameters.woning
    : parameters.woning
      ? [parameters.woning]
      : [];
  const analyses = validatiefout
    ? []
    : [
        bouwEnergiePortfolioAnalyse(bron, {
          ...selectie,
          niveau: "totaal",
          drager: selectie.drager,
          vanaf,
          totEnMet: tot,
          woningIds: woningIds.map(Number),
          bedrijfIds: selectie.bedrijfIds ?? [],
          modus: "schatting",
          kwaliteit: "alle",
          minimaleDekking: 0,
          archief: false,
        }),
      ];
  const labels = {
    elektriciteit: "Elektriciteit totaal",
    dagstroom: "Dagstroom",
    nachtstroom: "Nachtstroom",
    gas: "Gas",
    water: "Water",
  } satisfies Record<Energiedrager, string>;
  const bedrijven = bron.bedrijven;
  const woningOptions = bron.woningen.filter(
    (woning) =>
      !selectie.bedrijfIds?.length ||
      bron.verhuurperioden.some(
        (huur) =>
          huur.woning_id === woning.id &&
          selectie.bedrijfIds!.includes(huur.bedrijf_id) &&
          (!huur.startdatum || huur.startdatum < tot) &&
          (!huur.werkelijke_einddatum || huur.werkelijke_einddatum > vanaf),
      ),
  );
  const dagen = Math.max(
    1,
    (Date.parse(`${tot}T00:00:00Z`) - Date.parse(`${vanaf}T00:00:00Z`)) /
      86_400_000,
  );
  const sorted = analyses[0]?.rijen ?? [];
  const maximum = Math.max(
    0,
    ...sorted.flatMap((rij) =>
      rij.per_persoon_per_periode === null
        ? []
        : [rij.per_persoon_per_periode],
    ),
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-950 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header>
          <Link href="/bedrijven" className="text-sm font-semibold text-emerald-800">
            ← Bedrijven
          </Link>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Energieanalyse</h1>
        </header>
        <form
          method="get"
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <label className="text-sm font-semibold">
            Klant
            <select
              name="bedrijf"
              defaultValue={selectie.bedrijfIds?.[0]?.toString() ?? ""}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
            >
              <option value="">Alle klanten</option>
              {bedrijven.map((bedrijf) => (
                <option key={bedrijf.id} value={bedrijf.id}>
                  {bedrijf.naam}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Panden
            <select
              name="woning"
              multiple
              size={Math.min(4, Math.max(2, woningOptions.length))}
              defaultValue={woningIds}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              {woningOptions.map((woning) => (
                <option key={woning.id} value={woning.id}>
                  {woning.adres}
                </option>
              ))}
            </select>
            <span className="font-normal text-slate-500">
              Geen selectie = alle panden
            </span>
          </label>
          <label className="text-sm font-semibold">
            Vanaf (inclusief)
            <input
              name="vanaf"
              type="date"
              defaultValue={vanaf}
              required
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
            />
          </label>
          <label className="text-sm font-semibold">
            Tot (exclusief)
            <input
              name="tot"
              type="date"
              defaultValue={tot}
              required
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
            />
            <span className="font-normal text-slate-500">
              Deze datum telt niet mee.
            </span>
          </label>
          <label className="text-sm font-semibold">
            Energieproduct
            <select
              name="drager"
              defaultValue={selectie.drager}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
            >
              {(Object.keys(labels) as Energiedrager[]).map((drager) => (
                <option key={drager} value={drager}>
                  {labels[drager]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button className="min-h-11 w-full rounded-lg bg-emerald-700 px-4 font-bold text-white">
              Analyse toepassen
            </button>
          </div>
        </form>
        {validatiefout && (
          <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-950">
            Analyse niet toegepast: {validatiefout}
          </p>
        )}
        {analyses.map((analyse) => (
          <section key={analyse.selectie.drager} className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold">
                  {productNamen[analyse.selectie.drager]}
                </h2>
                <p className="text-sm text-slate-600">
                  {analyse.selectie.vanaf} t/m {analyse.selectie.totEnMet}{" "}
                  (einddatum exclusief) · {analyse.eenheid} per persoon in deze
                  periode
                </p>
              </div>
              <p className="text-sm text-slate-600">
                Balken gebruiken dezelfde {analyse.eenheid}-schaal.
              </p>
            </div>
            {analyse.rijen.map((rij) => (
              <div key={rij.woning_id}>
                <Pandrij
                  rij={rij}
                  eenheid={analyse.eenheid}
                  dagen={dagen}
                  drager={analyse.selectie.drager}
                  maximum={maximum}
                  tarieven={uitbreiding.tarieven}
                />
                {rij.per_persoon_per_periode !== null && maximum > 0 && (
                  <span className="sr-only">
                    {getal(
                      (rij.per_persoon_per_periode / maximum) * 100,
                      1,
                    )}
                    % van de schaal
                  </span>
                )}
              </div>
            ))}
            {!analyse.rijen.length && (
              <p className="rounded-xl bg-white p-4 text-slate-700">
                Geen panden gevonden voor deze selectie.
              </p>
            )}
          </section>
        ))}
        {!uitbreiding.beschikbaar && (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
            Prijsgegevens zijn niet beschikbaar. Verbruik wordt getoond, maar
            kosten blijven onbekend totdat de tariefregistratie beschikbaar is.
          </p>
        )}
        <p className="text-right text-sm">
          <Link
            href="/bedrijven/energieanalyse/beheer"
            className="font-semibold text-emerald-800 underline underline-offset-4"
          >
            Eenvoudige prijsinvoer en aanvullende kosten
          </Link>
        </p>
      </div>
    </main>
  );
}
