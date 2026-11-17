"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import EnergieSaldo from "./EnergieSaldo";
import type { PandSaldo } from "@/lib/energie/voorschotten";
import EnergieRapportKeuze from "./EnergieRapportKeuze";
import {
  combineerTijdlijn,
  tijdlijnProducten,
  tijdlijnWaarde,
  tijdlijnVerschil,
  tijdlijnVerbinding,
  type TijdlijnPand,
  type TijdlijnProduct,
  type TijdlijnPunt,
} from "@/lib/energie/tijdlijn";

const namen = { elektriciteit: "Elektriciteit", gas: "Gas", water: "Water" };
const maanden = [
  "Jan",
  "Feb",
  "Mrt",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
];
const kleuren = [
  "#047857",
  "#2563eb",
  "#9333ea",
  "#c2410c",
  "#0891b2",
  "#be185d",
  "#4d7c0f",
  "#475569",
];
const fmt = (n: number | null, digits = 1) =>
  n === null
    ? "—"
    : n.toLocaleString("nl-NL", { maximumFractionDigits: digits });
const input =
  "rounded-lg border border-emerald-900/25 bg-white px-3 py-2 text-slate-900 min-h-11";
const knop =
  "rounded-lg border border-emerald-800 px-4 py-2 text-emerald-950 min-h-11 hover:bg-emerald-50";
const opslag = "cfme-tijdlijn-verborgen-v1";
function leesVerborgen() {
  try {
    return localStorage.getItem(opslag) ?? "[]";
  } catch {
    return "[]";
  }
}
function luister(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("cfme-signalen", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("cfme-signalen", cb);
  };
}
type Reeks = {
  id: string;
  naam: string;
  kleur: string;
  vergelijking?: boolean;
  punten: (TijdlijnPunt | null)[];
};

export function Grafiek({
  product,
  reeksen,
  persoon,
  gekozen,
  kies,
  zoom,
  selectiesleutel,
  van = 0,
  tot = 11,
  compact = false,
  samenvatting = true,
  signaal = true,
  readonly = false,
  sluitSamenvatting,
  embedded = false,
  detailsOnly = false,
  laatste = true,
}: {
  product: TijdlijnProduct;
  reeksen: Reeks[];
  persoon: boolean;
  gekozen: number;
  kies: (n: number) => void;
  zoom: boolean;
  selectiesleutel: string;
  van?: number;
  tot?: number;
  compact?: boolean;
  samenvatting?: boolean;
  signaal?: boolean;
  readonly?: boolean;
  sluitSamenvatting?: () => void;
  embedded?: boolean;
  detailsOnly?: boolean;
  laatste?: boolean;
}) {
  const raw = useSyncExternalStore(luister, leesVerborgen, () => "[]");
  let verborgen: string[] = [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed))
      verborgen = parsed.filter((s): s is string => typeof s === "string");
  } catch {
    /* beschadigde voorkeur heeft geen invloed op gegevens */
  }
  const [opslagFout, setOpslagFout] = useState(false);
  const indices = zoom
    ? [Math.max(0, gekozen - 1), gekozen, Math.min(11, gekozen + 1)].filter(
        (n, i, a) => a.indexOf(n) === i && n >= van && n <= tot,
      )
    : maanden.map((_, i) => i).filter((i) => i >= van && i <= tot);
  const unit = persoon
    ? product === "water"
      ? "liter per persoon/dag"
      : `${product === "elektriciteit" ? "kWh" : "m³"} per persoon/week`
    : product === "elektriciteit"
      ? "kWh"
      : "m³";
  const vals = reeksen
    .flatMap((r) =>
      indices.map((i) => tijdlijnWaarde(r.punten[i], product, persoon)),
    )
    .filter((v): v is number => v !== null);
  const max = Math.max(1, ...vals) * 1.1;
  const x = (i: number) =>
    70 + indices.indexOf(i) * (900 / Math.max(1, indices.length - 1));
  const bodem = embedded ? 110 : 275;
  const y = (v: number) => bodem - (v / max) * (embedded ? 90 : 220);
  const hoofd = reeksen.filter((r) => !r.vergelijking);
  const eerste =
    hoofd.length > 1
      ? {
          naam: `${hoofd.length} panden samen`,
          punten: maanden.map((_, i) =>
            combineerTijdlijn(
              hoofd.flatMap((r) => (r.punten[i] ? [r.punten[i]!] : [])),
            ),
          ),
        }
      : hoofd[0];
  const complete =
    eerste?.punten
      .map((p, i) => ({ p, i, v: tijdlijnWaarde(p, product, persoon) }))
      .filter(
        (a) =>
          indices.includes(a.i) &&
          a.v !== null &&
          a.p &&
          !a.p.lopend &&
          a.p.dekking >= 99.99,
      ) ?? [];
  const piek = complete.length
    ? complete.reduce((a, b) => (a.v! >= b.v! ? a : b))
    : null;
  const signaalKey = `${selectiesleutel}:${product}:${persoon}:${piek?.p?.maand}:${piek?.v}`;
  function bewaar(items: string[]) {
    try {
      localStorage.setItem(opslag, JSON.stringify(items));
      window.dispatchEvent(new Event("cfme-signalen"));
      setOpslagFout(false);
    } catch {
      setOpslagFout(true);
    }
  }
  const a = eerste?.punten[gekozen] ?? null;
  const refs = reeksen.filter((r) => r.vergelijking);
  const ref =
    refs.length > 1
      ? {
          naam: "dezelfde panden in de vergelijking",
          punten: maanden.map((_, i) =>
            combineerTijdlijn(
              refs.flatMap((r) => (r.punten[i] ? [r.punten[i]!] : [])),
            ),
          ),
        }
      : refs[0];
  const b = ref?.punten[gekozen] ?? null;
  const verschil = tijdlijnVerschil(a, b, product, persoon);
  const som = combineerTijdlijn(complete.map((c) => c.p!));
  return (
    <section
      className={embedded ? "min-w-0" : "rounded-2xl border border-emerald-900/15 bg-white p-3 space-y-3"}
      aria-label={`${namen[product]} door de tijd`}
    >
      {!detailsOnly && <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={embedded ? "text-sm font-bold text-emerald-950" : "text-2xl font-semibold text-emerald-950"}>
          {namen[product]}
        </h2>
        <span className="text-sm text-slate-600">{unit}</span>
      </div>
      {samenvatting && !compact && !embedded && (
        <div className="relative grid gap-3 sm:grid-cols-3 text-sm text-slate-900">
          {sluitSamenvatting && (
            <button
              aria-label="Samenvatting verbergen"
              onClick={sluitSamenvatting}
              className="absolute right-0 top-0 min-h-11 min-w-11"
            >
              ×
            </button>
          )}
          <div className="min-w-0 rounded-xl bg-emerald-50 p-3 text-slate-900 break-words">
            <p>
              {eerste?.naam} · {complete.length} volledige maanden
            </p>
            <strong className="block text-2xl mt-2 leading-tight text-slate-950 tabular-nums">
              {fmt(tijdlijnWaarde(som, product, persoon), 2)}
            </strong>
            <p className="mt-1 text-slate-700">{unit}</p>
            <p>
              {persoon
                ? "Gewogen op persoonsdagen"
                : "Som van de volledig gedekte maanden"}
            </p>
          </div>
          <div className="min-w-0 rounded-xl bg-slate-50 p-3 text-slate-900 break-words">
            <p>
              Geselecteerd: {maanden[gekozen]}
              {a && a.dekking < 99.99 ? " · gedeeltelijk totaal" : ""}
            </p>
            <strong className="block text-2xl mt-2 leading-tight text-slate-950 tabular-nums">
              {fmt(tijdlijnWaarde(a, product, persoon), 2)}
            </strong>
            <p className="mt-1 text-slate-700">{unit}</p>
            <p>
              {a?.lopend
                ? `Lopende maand · tot ${a.tot} exclusief`
                : hoofd.length > 1
                  ? `${hoofd.filter((r) => (r.punten[gekozen]?.dekking ?? 0) >= 99.99).length} van ${hoofd.length} panden volledig gedekt`
                  : `${fmt(a?.dekking ?? null)}% meetdekking`}
            </p>
          </div>
          <div className="min-w-0 rounded-xl bg-blue-50 p-3 text-slate-900 break-words">
            <p>{ref ? `T.o.v. ${ref.naam}` : "Geen vergelijking gekozen"}</p>
            <strong className="block text-2xl mt-2 leading-tight text-slate-950 tabular-nums">
              {verschil === null
                ? "—"
                : `${verschil > 0 ? "+" : ""}${fmt(verschil)}%`}
            </strong>
            <p>
              Verschil voor de geselecteerde maand
              {reeksen.filter((r) => !r.vergelijking).length > 1
                ? " · gehele selectie"
                : ""}
            </p>
          </div>
        </div>
      )}
      {signaal && !compact && piek && !verborgen.includes(signaalKey) && (
        <div className="ml-auto flex w-fit items-center gap-2 rounded border border-amber-400 px-2 text-xs text-amber-950">
          <button onClick={() => kies(piek.i)} className="text-left">
            Hoogste volledige maand: {maanden[piek.i]} · {fmt(piek.v)} {unit} —
            onderzoeken
          </button>
          <button
            className="p-2"
            aria-label="Signaaltekst verbergen"
            onClick={() => bewaar([...verborgen, signaalKey])}
          >
            ×
          </button>
        </div>
      )}
      {!readonly && verborgen.includes(signaalKey) && (
        <button
          className={knop}
          onClick={() => bewaar(verborgen.filter((k) => k !== signaalKey))}
        >
          Signaaltekst tonen
        </button>
      )}
      {opslagFout && (
        <p role="status">Deze browser kan de voorkeur niet bewaren.</p>
      )}
      {!vals.length ? (
        <div className="py-16 text-center text-slate-600">
          Geen bruikbare gegevens in deze selectie. Ontbrekende metingen zijn
          geen nulverbruik.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <svg
            viewBox={embedded ? `0 0 1040 ${laatste ? 145 : 120}` : "0 0 1040 325"}
            className={
              embedded ? "w-full min-w-[540px]" : compact
                ? "w-full min-w-[600px] max-h-56"
                : "w-full min-w-[600px] max-h-[300px]"
            }
            role="img"
            aria-label={`${namen[product]}: ${unit}. Kies een maand met de knoppen onder de grafiek.`}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <line
                  x1="70"
                  x2="990"
                  y1={y((max * i) / 4)}
                  y2={y((max * i) / 4)}
                  stroke="#e2e8f0"
                />
                <text
                  x="60"
                  y={y((max * i) / 4) + 5}
                  textAnchor="end"
                  fontSize="13"
                  fill="#475569"
                >
                  {fmt((max * i) / 4)}
                </text>
              </g>
            ))}
            {indices.map((i) => (
              <g key={i}>
                <rect
                  x={x(i) - 16}
                  y={embedded ? 15 : 40}
                  width="32"
                  height={embedded ? 95 : 235}
                  fill={i === gekozen ? "#ecfdf5" : "transparent"}
                />
                {(!embedded || laatste) && <text
                  x={x(i)}
                  y={embedded ? 135 : 305}
                  textAnchor="middle"
                  fontSize="14"
                  fill="#334155"
                >
                  {maanden[i]}
                </text>}
              </g>
            ))}
            {reeksen.map((r) => (
              <g key={r.id}>
                {indices.map((i, j) => {
                  const p = r.punten[i],
                    v = tijdlijnWaarde(p, product, persoon);
                  if (v === null || !p) return null;
                  const vorige = j > 0 ? r.punten[indices[j - 1]] : null;
                  const pv = tijdlijnWaarde(vorige, product, persoon);
                  const volledig = !p.lopend && p.dekking >= 99.99;
                  const verbinding = tijdlijnVerbinding(
                    vorige,
                    p,
                    product,
                    persoon,
                  );
                  return (
                    <g key={i}>
                      {verbinding && pv !== null && (
                        <line
                          data-dekking={verbinding}
                          x1={x(indices[j - 1])}
                          y1={y(pv)}
                          x2={x(i)}
                          y2={y(v)}
                          stroke={r.kleur}
                          strokeWidth="3"
                          strokeDasharray={
                            verbinding === "gedeeltelijk"
                              ? "2 5"
                              : r.vergelijking
                                ? "7 5"
                                : undefined
                          }
                        />
                      )}
                      <circle
                        cx={x(i)}
                        cy={y(v)}
                        r={embedded ? 4 : 7}
                        fill={volledig ? r.kleur : "white"}
                        stroke={r.kleur}
                        strokeWidth="3"
                        onClick={() => kies(i)}
                        className="cursor-pointer"
                      >
                        <title>{`${r.naam}: ${maanden[i]} · ${fmt(v)} ${unit}${!volledig ? " · onvolledig" : ""}`}</title>
                      </circle>
                    </g>
                  );
                })}
              </g>
            ))}
          </svg>
        </div>
      )}
      {!embedded && <div className="flex flex-wrap gap-x-6 gap-y-2 text-base text-slate-900">
        {reeksen.map((r) => (
          <span key={r.id} className="flex items-center gap-2">
            <span
              style={{
                borderColor: r.kleur,
                borderTopStyle: r.vergelijking ? "dashed" : "solid",
              }}
              className="w-8 border-t-4"
            />
            {r.naam}
            {!r.punten.some((p) => tijdlijnWaarde(p, product, persoon) !== null)
              ? " · geen bruikbare gegevens"
              : ""}
          </span>
        ))}
        <span>○ Lopende maand of onvolledige meetdekking</span>
      </div>}
      {!readonly && !compact && !embedded && (
        <div className="flex flex-wrap gap-1" aria-label="Selecteer een maand">
          {maanden.map((m, i) =>
            i >= van && i <= tot ? (
              <button
                key={m}
                aria-pressed={gekozen === i}
                className={`rounded px-3 py-2 ${gekozen === i ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-800"}`}
                onClick={() => kies(i)}
              >
                {m}
              </button>
            ) : null,
          )}
        </div>
      )}
      {!embedded && <p className="text-sm text-slate-600">
        Maandwaarden verdeeld uit meteropnames; geen dagelijkse metingen. Open
        punten zijn onvolledig. Ontbrekende maanden blijven leeg.
      </p>}
      </>}
      {!readonly && (!embedded || detailsOnly) && (
        <details className="border-t pt-4">
          <summary className="cursor-pointer font-semibold">
            Geselecteerd: {maanden[gekozen]} · cijfers en opnames
          </summary>
          <h3 className="font-semibold text-lg">
            {maanden[gekozen]} · geselecteerde maand
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left mt-2">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Pand / periode</th>
                  <th className="p-2">{unit}</th>
                  <th className="p-2">Persoonsdagen</th>
                  <th className="p-2">Meetdekking</th>
                  <th className="p-2">Berekening</th>
                </tr>
              </thead>
              <tbody>
                {reeksen.map((r) => {
                  const p = r.punten[gekozen];
                  return (
                    <tr key={r.id} className="border-b">
                      <th className="p-2 font-medium">{r.naam}</th>
                      <td className="p-2">
                        {fmt(tijdlijnWaarde(p, product, persoon), 2)}
                      </td>
                      <td className="p-2">
                        {p?.onbekend
                          ? "Onvolledig bekend"
                          : p?.verbruik === null
                            ? "—"
                            : fmt(p?.persoonsdagen ?? null)}
                      </td>
                      <td className="p-2">{fmt(p?.dekking ?? null)}%</td>
                      <td className="p-2">
                        {!p || p.verbruik === null
                          ? "Geen meting"
                          : `${p.lopend ? "Lopende maand · " : ""}${p.naarRato ? "Naar tijd verdeeld" : "Gemeten"}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {ref && (
            <p className="mt-3">
              T.o.v. {ref.naam}:{" "}
              <strong>
                {verschil === null
                  ? "Geen vergelijkbaar percentage"
                  : `${verschil > 0 ? "+" : ""}${fmt(verschil)}%`}
              </strong>
              {verschil === null && (
                <span className="text-sm text-slate-600">
                  {" "}
                  — vereist gelijke aantallen dagen, volledige meetdekking en
                  een referentie boven nul.
                </span>
              )}
            </p>
          )}
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold text-emerald-900 py-2">
              Bekijk opnames en berekening
            </summary>
            {reeksen.map((r) => {
              const p = r.punten[gekozen];
              return (
                <div
                  key={r.id}
                  className="my-4 rounded-lg bg-slate-50 p-4 text-sm"
                >
                  <h4 className="font-semibold">{r.naam}</h4>
                  <p>
                    {p?.vanaf} tot {p?.tot} (einddatum exclusief)
                  </p>
                  <p>
                    {fmt(p?.verbruik ?? null)}{" "}
                    {product === "elektriciteit" ? "kWh" : "m³"} ·{" "}
                    {fmt(p?.persoonsdagen ?? null)} geregistreerde
                    persoonsdagen.
                  </p>
                  {p?.bronnen.map((s, i) => (
                    <p key={i} className="mt-2">
                      {s.vanaf} → {s.tot}: {fmt(s.verbruik)}{" "}
                      {product === "elektriciteit" ? "kWh" : "m³"} ·{" "}
                      {fmt(s.persoonsdagen)} persoonsdagen ·{" "}
                      {s.methode.replaceAll("_", " ")} · opnames{" "}
                      {s.ids.join(" → ")}
                    </p>
                  ))}
                  {p?.waarschuwingen.length ? (
                    <details className="mt-3">
                      <summary>
                        Bronmeldingen ({p.waarschuwingen.length})
                      </summary>
                      <ul className="list-disc pl-5">
                        {p.waarschuwingen.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              );
            })}
          </details>
        </details>
      )}
    </section>
  );
}

export default function EnergieTijdlijn({
  panden,
  referentie,
  jaar,
  vergelijkjaar,
  jaren,
  bedrijven,
  bedrijf,
  vandaag,
  start,
  saldi = [],
  rapporten = [],
}: {
  saldi?: PandSaldo[];
  rapporten?: {
    id: number;
    woning_id: number;
    verhuurperiode_id: number | null;
    rapportjaar: number;
    rapportmaand: number;
  }[];
  panden: TijdlijnPand[];
  referentie: TijdlijnPand[];
  jaar: number;
  vergelijkjaar: number;
  jaren: number[];
  bedrijven: { id: number; naam: string }[];
  bedrijf: number | null;
  vandaag: string;
  start?: {
    ids?: number[];
    product?: string;
    persoon?: boolean;
    modus?: string;
    vergelijk?: string;
    ander?: number;
  };
}) {
  const [ids, setIds] = useState<number[]>(
    start?.ids ?? panden.map((p) => p.id),
  );
  const [modus, setModus] = useState(
    start?.modus === "totaal" ? "samen" : "panden",
  );
  const [product, setProduct] = useState<TijdlijnProduct | "alle">(
    ["alle", ...tijdlijnProducten].includes(start?.product ?? "")
      ? (start!.product as TijdlijnProduct | "alle")
      : "alle",
  );
  const [persoon, setPersoon] = useState(start?.persoon ?? false);
  const [vergelijk, setVergelijk] = useState(
    ["geen", "jaar", "pand"].includes(start?.vergelijk ?? "")
      ? start!.vergelijk!
      : "jaar",
  );
  const [ander, setAnder] = useState(
    panden.some((p) => p.id === start?.ander)
      ? start!.ander!
      : (panden[0]?.id ?? 0),
  );
  const [gekozen, kies] = useState(
    jaar === Number(vandaag.slice(0, 4))
      ? Math.max(0, Number(vandaag.slice(5, 7)) - 2)
      : 11,
  );
  const [van, setVan] = useState(0),
    [tot, setTot] = useState(11);
  const prefs = useSyncExternalStore(
    luister,
    () => {
      try {
        return localStorage.getItem("cfme-energie-zichtbaar-v2") ?? "{}";
      } catch {
        return "{}";
      }
    },
    () => "{}",
  );
  let instellingen: Record<string, boolean> = {};
  try {
    const v: unknown = JSON.parse(prefs);
    if (v && typeof v === "object" && !Array.isArray(v))
      instellingen = v as Record<string, boolean>;
  } catch {}
  const zichtbaar = (key: string) => instellingen[key] !== false;
  function toon(key: string, value: boolean) {
    try {
      localStorage.setItem(
        "cfme-energie-zichtbaar-v2",
        JSON.stringify({ ...instellingen, [key]: value }),
      );
      window.dispatchEvent(new Event("cfme-signalen"));
    } catch {}
  }
  const [zoom, setZoom] = useState(false);
  const selected = panden.filter((p) => ids.includes(p.id));
  function reeksen(drager: TijdlijnProduct): Reeks[] {
    const make = (lijst: TijdlijnPand[]) =>
      maanden.map((_, i) =>
        combineerTijdlijn(lijst.map((p) => p.producten[drager][i])),
      );
    const result: Reeks[] =
      modus === "samen"
        ? [
            {
              id: "samen",
              naam: `${selected.length === 1 ? selected[0].adres : `${selected.length} panden samen`} · ${jaar}`,
              kleur: kleuren[0],
              punten: make(selected),
            },
          ]
        : selected.map((p, i) => ({
            id: String(p.id),
            naam: `${p.adres} · ${jaar}`,
            kleur: kleuren[i % kleuren.length],
            punten: p.producten[drager],
          }));
    if (vergelijk === "jaar") {
      if (modus === "samen")
        result.push({
          id: "referentie",
          naam: `Dezelfde panden · ${vergelijkjaar}`,
          kleur: "#2563eb",
          vergelijking: true,
          punten: make(referentie.filter((p) => ids.includes(p.id))),
        });
      else
        selected.forEach((p, i) =>
          result.push({
            id: `ref-${p.id}`,
            naam: `${p.adres} · ${vergelijkjaar}`,
            kleur:
              selected.length === 1 ? "#2563eb" : kleuren[i % kleuren.length],
            vergelijking: true,
            punten:
              referentie.find((r) => r.id === p.id)?.producten[drager] ??
              maanden.map(() => null),
          }),
        );
    }
    if (vergelijk === "pand")
      result.push({
        id: "ander",
        naam: `${panden.find((p) => p.id === ander)?.adres ?? "Ander pand"} · ${jaar}`,
        kleur: "#2563eb",
        vergelijking: true,
        punten:
          panden.find((p) => p.id === ander)?.producten[drager] ??
          maanden.map(() => null),
      });
    if (vergelijk === "vorige")
      result.push({
        id: "vorige",
        naam: "Dezelfde selectie · maand ervoor",
        kleur: "#2563eb",
        vergelijking: true,
        punten: [null, ...make(selected).slice(0, 11)],
      });
    return result;
  }
  return (
    <main
      style={{ colorScheme: "light" }}
      className="mx-auto min-h-screen max-w-7xl bg-[#fafaf6] px-4 py-3 text-slate-900 space-y-3"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <Link href="/bedrijven" className="text-sm font-bold text-emerald-900">CFME CONTROL</Link>
          <h1 className="text-2xl font-bold text-emerald-950">Verbruik en voorschot</h1>
          <p className="text-sm">{bedrijven.find(b => b.id === bedrijf)?.naam ?? "Alle klanten"} · {selected.length === 1 ? selected[0].adres : `${selected.length} panden`}</p>
        </div>
        <details className="relative rounded-lg border border-emerald-900/30 bg-white px-3 py-2 text-sm">
          <summary className="cursor-pointer">Weergave</summary>
          <div className="absolute right-0 top-full z-20 min-w-64 rounded-lg border bg-white p-4 shadow-lg space-y-3">
            {[
              ["samenvatting", "Geselecteerde maand"],
              ["signaal", "Piekmelding"],
              ["saldo", "Voorschot en kosten"],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <input
                  type="checkbox"
                  checked={zichtbaar(key)}
                  onChange={(e) => toon(key, e.target.checked)}
                />{" "}
                {label}
              </label>
            ))}
          </div>
        </details>
      </header>
      <form
        id="energie-selectie"
        className="grid grid-cols-2 md:grid-cols-4 items-end gap-3"
      >
        <input type="hidden" name="selectie_bedrijf" value={bedrijf ?? ""} />
        <input type="hidden" name="panden_ingediend" value="1" />
        {ids.map((id) => (
          <input key={id} type="hidden" name="woning" value={id} />
        ))}
        <input type="hidden" name="product" value={product} />
        <input
          type="hidden"
          name="eenheid"
          value={persoon ? "persoon" : "totaal"}
        />
        <input
          type="hidden"
          name="modus"
          value={modus === "samen" ? "totaal" : "panden"}
        />
        <input type="hidden" name="vergelijk" value={vergelijk} />
        <input type="hidden" name="ander" value={ander} />
        <label className="grid gap-1 text-sm">
          Klant
          <select
            name="bedrijf"
            defaultValue={bedrijf ?? ""}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className={input}
          >
            <option value="">Alle klanten</option>
            {bedrijven.map((b) => (
              <option key={b.id} value={b.id}>
                {b.naam}
              </option>
            ))}
          </select>
        </label>
        <details className="relative rounded-lg border border-emerald-900/25 bg-white px-3 py-2 text-sm min-h-11">
          <summary className="cursor-pointer font-medium">
            Pand: {selected.length === 1 ? selected[0].adres : `${ids.length} geselecteerd`}
          </summary>
          <div className="absolute left-0 top-full z-20 min-w-72 rounded-lg border bg-white p-3 shadow-lg"><div className="flex gap-3 py-3">
            <button
              type="button"
              onClick={() => setIds(panden.map((p) => p.id))}
            >
              Alle
            </button>
            <button type="button" onClick={() => setIds([])}>
              Geen
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {panden.map((p) => (
              <label key={p.id} className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  checked={ids.includes(p.id)}
                  onChange={(e) =>
                    setIds(
                      e.target.checked
                        ? [...ids, p.id]
                        : ids.filter((id) => id !== p.id),
                    )
                  }
                />
                {p.adres}
              </label>
            ))}
          </div>
          </div>
        </details>
        <label className="grid gap-1 text-sm">
          Jaar
          <select
            name="jaar"
            defaultValue={jaar}
            className={input}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            {jaren.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="grid text-sm gap-1">Vergelijk met
          <select className={input} value={vergelijk === "jaar" ? String(vergelijkjaar) : vergelijk}
            onChange={e => { const v=e.target.value; if (/^\d+$/.test(v)) { setVergelijk("jaar"); const f=e.currentTarget.form!; (f.elements.namedItem("vergelijk") as HTMLInputElement).value="jaar"; (f.elements.namedItem("vergelijkjaar") as HTMLInputElement).value=v; f.requestSubmit(); } else setVergelijk(v); }}>
            <option value="geen">Geen vergelijking</option>
            {jaren.map(y => <option key={y} value={y}>{y}</option>)}
            <option value="pand">Ander pand</option>
          </select>
        </label>
        <input type="hidden" name="vergelijkjaar" value={vergelijkjaar} />
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1" aria-label="Energieproduct">
          {(["elektriciteit", "gas", "water", "alle"] as const).map(p => <button type="button" key={p} aria-pressed={product === p} onClick={() => setProduct(p)} className={`min-h-11 rounded-md px-4 text-sm font-semibold ${product === p ? "bg-emerald-800 text-white" : "text-emerald-950"}`}>{p === "alle" ? "Alles" : p === "elektriciteit" ? "Stroom" : namen[p]}</button>)}
        </div>
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
          {[false,true].map(v => <button type="button" key={String(v)} aria-pressed={persoon === v} onClick={() => setPersoon(v)} className={`min-h-11 rounded-md px-4 text-sm font-semibold ${persoon === v ? "bg-emerald-800 text-white" : "text-emerald-950"}`}>{v ? "Per persoon" : "Totaal"}</button>)}
        </div>
      <details className="relative text-sm text-emerald-950">
        <summary className="cursor-pointer font-medium">
          Periode en pandweergave
        </summary>
        <div className="absolute right-0 top-full z-20 w-[min(85vw,640px)] rounded-xl border bg-white p-4 shadow-lg flex flex-wrap items-end gap-3">
          <label className="grid text-sm gap-1">
            Panden tonen
            <select
              className={input}
              value={modus}
              onChange={(e) => setModus(e.target.value)}
            >
              <option value="panden">Ieder pand een eigen lijn</option>
              <option value="samen">Panden samen</option>
            </select>
          </label>
          {vergelijk === "pand" && (
            <label className="grid text-sm gap-1">
              Referentiepand
              <select
                value={ander}
                onChange={(e) => setAnder(Number(e.target.value))}
                className={input}
              >
                {panden.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.adres}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="grid text-sm gap-1">
            Vanaf maand
            <select
              className={input}
              value={van}
              onChange={(e) => {
                const n = Number(e.target.value);
                setVan(n);
                setTot(Math.max(n, tot));
                kies(Math.max(n, gekozen));
              }}
            >
              {maanden.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="grid text-sm gap-1">
            Tot en met
            <select
              className={input}
              value={tot}
              onChange={(e) => {
                const n = Number(e.target.value);
                setTot(n);
                kies(Math.min(n, gekozen));
              }}
            >
              {maanden.map((m, i) =>
                i >= van ? (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ) : null,
              )}
            </select>
          </label>
          <button
            className={knop}
            onClick={() => {
              setZoom(!zoom);
              if (vergelijk === "vorige") setVergelijk("geen");
            }}
          >
            {zoom ? "Heel jaar tonen" : "Inzoomen rond gekozen maand"}
          </button>
        </div>
      </details>
      </div>
      {!selected.length ? <p className="bg-white p-6">Selecteer minimaal één pand.</p> :
        <section className="rounded-xl border border-emerald-900/20 bg-white p-3 space-y-2" aria-label="Verbruik per maand">
          <h2 className="font-bold text-lg text-emerald-950">Verbruik per maand · {product === "alle" ? "alle producten" : namen[product].toLowerCase()}</h2>
          {(product === "alle" ? tijdlijnProducten : [product]).map((p,i,ps) => <Grafiek key={p} product={p} reeksen={reeksen(p)} persoon={persoon} gekozen={gekozen} kies={kies} zoom={zoom} van={van} tot={tot} embedded laatste={i === ps.length-1} samenvatting={false} signaal={zichtbaar("signaal")} compact={product === "alle"} selectiesleutel={`${jaar}:${bedrijf}:${ids.slice().sort().join(",")}:${modus}`} />)}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {reeksen(product === "alle" ? "elektriciteit" : product).map(r => <span key={r.id} className="inline-flex items-center gap-2"><span className="w-6 border-t-2" style={{borderColor:r.kleur,borderTopStyle:r.vergelijking ? "dashed" : "solid"}} />{r.naam}</span>)}
            <span>○ Lopend / onvolledig</span>
          </div>
          <p className="text-xs text-slate-600">Afzonderlijke schalen; maandverbruik verdeeld vanuit meteropnames. Ontbrekende gegevens blijven leeg.</p>
          {zichtbaar("samenvatting") && <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-2 text-sm">
            <label className="font-bold text-emerald-950"><span className="sr-only">Geselecteerde maand</span><select className="rounded bg-emerald-50 p-2" value={gekozen} onChange={e=>kies(Number(e.target.value))}>{maanden.map((m,i)=> i>=van && i<=tot ? <option value={i} key={m}>{m} {jaar}</option>:null)}</select></label>
            {(product === "alle" ? tijdlijnProducten : [product]).map(p=> {const punt=combineerTijdlijn(selected.map(r=>r.producten[p][gekozen]));return <span key={p}><span className="block text-xs">{namen[p]}</span><strong>{fmt(tijdlijnWaarde(punt,p,persoon))} {persoon ? (p === "water" ? "l/persoon/dag" : `${p === "elektriciteit" ? "kWh" : "m³"}/persoon/week`) : p === "elektriciteit" ? "kWh" : "m³"}</strong>{punt && (punt.dekking<99.99 || punt.lopend) && <small className="block">Gedeeltelijk</small>}</span>})}
            <button type="button" onClick={()=>toon("samenvatting",false)} aria-label="Maandstrook verbergen">×</button>
          </div>}
          <details className="border-t pt-2 text-sm"><summary className="cursor-pointer font-semibold text-emerald-900">Opnames en berekening</summary>
            {(product === "alle" ? tijdlijnProducten : [product]).map(p=><Grafiek key={p} product={p} reeksen={reeksen(p)} persoon={persoon} gekozen={gekozen} kies={kies} zoom={zoom} embedded detailsOnly signaal={false} selectiesleutel={`${jaar}:${bedrijf}`} />)}
          </details>
        </section>
      }
      {selected.length > 0 && zichtbaar("saldo") && (
        <EnergieSaldo
          saldi={saldi}
          ids={ids}
          jaar={jaar}
          van={van}
          tot={tot}
          maand={gekozen}
          sluit={() => toon("saldo", false)}
        />
      )}
      <EnergieRapportKeuze
        rapporten={rapporten.filter((r) => ids.includes(r.woning_id))}
        panden={selected}
        jaar={jaar}
        vergelijkjaar={vergelijkjaar}
        van={van}
        tot={tot}
        persoon={persoon}
        product={product}
        vergelijk={vergelijk}
        saldo={zichtbaar("saldo")}
      />
      <p className="text-xs text-slate-600">Bijgewerkt tot {vandaag} · Per persoon: stroom en gas per week, water per dag.</p>
    </main>
  );
}
