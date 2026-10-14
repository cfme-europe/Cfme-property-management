import Link from "next/link";
import {
  getEnergieAnalyseBrondata,
  getEnergieUitbreiding,
} from "@/services/energieanalyse-server";
import {
  berekenBruikbareVerbruiksraming,
  bouwEnergiePortfolioAnalyse,
  ongedekteMeetperioden,
  sorteerEnergieAnalyseRijenOpVerbruiksraming,
  type EnergieAnalyseRij,
  type Energiedrager,
} from "@/lib/energie/portfolio-analyse";
import { ENERGIE_ANALYSE_STARTDATUM, vorigeDag } from "@/lib/energie/rekenregels";
import {
  EnergieSelectieValidatieFout,
  leesSelectie,
  type Parameters,
} from "@/lib/energie/selectie";
import { berekenEnergiekosten } from "@/lib/energie/tarieven";
import EnergieAnalyseFilterFormulier from "@/components/energie/EnergieAnalyseFilterFormulier";

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
  if (!rij.meetperioden || rij.totaal === null) {
    const reden = rij.meldingen.find((melding) =>
      /onwaarschijnlijk|ontbrekende|teruglopende|meterwissel|dubbele|configuratie|klantwissel/i.test(
        melding,
      ),
    );
    return reden
      ? `Geen bruikbaar verbruik: ${reden}`
      : "Geen bruikbare verbruiksintervallen in deze periode.";
  }
  if (!rij.persoonsdagen)
    return "Er zijn geen persoonsdagen gekoppeld aan het bruikbare verbruik; de persoonsnorm is daarom onbekend.";
  if (
    rij.intervallen.some(
      (interval) =>
        interval.bezettingsconflict &&
        interval.betrouwbaar &&
        interval.waarde !== null,
    )
  ) {
    return (
      rij.intervallen
        .flatMap((interval) => interval.meldingen)
        .find((melding) =>
          melding.startsWith(
            "Bewonersadministratie en meteropname spreken elkaar tegen",
          ),
        ) ?? "Bewonersregistratie en meteropname zijn inconsistent."
    );
  }
  if (rij.dekking_percentage < 100)
    return `Raming op basis van ${getal(rij.dekking_percentage, 1)}% dekking; de resterende dagen zijn niet gemeten.`;
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
  selectieVanaf,
  selectieTot,
}: {
  rij: EnergieAnalyseRij;
  eenheid: string;
  dagen: number;
  drager: Energiedrager;
  maximum: number;
  tarieven: Awaited<ReturnType<typeof getEnergieUitbreiding>>["tarieven"];
  selectieVanaf: string;
  selectieTot: string;
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
  const verbruiksraming = berekenBruikbareVerbruiksraming(rij, dagen);
  const beknopteUitleg = uitleg(rij, dagen);
  const prorata = rij.intervallen.some((interval) => interval.geschat);
  const ongedekte = ongedekteMeetperioden(
    rij.intervallen,
    selectieVanaf,
    selectieTot,
  );

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
            aria-label={`${rij.adres}: ${
              verbruiksraming === null
                ? "geen berekende waarde"
                : `${getal(verbruiksraming.per_persoon_per_periode)} ${eenheid} per persoon in de gekozen periode`
            }`}
          >
            <div
              className="h-full rounded-full bg-emerald-700"
              style={{
                width: `${
                  verbruiksraming === null || maximum <= 0
                    ? 0
                    : Math.max(
                        0,
                        Math.min(
                          100,
                          (verbruiksraming.per_persoon_per_periode / maximum) *
                            100,
                        ),
                      )
                }%`,
              }}
            />
          </div>
          <strong className="min-w-28 text-right text-sm">
            {getal(verbruiksraming?.per_persoon_per_periode ?? null)} {eenheid}
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
          {rij.dekking_percentage < 100
            ? `Tijdsdekking: ${getal(rij.dekking_percentage, 1)}%`
            : `100% tijdsdekking${prorata ? " · naar rato berekend" : ""}`}
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
        {kosten.totaal === null && (
          <Link
            href={`/bedrijven/energieanalyse/beheer?${new URLSearchParams({ woning_id: String(rij.woning_id) })}#energie-prijsinvoer`}
            className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 font-semibold text-white underline-offset-4 hover:underline"
          >
            Tarieven controleren of invoeren voor {rij.adres}
          </Link>
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
              (bijbehorende persoonsdagen ÷ 7) × {dagen} geselecteerde dagen ÷
              7. Bij gedeeltelijke dekking is de periodewaarde een raming;
              ongedekte dagen zijn niet gemeten. Intervallen zijn halfopen;
              grensintervallen worden naar rato verdeeld.
            </p>
            <div className="mt-2 space-y-2">
              <p className="text-sm text-slate-600">
                Selectiegrenzen: {selectieVanaf} t/m{" "}
                {vorigeDag(selectieTot)} (einddatum exclusief in de berekening).
              </p>
              {rij.intervallen.map((interval, index) => (
                <div
                  key={`${interval.bronVanaf}-${interval.bronTot}-${index}`}
                  className="rounded-lg bg-slate-50 p-3 text-sm"
                >
                  <p>
                    {interval.bronVanaf}–{interval.bronTot} →{" "}
                    {interval.vanDatum}–{interval.totDatum} (eind exclusief)
                  </p>
                  <p className="font-medium">
                    {interval.betrouwbaar && interval.waarde !== null
                      ? "Meegeteld als gemeten interval"
                      : "Uitgesloten van gemeten dekking"}
                  </p>
                  <p>
                    {getal(interval.waarde)} {eenheid} · {interval.dagen} dagen
                    {interval.geschat ? " · naar rato" : ""}
                  </p>
                  {interval.bronVelden?.length ? (
                    <p className="text-xs text-slate-600">
                      Gebruikte bronvelden: {interval.bronVelden.join(", ")}
                    </p>
                  ) : null}
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
              {ongedekte.map((periode, index) => (
                <div
                  key={`${periode.vanDatum}-${periode.totDatum}-${index}`}
                  className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
                >
                  <p>
                    Ongedekt: {periode.vanDatum}–{periode.totDatum} (einddatum
                    exclusief); dit is geen gemeten verbruik.
                  </p>
                  <p className="mt-1">{periode.reden}</p>
                </div>
              ))}
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
  const vanaf = selectie.vanaf;
  const tot = selectie.totEnMet;
  const woningIds = selectie.woningIds ?? [];
  const analyses = validatiefout
    ? []
    : [
        bouwEnergiePortfolioAnalyse(bron, {
          ...selectie,
          niveau: "totaal",
          drager: selectie.drager,
          vanaf,
          totEnMet: tot,
          woningIds,
          bedrijfIds: selectie.bedrijfIds ?? [],
          modus: "schatting",
          kwaliteit: "alle",
          minimaleDekking: 0,
          archief: false,
        }),
      ];
  const bedrijven = bron.bedrijven;
  const beschikbareWoningen = bron.woningen.filter(
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
  const woningOptions = [
    ...beschikbareWoningen.map((woning) => ({
      ...woning,
      beschikbaar: true,
    })),
    ...bron.woningen
      .filter(
        (woning) =>
          woningIds.includes(woning.id) &&
          !beschikbareWoningen.some((beschikbaar) => beschikbaar.id === woning.id),
      )
      .map((woning) => ({ ...woning, beschikbaar: false })),
  ];
  const maximumDatum = new Date().toISOString().slice(0, 10);
  const vanafFormulier =
    selectie.vanaf < ENERGIE_ANALYSE_STARTDATUM
      ? ENERGIE_ANALYSE_STARTDATUM
      : selectie.vanaf;
  const totEnMetFormulier = Math.max(
    Date.parse(`${ENERGIE_ANALYSE_STARTDATUM}T00:00:00Z`),
    Math.min(
      Date.parse(`${maximumDatum}T00:00:00Z`),
      Date.parse(`${vorigeDag(selectie.totEnMet)}T00:00:00Z`),
    ),
  );
  const dagen = Math.max(
    1,
    (Date.parse(`${tot}T00:00:00Z`) - Date.parse(`${vanaf}T00:00:00Z`)) /
      86_400_000,
  );
  const verbruiksramingen = sorteerEnergieAnalyseRijenOpVerbruiksraming(
    analyses[0]?.rijen ?? [],
    dagen,
  ).map((rij) => ({
      rij,
      raming: berekenBruikbareVerbruiksraming(rij, dagen),
    }));
  const maximum = Math.max(
    0,
    ...verbruiksramingen.flatMap(({ raming }) =>
      raming ? [raming.per_persoon_per_periode] : [],
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
          <Link
            href="/bedrijven/energieanalyse/beheer"
            className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white"
          >
            Prijzen invoeren
          </Link>
        </header>
        <EnergieAnalyseFilterFormulier
          key={`${selectie.bedrijfIds?.join(",") ?? ""}:${woningIds.join(",")}:${vanafFormulier}:${totEnMetFormulier}:${selectie.drager}:${validatiefout}`}
          bedrijven={bedrijven}
          woningen={woningOptions}
          bedrijfId={selectie.bedrijfIds?.[0]}
          woningIds={woningIds}
          vanaf={vanafFormulier}
          totEnMet={new Date(totEnMetFormulier).toISOString().slice(0, 10)}
          drager={selectie.drager}
          minimum={ENERGIE_ANALYSE_STARTDATUM}
          maximum={maximumDatum}
          validationError={validatiefout || undefined}
        />
        {analyses.map((analyse) => (
          <section key={analyse.selectie.drager} className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold">
                  {productNamen[analyse.selectie.drager]}
                </h2>
                <p className="text-sm text-slate-600">
                  {analyse.selectie.vanaf} t/m{" "}
                  {vorigeDag(analyse.selectie.totEnMet)} · {analyse.eenheid}{" "}
                  per persoon in deze periode
                </p>
              </div>
              <p className="text-sm text-slate-600">
                Balken gebruiken dezelfde {analyse.eenheid}-schaal.
              </p>
            </div>
            {verbruiksramingen.map(({ rij, raming }) => (
              <div key={rij.woning_id}>
                <Pandrij
                  rij={rij}
                  eenheid={analyse.eenheid}
                  dagen={dagen}
                  drager={analyse.selectie.drager}
                  maximum={maximum}
                  tarieven={uitbreiding.tarieven}
                  selectieVanaf={selectie.vanaf}
                  selectieTot={selectie.totEnMet}
                />
                {raming !== null && maximum > 0 && (
                  <span className="sr-only">
                    {getal(
                      ((raming.per_persoon_per_periode / maximum) * 100),
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
      </div>
    </main>
  );
}
