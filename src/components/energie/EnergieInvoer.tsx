"use client";
import { useActionState, useState } from "react";
import { bewaarEnergieInvoer } from "@/app/bedrijven/energieanalyse/voorschot-actions";
import {
  actueleVersies,
  type Jaarprijs,
  type VoorschotAfspraak,
} from "@/lib/energie/voorschotten";
const veld =
  "mt-1 min-w-0 max-w-full w-full min-h-11 rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-950";
function Form({
  soort,
  vorig,
  children,
  beschikbaar,
}: {
  soort: string;
  vorig?: string;
  children: React.ReactNode;
  beschikbaar: boolean;
}) {
  const [result, action, pending] = useActionState(bewaarEnergieInvoer, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="soort" value={soort} />
      <input type="hidden" name="voorganger_id" value={vorig ?? ""} />
      {children}
      {result.fout && (
        <p role="alert" className="bg-rose-50 p-3 text-rose-900">
          {result.fout}
        </p>
      )}
      {result.klaar && (
        <p role="status" className="text-emerald-900">
          {result.klaar} Heropen deze selectie voordat u opnieuw wijzigt.
        </p>
      )}
      <button
        disabled={!beschikbaar || pending || !!result.klaar}
        className="min-h-11 rounded-lg bg-emerald-900 px-5 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Bewaren…" : "Bewaren"}
      </button>
    </form>
  );
}
export default function EnergieInvoer({
  woningen,
  bedrijven,
  huren,
  prijzen,
  afspraken,
  beschikbaar,
  initieel,
  initieelJaar,
}: {
  woningen: { id: number; adres: string }[];
  bedrijven: { id: number; naam: string }[];
  huren: {
    id: number;
    woning_id: number;
    bedrijf_id: number;
    startdatum?: string | null;
    werkelijke_einddatum?: string | null;
  }[];
  prijzen: Jaarprijs[];
  afspraken: VoorschotAfspraak[];
  beschikbaar: boolean;
  initieel?: number;
  initieelJaar?: number;
}) {
  const [woning, setWoning] = useState(initieel ?? woningen[0]?.id ?? 0),
    [jaar, setJaar] = useState(initieelJaar ?? new Date().getFullYear());
  const verhuur = huren.filter((h) => h.woning_id === woning);
  const [huurKeuze, setHuur] = useState<number | null>(null);
  const huur = verhuur.find((h) => h.id === huurKeuze) ?? verhuur.at(-1);
  const prijs = actueleVersies(prijzen).find(
    (p) => p.woning_id === woning && p.jaar === jaar,
  );
  const afspraak = actueleVersies(afspraken).find(
    (a) => a.verhuurperiode_id === huur?.id,
  );
  const [extra, setExtra] = useState(0);
  const num = (
    naam: string,
    label: string,
    value: number | null | undefined,
  ) => (
    <label>
      {label}
      <input
        name={naam}
        inputMode="decimal"
        defaultValue={value ?? ""}
        placeholder="Nog onbekend"
        className={veld}
      />
    </label>
  );
  if (!woningen.length) return <p>Geen panden binnen deze selectie. Kies eerst een pand in het verbruiksoverzicht.</p>;
  return (
    <section
      className="rounded-2xl border border-slate-300 bg-white p-5 text-slate-950"
      style={{ colorScheme: "light" }}
    >
      <h2 className="text-2xl font-semibold">Jaarprijzen en voorschot</h2>
      <p className="my-3">
        Alle bedragen inclusief btw. Schatting voor inzicht, geen afrekening.
        Leeg betekent onbekend; vul 0 in als er geen kosten zijn.
      </p>
      {!beschikbaar && (
        <p role="status" className="mb-4 rounded bg-amber-50 p-3">
          De nieuwe opslag is nog niet geactiveerd. Verbruik bekijken blijft
          mogelijk; invoer bewaren wordt beschikbaar na de database-uitbreiding.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <label>
          Pand
          <select
            className={veld}
            value={woning}
            onChange={(e) => {
              setWoning(Number(e.target.value));
              setHuur(null);
              setExtra(0);
            }}
          >
            {woningen.map((w) => (
              <option key={w.id} value={w.id}>
                {w.adres}
              </option>
            ))}
          </select>
        </label>
        <label>
          Prijsjaar
          <input
            className={veld}
            type="number"
            min="1900"
            max="2200"
            value={jaar}
            onChange={(e) => setJaar(Number(e.target.value))}
          />
        </label>
      </div>
      <Form
        key={`prijs:${woning}:${jaar}:${prijs?.id}`}
        soort="prijzen"
        vorig={prijs?.id}
        beschikbaar={beschikbaar}
      >
        <input type="hidden" name="woning_id" value={woning} />
        <input type="hidden" name="jaar" value={jaar} />
        <fieldset className="flex flex-wrap gap-5">
          <legend className="mb-2 font-semibold">
            Kosten die bij dit pand horen
          </legend>
          {(["stroom", "gas", "water"] as const).map((p) => (
            <label key={p}>
              <input
                type="checkbox"
                name={`${p}_actief`}
                defaultChecked={prijs?.[`${p}_actief`] ?? true}
              />{" "}
              {p}
            </label>
          ))}
        </fieldset>
        <p className="text-sm">
          Schakel een product alleen uit als het niet bij dit pand hoort.
          Onbekende prijzen blijven ingeschakeld.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label>
            Stroomtarief
            <select
              name="stroomtype"
              defaultValue={prijs?.stroomtype ?? "dag_nacht"}
              className={veld}
            >
              <option value="enkel">Eén prijs per kWh</option>
              <option value="dag_nacht">Dag en nacht apart</option>
            </select>
          </label>
          {num("stroom", "Stroom één prijs · €/kWh", prijs?.stroom)}
          {num("dag", "Stroom dag · €/kWh", prijs?.dag)}
          {num("nacht", "Stroom nacht · €/kWh", prijs?.nacht)}
          {num("gas", "Gas · €/m³", prijs?.gas)}
          {num("water", "Water · €/m³", prijs?.water)}
          {num(
            "vast_jaar",
            "Vaste kosten alle producten · €/jaar",
            prijs?.vast_jaar,
          )}
        </div>
        <p className="text-sm">
          De gekozen stroomtariefvorm bepaalt welke prijzen meetellen. Vaste
          jaarkosten worden over de kalenderdagen verdeeld.
        </p>
      </Form>
      <hr className="my-6" />
      <h3 className="text-xl font-semibold">Klantafspraak</h3>
      <label className="block my-4">
        Klant en verhuurperiode
        <select
          value={huur?.id ?? ""}
          onChange={(e) => {
            setHuur(Number(e.target.value));
            setExtra(0);
          }}
          className={veld}
        >
          {verhuur.map((h) => (
            <option key={h.id} value={h.id}>
              {bedrijven.find((b) => b.id === h.bedrijf_id)?.naam} ·{" "}
              {h.startdatum ?? "start onbekend"} →{" "}
              {h.werkelijke_einddatum ?? "lopend"}
            </option>
          ))}
        </select>
      </label>
      {huur ? (
        <Form
          key={`huur:${huur.id}:${afspraak?.id}`}
          soort="afspraak"
          vorig={afspraak?.id}
          beschikbaar={beschikbaar}
        >
          <input type="hidden" name="verhuurperiode_id" value={huur.id} />
          <div className="grid gap-4 sm:grid-cols-3">
            <label>
              Startdatum
              <input
                type="date"
                name="vanaf"
                required
                defaultValue={afspraak?.vanaf ?? huur.startdatum ?? ""}
                className={veld}
              />
            </label>
            <label>
              Einddatum (exclusief, optioneel)
              <input
                type="date"
                name="tot"
                defaultValue={afspraak?.tot ?? huur.werkelijke_einddatum ?? ""}
                className={veld}
              />
            </label>
            {num(
              "startsaldo",
              "Startsaldo € · positief tegoed, negatief tekort",
              afspraak?.startsaldo,
            )}
          </div>
          <p className="text-sm">
            Startstanden komen uit de meteropnames. Tussen twee opnames worden
            ze naar tijd geschat; zonder bruikbare grensopnames blijven ze
            onbekend. Er worden geen meterstanden overschreven.
          </p>
          <h4 className="font-semibold">Afgesproken maandvoorschot</h4>
          <p className="text-sm">
            Geen bewijs van betaling. Bij een deelmaand wordt het voorschot naar
            kalenderdagen verdeeld. Voeg bij een wijziging een ingangsdatum toe.
          </p>
          {[
            ...(afspraak?.voorschotten.length
              ? afspraak.voorschotten
              : [
                  {
                    vanaf: afspraak?.vanaf ?? huur.startdatum ?? "",
                    bedrag: null,
                  },
                ]),
            ...Array.from({ length: extra }, () => ({
              vanaf: "",
              bedrag: null,
            })),
          ].map((v, i) => (
            <div key={i} className="grid gap-4 sm:grid-cols-2">
              <label>
                Geldig vanaf
                <input
                  type="date"
                  name="voorschot_vanaf"
                  defaultValue={v.vanaf}
                  className={veld}
                />
              </label>
              {num("voorschot_bedrag", "Maandvoorschot €", v.bedrag)}
            </div>
          ))}
          <button
            type="button"
            className="underline"
            onClick={() => setExtra(extra + 1)}
          >
            + Voorschotwijziging toevoegen
          </button>
          <br />
        </Form>
      ) : (
        <p>Leg eerst een verhuurperiode vast bij dit pand.</p>
      )}
    </section>
  );
}
