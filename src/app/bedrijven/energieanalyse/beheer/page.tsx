import Link from "next/link";
import {
  getEnergieAnalyseBrondata,
  getEnergieUitbreiding,
} from "@/services/energieanalyse-server";
import {
  slaEnergieTarief,
  slaEnergieMaatregel,
  slaEnergieMeterconfiguratie,
} from "../actions";
import {
  bouwEnergiePortfolioAnalyse,
  type Energiedrager,
} from "@/lib/energie/portfolio-analyse";
import { beoordeelMaatregel } from "@/lib/energie/resultaten";
import EnergiePrijsForm from "@/components/energie/EnergiePrijsForm";
const field =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm";
export default async function EnergieBeheer({
  searchParams,
}: {
  searchParams: Promise<{
    fout?: string;
    klaar?: string;
    woning_id?: string | string[];
  }>;
}) {
  const [bron, ext, params] = await Promise.all([
    getEnergieAnalyseBrondata(),
    getEnergieUitbreiding(),
    searchParams,
  ]);
  bron.meterconfiguraties = ext.configuraties;
  const initieelWoningId =
    typeof params.woning_id === "string" &&
    /^\d+$/.test(params.woning_id) &&
    bron.woningen.some((woning) => woning.id === Number(params.woning_id))
      ? Number(params.woning_id)
      : undefined;
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
      <select name="woning_id" required={!optional} className={field}>
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
  const tReplaced = new Set(ext.tarieven.map((t) => t.voorganger_id));
  const tariffs = ext.tarieven.filter((t) => !tReplaced.has(t.id));
  const cReplaced = new Set(
    ext.configuraties.map((c) => c.voorganger_id).filter(Boolean),
  );
  const currentConfigs = ext.configuraties.filter(
    (c) => !cReplaced.has(c.id),
  );
  return (
    <main className="min-h-screen bg-slate-100 p-5 text-slate-950 sm:p-9">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/bedrijven/energieanalyse" className="text-emerald-800">
          ← Energie-intelligence
        </Link>
        <header className="rounded-3xl bg-slate-950 p-8 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
            CFME · Onderzoek, actie, resultaat
          </p>
          <h1 className="mt-3 text-3xl font-bold">Energiebeheer</h1>
          <p className="mt-3 text-slate-300">
            Leg tarieven, meterconfiguraties en maatregelen controleerbaar vast.
            Iedere nieuwe versie behoudt de eerdere historie.
          </p>
        </header>
        {params.fout && (
          <p role="alert" className="rounded-xl bg-rose-100 p-4 text-rose-900">
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
        <EnergiePrijsForm
          woningen={bron.woningen.map(({ id, adres }) => ({ id, adres }))}
          verhuurperioden={bron.verhuurperioden}
          tarieven={ext.tarieven}
          beschikbaar={ext.beschikbaar}
          initieelWoningId={initieelWoningId}
        />
        {!ext.beschikbaar ? (
          <p className="rounded-xl bg-amber-100 p-5">
            Deze uitbreiding wacht op afzonderlijke toestemming voor de
            productiemigratie. Er worden nu geen tarieven of maatregelen
            opgeslagen.
          </p>
        ) : (
          <>
            <section className="rounded-2xl bg-white p-6">
              <h2 className="text-xl font-bold">
                Maatregelen en meetbaar resultaat
              </h2>
              <div className="mt-4 space-y-4">
                {current.length === 0 && (
                  <p className="text-slate-500">
                    Nog geen maatregelen vastgelegd. Begin met een onderzoek en
                    leg vooraf de referentieperiode vast.
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
                        {bron.woningen.find((w) => w.id === m.woning_id)?.adres}{" "}
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
                Aanvullende kosten en uitzonderingen · {tariffs.length} actuele versies
              </summary>
              <p className="mt-3 text-sm text-slate-600">
                Voorrang: pand → klant → algemeen. Vul óf een pand óf een klant
                in. Bedragen per kWh of m³; vastrecht per dag/maand. Begin
                inclusief, einde exclusief. Een correctie maakt een nieuwe
                versie.
              </p>
              <div className="my-4 space-y-2">
                {tariffs.map((t) => (
                  <p key={t.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    {t.product} · {t.vanaf} → {t.tot ?? "open"} · {t.bron} ·{" "}
                    {t.componenten
                      .map((c) => `${c.soort} ${c.prijs}`)
                      .join(", ")}{" "}
                    {t.valuta}
                  </p>
                ))}
              </div>
              <form
                action={slaEnergieTarief}
                className="grid gap-4 md:grid-cols-3"
              >
                {product}
                {woning(true)}
                <label>
                  Klant
                  <select name="bedrijf_id" className={field}>
                    <option value="">Algemeen / per pand</option>
                    {bron.bedrijven.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.naam}
                      </option>
                    ))}
                  </select>
                </label>
                {input("vanaf", "Ingangsdatum", "date", true)}
                {input("tot", "Einddatum exclusief", "date")}
                {input("bron", "Leverancier / tariefbron", "text", true)}
                <label>
                  Valuta
                  <input
                    name="valuta"
                    defaultValue="EUR"
                    pattern="[A-Z]{3}"
                    required
                    className={field}
                  />
                </label>
                <label>
                  Prijsopbouw
                  <select name="prijssoort" className={field}>
                    <option value="variabel">Eén verbruiksprijs</option>
                    <option value="dag_nacht">Dag- en nachtprijs</option>
                  </select>
                </label>
                <label>
                  Versie van
                  <select name="voorganger_id" className={field}>
                    <option value="">Nieuw tariefplan</option>
                    {tariffs.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.product} · {t.vanaf} · {t.bron}
                      </option>
                    ))}
                  </select>
                </label>
                {[
                  "variabel",
                  "dag",
                  "nacht",
                  "vast_dag",
                  "vast_maand",
                  "belasting",
                  "toeslag",
                  "teruglevering",
                ].map((k) => (
                  <label key={k}>
                    {
                      (
                        {
                          variabel: "Prijs per eenheid",
                          dag: "Dagprijs per kWh",
                          nacht: "Nachtprijs per kWh",
                          vast_dag: "Vastrecht per dag",
                          vast_maand: "Vastrecht per maand",
                          belasting: "Belasting per eenheid",
                          toeslag: "Toeslag per eenheid",
                          teruglevering: "Vergoeding teruglevering",
                        } as Record<string, string>
                      )[k]
                    }
                    <input
                      name={k}
                      inputMode="decimal"
                      placeholder="Niet van toepassing"
                      className={field}
                    />
                  </label>
                ))}
                <label>
                  Btw-percentage
                  <input
                    name="btw"
                    inputMode="decimal"
                    required
                    className={field}
                  />
                </label>
                <label>
                  Ingevoerde prijzen
                  <select name="inclusief" className={field}>
                    <option value="nee">Exclusief btw</option>
                    <option value="ja">Inclusief btw</option>
                  </select>
                </label>
                <p className="text-xs text-slate-500 md:col-span-3">
                  Teruglevering wordt pas afgerekend met afzonderlijk gemeten
                  exportvolume. Eén btw-percentage geldt voor deze invoer;
                  afwijkende componentpercentages vragen een afzonderlijk
                  gecontroleerde configuratie.
                </p>
                <button className="rounded-xl bg-emerald-700 p-3 font-bold text-white">
                  Tariefversie bewaren
                </button>
              </form>
            </details>
            <details className="rounded-2xl bg-white p-6">
              <summary className="cursor-pointer text-xl font-bold">
                Bevestigde meterconfiguratie
              </summary>
              <p className="mt-3 text-sm text-slate-600">
                Bevestig welke registers gedurende deze periode fysiek aanwezig
                waren. Kies een einddatum bij vervanging. Historische standen
                worden niet aangepast.
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
      </div>
    </main>
  );
}
