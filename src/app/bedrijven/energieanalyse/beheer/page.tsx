import EnergieInvoer from "@/components/energie/EnergieInvoer";
import { getEnergieVoorschotten } from "@/services/energie-voorschotten-server";
import Link from "next/link";
import {
  getEnergieAnalyseBrondata,
  getEnergieUitbreiding,
} from "@/services/energieanalyse-server";
import { slaEnergieMaatregel, slaEnergieMeterconfiguratie } from "../actions";
import {
  bouwEnergiePortfolioAnalyse,
  type Energiedrager,
} from "@/lib/energie/portfolio-analyse";
import { beoordeelMaatregel } from "@/lib/energie/resultaten";
import EnergieAfzender from "@/components/energie/EnergieAfzender";
const field =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm";
export default async function EnergieBeheer({
  searchParams,
}: {
  searchParams: Promise<{
    fout?: string;
    klaar?: string;
    woning_id?: string | string[];
    panden?: string;
    bedrijf?: string;
    jaar?: string;
  }>;
}) {
  const [bron, ext, params, invoer] = await Promise.all([
    getEnergieAnalyseBrondata(),
    getEnergieUitbreiding(),
    searchParams,
    getEnergieVoorschotten(),
  ]);
  bron.meterconfiguraties = ext.configuraties;
  const initieelWoningId =
    typeof params.woning_id === "string" &&
    /^\d+$/.test(params.woning_id) &&
    bron.woningen.some((woning) => woning.id === Number(params.woning_id))
      ? Number(params.woning_id)
      : undefined;
  const klantId = typeof params.bedrijf === "string" && /^\d+$/.test(params.bedrijf) ? Number(params.bedrijf) : undefined;
  const prijsjaar = typeof params.jaar === "string" && /^\d{4}$/.test(params.jaar) && Number(params.jaar) >= 1900 && Number(params.jaar) <= 2200 ? Number(params.jaar) : new Date().getFullYear();
  const pandIds = typeof params.panden === "string" ? params.panden.split(",").filter(id => /^\d+$/.test(id)).map(Number) : undefined;
  const invoerHuren = bron.verhuurperioden.filter(h => !klantId || h.bedrijf_id === klantId);
  const invoerWoningen = bron.woningen.filter(w => (!pandIds || pandIds.includes(w.id)) && (!klantId || invoerHuren.some(h => h.woning_id === w.id)));
  const product = (
    <label>
      Product
      <select name="product" className={field}>
        <option value="elektriciteit">Elektriciteit · kWh</option>
        <option value="gas">Gas · m³</option>
        <option value="water">Water · m³</option>
      </select>
    </label>
  );
  const woning = (optional = false) => (
    <label>
      Pand
      <select
        name="woning_id"
        required={!optional}
        defaultValue={initieelWoningId?.toString() ?? ""}
        className={field}
      >
        {optional && <option value="">Algemeen / per klant</option>}
        {bron.woningen.map((w) => (
          <option key={w.id} value={w.id}>
            {w.adres}
          </option>
        ))}
      </select>
    </label>
  );
  const input = (
    name: string,
    label: string,
    type = "text",
    required = false,
  ) => (
    <label>
      {label}
      <input name={name} type={type} required={required} className={field} />
    </label>
  );
  const replaced = new Set(ext.maatregelen.map((m) => m.voorganger_id));
  const current = ext.maatregelen.filter((m) => !replaced.has(m.id));
  const cReplaced = new Set(
    ext.configuraties.map((c) => c.voorganger_id).filter(Boolean),
  );
  const currentConfigs = ext.configuraties.filter((c) => !cReplaced.has(c.id));
  return (
    <main className="min-h-screen bg-slate-100 p-5 text-slate-950 sm:p-9">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/bedrijven/energieanalyse" className="text-emerald-800">
          ← Energie-intelligence
        </Link>
        <header>
          <h1 className="text-3xl font-semibold text-emerald-950">
            Energiegegevens invullen
          </h1>
          <p>Prijzen en afspraken voor het informatieve verbruiksoverzicht.</p>
        </header>
        <div id="energie-invoer" />
        <EnergieInvoer
          woningen={invoerWoningen}
          bedrijven={bron.bedrijven}
          huren={invoerHuren}
          prijzen={invoer.prijzen}
          afspraken={invoer.afspraken}
          beschikbaar={invoer.beschikbaar}
          initieel={invoerWoningen.some(w => w.id === initieelWoningId) ? initieelWoningId : undefined}
          initieelJaar={prijsjaar}
        />
        <details>
          <summary className="cursor-pointer font-semibold">
            Meterbeheer en bestaande historische gegevens
          </summary>
          {params.fout && (
            <p
              role="alert"
              className="rounded-xl bg-rose-100 p-4 text-rose-900"
            >
              {params.fout}
            </p>
          )}
          {params.klaar && (
            <p
              role="status"
              className="rounded-xl bg-emerald-100 p-4 text-emerald-900"
            >
              {params.klaar}
            </p>
          )}
          <section className="rounded-2xl border border-emerald-200 bg-white p-5">
            <h2 className="text-xl font-bold">Beheer gegevens per pand</h2>
            <form
              method="get"
              className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"
            >
              <label className="text-sm font-semibold">
                Begin met een pandselectie
                <select
                  name="woning_id"
                  defaultValue={initieelWoningId?.toString() ?? ""}
                  className={field}
                >
                  {bron.woningen.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.adres}
                    </option>
                  ))}
                </select>
              </label>
              <button className="min-h-11 self-end rounded-xl bg-emerald-800 px-5 font-semibold text-white">
                Pand openen
              </button>
            </form>
            {initieelWoningId && (
              <nav
                aria-label="Energiegegevens"
                className="mt-4 grid gap-2 sm:grid-cols-2"
              >
                <Link
                  href={`/woningen/${initieelWoningId}?alles=meterstanden#meterstanden`}
                  className="min-h-11 rounded-xl border border-slate-200 p-3 font-semibold text-emerald-900"
                >
                  Meterstanden · historie en bestaande correctie
                </Link>
                <Link
                  href={`/woningen/${initieelWoningId}#bezetting`}
                  className="min-h-11 rounded-xl border border-slate-200 p-3 font-semibold text-emerald-900"
                >
                  Bewoning · bestaande in- en uitcheckregistratie
                </Link>
                <Link
                  href="#energie-invoer"
                  className="min-h-11 rounded-xl border border-slate-200 p-3 font-semibold text-emerald-900"
                >
                  Jaarprijzen en voorschotten
                </Link>
                <Link
                  href="#energie-maatregelen"
                  className="min-h-11 rounded-xl border border-slate-200 p-3 font-semibold text-emerald-900"
                >
                  Maatregelen · voortgang en nameting
                </Link>
              </nav>
            )}
          </section>
          {!ext.beschikbaar ? (
            <p className="rounded-xl bg-amber-100 p-5">
              Deze uitbreiding wacht op afzonderlijke toestemming voor de
              productiemigratie. Er worden nu geen tarieven of maatregelen
              opgeslagen.
            </p>
          ) : (
            <>
              <section
                id="energie-maatregelen"
                className="rounded-2xl bg-white p-6"
              >
                <h2 className="text-xl font-bold">
                  Maatregelen en meetbaar resultaat
                </h2>
                <div className="mt-4 space-y-4">
                  {current.length === 0 && (
                    <p className="text-slate-500">
                      Nog geen maatregelen vastgelegd. Begin met een onderzoek
                      en leg vooraf de referentieperiode vast.
                    </p>
                  )}
                  {current.map((m) => {
                    let effect = null;
                    if (m.controle_vanaf && m.controle_tot) {
                      const analyse = (vanaf: string, tot: string) =>
                        bouwEnergiePortfolioAnalyse(bron, {
                          niveau: "woning",
                          woningId: m.woning_id,
                          drager: m.product as Energiedrager,
                          vanaf,
                          totEnMet: tot,
                          archief: true,
                        }).rijen[0];
                      effect = beoordeelMaatregel(
                        analyse(m.referentie_vanaf, m.referentie_tot),
                        analyse(m.controle_vanaf, m.controle_tot),
                        { vanaf: m.referentie_vanaf, tot: m.referentie_tot },
                        { vanaf: m.controle_vanaf, tot: m.controle_tot },
                      );
                    }
                    return (
                      <article key={m.id} className="rounded-xl border p-4">
                        <div className="flex justify-between gap-4">
                          <h3 className="font-bold">{m.titel}</h3>
                          <span className="text-sm text-emerald-800">
                            {m.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {
                            bron.woningen.find((w) => w.id === m.woning_id)
                              ?.adres
                          }{" "}
                          · {m.product} · referentie {m.referentie_vanaf} →{" "}
                          {m.referentie_tot}
                        </p>
                        <p className="mt-3 text-sm">{m.onderbouwing}</p>
                        {effect && (
                          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                            {effect.verbruiksvermindering === null
                              ? "Effect nog niet betrouwbaar berekenbaar."
                              : `Genormaliseerd verbruiksverschil: ${effect.verbruiksvermindering.toLocaleString("nl-NL", { maximumFractionDigits: 2 })}. `}
                            {effect.conclusie}
                          </p>
                        )}
                        <p className="mt-2 text-xs">
                          {m.klant_goedgekeurd
                            ? "Klanttekst vrijgegeven"
                            : "Alleen intern"}
                          {m.taak_id ? ` · gekoppelde taak ${m.taak_id}` : ""}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </section>
              <details className="rounded-2xl bg-white p-6" open>
                <summary className="cursor-pointer text-xl font-bold">
                  Onderzoek of maatregel vastleggen
                </summary>
                <form
                  action={slaEnergieMaatregel}
                  className="mt-5 grid gap-4 md:grid-cols-3"
                >
                  {woning()}
                  {product}
                  {input("titel", "Titel", "text", true)}
                  <label>
                    Status
                    <select name="status" className={field}>
                      <option value="onderzoek">Onderzoek nodig</option>
                      <option value="gepland">Maatregel gepland</option>
                      <option value="uitgevoerd">Uitgevoerd</option>
                      <option value="gecontroleerd">
                        Controlemeting uitgevoerd
                      </option>
                    </select>
                  </label>
                  {input("uitvoerdatum", "Uitvoerdatum", "date")}
                  {input("taak_id", "Bestaande taak-ID (optioneel)", "number")}
                  {input("referentie_vanaf", "Referentie vanaf", "date", true)}
                  {input(
                    "referentie_tot",
                    "Referentie tot (exclusief)",
                    "date",
                    true,
                  )}
                  <label>
                    Versie van
                    <select name="voorganger_id" className={field}>
                      <option value="">Nieuwe maatregel</option>
                      {current.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.titel}
                        </option>
                      ))}
                    </select>
                  </label>
                  {input("controle_vanaf", "Controle vanaf", "date")}
                  {input("controle_tot", "Controle tot (exclusief)", "date")}
                  <label className="md:col-span-3">
                    Onderzoek, actie en bewijs (intern)
                    <textarea
                      name="onderbouwing"
                      required
                      rows={3}
                      className={field}
                    />
                  </label>
                  <label className="md:col-span-3">
                    Goedgekeurde toelichting voor de klant
                    <textarea
                      name="klant_toelichting"
                      rows={2}
                      className={field}
                    />
                  </label>
                  <label className="flex items-start gap-2 md:col-span-3">
                    <input
                      name="klant_goedgekeurd"
                      type="checkbox"
                      className="mt-1"
                    />
                    Ik heb titel en klanttoelichting gecontroleerd: geen
                    persoonsgegevens, interne opmerkingen of onbewezen
                    besparings-/misbruikclaims.
                  </label>
                  <button className="rounded-xl bg-emerald-700 p-3 font-bold text-white">
                    Maatregelversie bewaren
                  </button>
                </form>
              </details>
              <details className="rounded-2xl bg-white p-6">
                <summary className="cursor-pointer text-xl font-bold">
                  Bevestigde meterconfiguratie
                </summary>
                <p className="mt-3 text-sm text-slate-600">
                  Bevestig welke registers gedurende deze periode fysiek
                  aanwezig waren. Kies een einddatum bij vervanging. Historische
                  standen worden niet aangepast.
                </p>
                <form
                  action={slaEnergieMeterconfiguratie}
                  className="mt-5 grid gap-4 md:grid-cols-3"
                >
                  {woning()}
                  {product}
                  {input(
                    "meteridentiteit",
                    "Meternummer / identiteit",
                    "text",
                    true,
                  )}
                  <label>
                    Versie van
                    <select name="voorganger_id" className={field}>
                      <option value="">Nieuwe configuratie</option>
                      {currentConfigs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.meteridentiteit} · {c.vanaf}
                        </option>
                      ))}
                    </select>
                  </label>
                  {input(
                    "woning_object_id",
                    "Bestaand meterobject-ID (optioneel)",
                    "number",
                  )}
                  <label>
                    Registratie
                    <select name="registertype" className={field}>
                      <option value="dag_nacht">Dag + nacht verplicht</option>
                      <option value="enkel">
                        Enkel register (dagstroomveld)
                      </option>
                      <option value="totaal">Onafhankelijke totaalmeter</option>
                    </select>
                  </label>
                  {input("vanaf", "Geldig vanaf", "date", true)}
                  {input("tot", "Geldig tot exclusief", "date")}
                  <button className="rounded-xl bg-emerald-700 p-3 font-bold text-white">
                    Configuratie bevestigen
                  </button>
                </form>
              </details>
            </>
          )}
        </details>
        <EnergieAfzender />
      </div>
    </main>
  );
}
