"use client";

import { useState } from "react";
import type {
  Brondata,
  EnergieAnalyseSelectie,
  Energiedrager,
} from "@/lib/energie/portfolio-analyse";
import {
  beschikbareEnergieWoningen,
  type EnergieSelectieVeld,
  type Parameters,
} from "@/lib/energie/selectie";
import EnergieAnalyseDatumvelden from "./EnergieAnalyseDatumvelden";

type Validatiefout = {
  veld: EnergieSelectieVeld;
  bericht: string;
};

type Props = {
  bron: Pick<Brondata, "woningen" | "bedrijven" | "verhuurperioden">;
  selectie: EnergieAnalyseSelectie;
  dragers: Energiedrager[];
  minimum: string;
  maximum: string;
  initialValues?: Parameters;
  validationError?: Validatiefout;
};

const energieproducten: Energiedrager[] = [
  "elektriciteit",
  "gas",
  "water",
];

function lijstwaarde(parameters: Parameters | undefined, key: string) {
  const raw = parameters?.[key];
  return (Array.isArray(raw) ? raw : raw ? [raw] : []).flatMap((waarde) =>
    waarde.split(",").filter(Boolean),
  );
}

function enkelewaarde(
  parameters: Parameters | undefined,
  key: string,
): string | undefined {
  const raw = parameters?.[key];
  return typeof raw === "string" ? raw : undefined;
}

function geldigeDatum(
  waarde: string | undefined,
  fallback: string,
  minimum: string,
  maximum: string,
) {
  if (!waarde || !/^\d{4}-\d{2}-\d{2}$/.test(waarde)) return fallback;
  const timestamp = Date.parse(`${waarde}T00:00:00Z`);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== waarde ||
    waarde < minimum ||
    waarde > maximum
  )
    return fallback;
  return waarde;
}

function aanvankelijkeIds(
  parameters: Parameters | undefined,
  key: string,
  beschikbareIds: Set<number>,
  fallback: number[],
) {
  if (parameters?.[key] === undefined) return fallback;
  return [
    ...new Set(
      lijstwaarde(parameters, key)
        .filter((waarde) => /^\d+$/.test(waarde))
        .map(Number)
        .filter((id) => beschikbareIds.has(id)),
    ),
  ];
}

function toggle(list: number[], id: number) {
  return list.includes(id)
    ? list.filter((waarde) => waarde !== id)
    : [...list, id];
}

function selectieFoutId(veld: EnergieSelectieVeld) {
  return `energie-filter-${veld}-fout`;
}

export default function EnergieFilters({
  bron,
  selectie,
  dragers,
  minimum,
  maximum,
  initialValues,
  validationError,
}: Props) {
  const [niveau, setNiveau] = useState(() => {
    const raw = enkelewaarde(initialValues, "niveau");
    return raw === "totaal" || raw === "bedrijf" || raw === "woning"
      ? raw
      : selectie.niveau;
  });
  const [klanten, setKlanten] = useState(() =>
    aanvankelijkeIds(
      initialValues,
      "bedrijf",
      new Set(bron.bedrijven.map((bedrijf) => bedrijf.id)),
      selectie.bedrijfIds ?? [],
    ),
  );
  const [panden, setPanden] = useState(() =>
    aanvankelijkeIds(
      initialValues,
      "woning",
      new Set(bron.woningen.map((woning) => woning.id)),
      selectie.woningIds ?? [],
    ),
  );
  const [primairePand, setPrimairePand] = useState(() => {
    const selected = aanvankelijkeIds(
      initialValues,
      "woning",
      new Set(bron.woningen.map((woning) => woning.id)),
      selectie.woningIds ?? [],
    );
    return selected[0]?.toString() ?? "";
  });
  const [actieveDragers, setActieveDragers] = useState<Energiedrager[]>(() => {
    if (initialValues?.drager === undefined)
      return enkelewaarde(initialValues, "producten_ingediend") === "1"
        ? []
        : dragers;
    return [
      ...new Set(
        lijstwaarde(initialValues, "drager").filter(
          (waarde): waarde is Energiedrager =>
            energieproducten.includes(waarde as Energiedrager),
        ),
      ),
    ];
  });
  const [archief, setArchief] = useState(
    () => enkelewaarde(initialValues, "archief") === "1" || !!selectie.archief,
  );
  const [vanaf, setVanaf] = useState(() =>
    geldigeDatum(
      enkelewaarde(initialValues, "vanaf"),
      selectie.vanaf,
      minimum,
      maximum,
    ),
  );
  const [totEnMet, setTotEnMet] = useState(() =>
    geldigeDatum(
      enkelewaarde(initialValues, "tot"),
      selectie.totEnMet,
      minimum,
      maximum,
    ),
  );
  const [uitgebreidOpen, setUitgebreidOpen] = useState(
    () =>
      validationError?.veld === "modus" ||
      validationError?.veld === "dekking" ||
      validationError?.veld === "kwaliteit",
  );
  const [bedrijfPandenOpen, setBedrijfPandenOpen] = useState(
    () => validationError?.veld === "woning",
  );
  const [totaalExtraOpen, setTotaalExtraOpen] = useState(
    () =>
      validationError?.veld === "bedrijf" ||
      validationError?.veld === "woning",
  );
  const [meerderePandenOpen, setMeerderePandenOpen] = useState(
    () => validationError?.veld === "woning",
  );
  const selectieBedrijfIds = niveau === "woning" ? [] : klanten;
  const beschikbaar = beschikbareEnergieWoningen(bron, {
    bedrijfIds: selectieBedrijfIds,
    vanaf,
    totEnMet,
    archief,
  });
  const beschikbaarIds = new Set(beschikbaar.map((woning) => woning.id));
  const nietBeschikbareSelecties = panden
    .filter((id) => !beschikbaarIds.has(id))
    .map((id) => bron.woningen.find((woning) => woning.id === id))
    .filter((woning): woning is NonNullable<typeof woning> => !!woning);
  const algemeenFout = validationError?.veld === "algemeen";
  const foutTekst = (veld: EnergieSelectieVeld) =>
    validationError?.veld === veld ? validationError.bericht : undefined;
  const foutProps = (veld: EnergieSelectieVeld) => ({
    "aria-invalid": foutTekst(veld) ? true : undefined,
    "aria-describedby": foutTekst(veld) ? selectieFoutId(veld) : undefined,
  });
  const klantKeuze = (
    <fieldset
      className="min-w-0 rounded-xl border border-slate-200 p-3"
      {...foutProps("bedrijf")}
    >
      <legend className="px-1 text-sm font-semibold">
        Klanten {niveau === "bedrijf" ? "(kies één of meer)" : "(optioneel)"}
      </legend>
      <div className="mt-2 max-h-52 space-y-1 overflow-auto">
        {bron.bedrijven.map((bedrijf, index) => (
          <label
            key={bedrijf.id}
            className="flex min-h-11 items-center gap-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              name="bedrijf"
              value={bedrijf.id}
              checked={klanten.includes(bedrijf.id)}
              required={niveau === "bedrijf" && index === 0}
              onChange={() => {
                const volgendeKlanten = toggle(klanten, bedrijf.id);
                setKlanten(volgendeKlanten);
                const woningIds = new Set(
                  beschikbareEnergieWoningen(bron, {
                    bedrijfIds:
                      niveau === "woning" ? [] : volgendeKlanten,
                    vanaf,
                    totEnMet,
                    archief,
                  }).map((woning) => woning.id),
                );
                setPanden((geselecteerd) =>
                  geselecteerd.filter((id) => woningIds.has(id)),
                );
                if (
                  niveau !== "woning" &&
                  primairePand &&
                  !woningIds.has(Number(primairePand))
                )
                  setPrimairePand("");
              }}
              aria-invalid={!!foutTekst("bedrijf") || undefined}
              aria-describedby={
                foutTekst("bedrijf") ? selectieFoutId("bedrijf") : undefined
              }
              className="h-5 w-5 shrink-0 accent-emerald-700"
            />
            <span>{bedrijf.naam}</span>
          </label>
        ))}
        {!bron.bedrijven.length && (
          <p className="py-2 text-sm text-slate-600">Geen klanten beschikbaar.</p>
        )}
      </div>
      {foutTekst("bedrijf") && (
        <p
          id={selectieFoutId("bedrijf")}
          role="alert"
          className="mt-2 text-sm font-medium text-rose-800"
        >
          {foutTekst("bedrijf")}
        </p>
      )}
    </fieldset>
  );
  const pandKeuze = (verplicht: boolean, uitsluiten?: number) => (
    <fieldset
      className="min-w-0 rounded-xl border border-slate-200 p-3"
      {...foutProps("woning")}
    >
      <legend className="px-1 text-sm font-semibold">
        Panden {verplicht ? "(kies één of meer)" : "(optioneel)"}
      </legend>
      <div className="mt-2 max-h-56 space-y-1 overflow-auto">
        {beschikbaar
          .filter((woning) => woning.id !== uitsluiten)
          .map((woning, index) => (
          <label
            key={woning.id}
            className="flex min-h-11 items-center gap-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              name="woning"
              value={woning.id}
              checked={panden.includes(woning.id)}
              required={verplicht && index === 0}
              onChange={() => setPanden((huidig) => toggle(huidig, woning.id))}
              aria-invalid={!!foutTekst("woning") || undefined}
              aria-describedby={
                foutTekst("woning") ? selectieFoutId("woning") : undefined
              }
              className="h-5 w-5 shrink-0 accent-emerald-700"
            />
            <span>
              {woning.adres}
              {woning.status !== "actief" && woning.status
                ? " (archief)"
                : ""}
            </span>
          </label>
        ))}
        {nietBeschikbareSelecties
          .filter((woning) => woning.id !== uitsluiten)
          .map((woning) => (
          <label
            key={`niet-beschikbaar-${woning.id}`}
            className="flex min-h-11 items-center gap-3 py-2 text-sm text-amber-900"
          >
            <input
              type="checkbox"
              name="woning"
              value={woning.id}
              checked
              onChange={() => setPanden((huidig) => toggle(huidig, woning.id))}
              aria-invalid={!!foutTekst("woning") || undefined}
              aria-describedby={
                foutTekst("woning") ? selectieFoutId("woning") : undefined
              }
              className="h-5 w-5 shrink-0 accent-amber-700"
            />
            <span>
              {woning.adres} — niet beschikbaar voor klant, periode of archiefkeuze
            </span>
          </label>
        ))}
        {!beschikbaar.length && !nietBeschikbareSelecties.length && (
          <p className="py-2 text-sm text-slate-600">
            Geen panden beschikbaar voor de gekozen klant, periode en
            archiefinstelling.
          </p>
        )}
      </div>
      {verplicht && !beschikbaar.length && !panden.length && (
        <p className="mt-2 text-sm text-rose-800">
          Er is geen pand om te selecteren binnen deze filters.
        </p>
      )}
      {foutTekst("woning") && (
        <p
          id={selectieFoutId("woning")}
          role="alert"
          className="mt-2 text-sm font-medium text-rose-800"
        >
          {foutTekst("woning")}
        </p>
      )}
    </fieldset>
  );

  function wijzigBereik(nieuwVanaf: string, nieuwTot: string) {
    setVanaf(nieuwVanaf);
    setTotEnMet(nieuwTot);
    const woningIds = new Set(
      beschikbareEnergieWoningen(bron, {
        bedrijfIds: selectieBedrijfIds,
        vanaf: nieuwVanaf,
        totEnMet: nieuwTot,
        archief,
      }).map((woning) => woning.id),
    );
    if (primairePand && !woningIds.has(Number(primairePand)))
      setPrimairePand("");
    setPanden((geselecteerd) =>
      geselecteerd.filter((id) => woningIds.has(id)),
    );
  }

  return (
    <form
      method="get"
      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      {algemeenFout && (
        <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-900">
          {validationError.bericht}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm font-semibold">
          Vergelijking
          <select
            name="niveau"
            value={niveau}
            onChange={(event) => {
              const volgendNiveau = event.target.value as typeof niveau;
              setNiveau(volgendNiveau);
              const woningIds = new Set(
                beschikbareEnergieWoningen(bron, {
                  bedrijfIds:
                    volgendNiveau === "woning" ? [] : klanten,
                  vanaf,
                  totEnMet,
                  archief,
                }).map((woning) => woning.id),
              );
              setPanden((geselecteerd) =>
                geselecteerd.filter((id) => woningIds.has(id)),
              );
              if (
                volgendNiveau === "woning" &&
                (!primairePand ||
                  !woningIds.has(Number(primairePand)))
              )
                setPrimairePand(
                  panden
                    .find((id) => woningIds.has(id))
                    ?.toString() ?? "",
                );
              if (
                volgendNiveau !== "woning" &&
                primairePand &&
                !woningIds.has(Number(primairePand))
              )
                setPrimairePand("");
            }}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3"
            {...foutProps("niveau")}
          >
            <option value="totaal">Alle panden</option>
            <option value="bedrijf">Per klant</option>
            <option value="woning">Eén pand</option>
          </select>
          {foutTekst("niveau") && (
            <span id={selectieFoutId("niveau")} role="alert" className="mt-2 block text-rose-800">
              {foutTekst("niveau")}
            </span>
          )}
        </label>

        {niveau === "bedrijf" && klantKeuze}
        {niveau === "woning" && (
          <>
            <label className="text-sm font-semibold" {...foutProps("woning")}>
              Pand
              <select
                name="woning"
                value={primairePand}
                required
                onChange={(event) => {
                  const volgendePand = event.target.value;
                  const huidigPand = primairePand;
                  setPrimairePand(volgendePand);
                  setPanden((huidig) => [
                    ...huidig.filter(
                      (id) =>
                        id !== Number(huidigPand) &&
                        id !== Number(volgendePand),
                    ),
                    ...(volgendePand ? [Number(volgendePand)] : []),
                  ]);
                }}
                aria-invalid={!!foutTekst("woning") || undefined}
                aria-describedby={
                  foutTekst("woning") ? selectieFoutId("woning") : undefined
                }
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3"
              >
                <option value="">Kies één pand</option>
                {beschikbaar.map((woning) => (
                  <option key={woning.id} value={woning.id}>
                    {woning.adres}
                  </option>
                ))}
                {nietBeschikbareSelecties
                  .filter((woning) => woning.id.toString() === primairePand)
                  .map((woning) => (
                    <option key={woning.id} value={woning.id}>
                      {woning.adres} — niet beschikbaar binnen deze filters
                    </option>
                  ))}
              </select>
              {foutTekst("woning") && (
                <span
                  id={selectieFoutId("woning")}
                  role="alert"
                  className="mt-2 block text-rose-800"
                >
                  {foutTekst("woning")}
                </span>
              )}
            </label>
            <details
              open={meerderePandenOpen}
              onToggle={(event) =>
                setMeerderePandenOpen(event.currentTarget.open)
              }
              className="rounded-xl border border-slate-200 p-3"
            >
              <summary className="min-h-11 cursor-pointer py-2 font-semibold">
                Meerdere panden selecteren (optioneel)
              </summary>
              <div className="mt-2">
                {pandKeuze(false, Number(primairePand))}
              </div>
            </details>
          </>
        )}
        {niveau === "bedrijf" && (
          <details
            open={bedrijfPandenOpen}
            onToggle={(event) =>
              setBedrijfPandenOpen(event.currentTarget.open)
            }
            className="rounded-xl border border-slate-200 p-3"
          >
            <summary className="min-h-11 cursor-pointer py-2 font-semibold">
              Beperk tot specifieke panden · {panden.length || "alle relevante"}
            </summary>
            <div className="mt-2">{pandKeuze(false)}</div>
          </details>
        )}
        {niveau === "totaal" && (
          <details
            open={totaalExtraOpen}
            onToggle={(event) => setTotaalExtraOpen(event.currentTarget.open)}
            className="rounded-xl border border-slate-200 p-3"
          >
            <summary className="min-h-11 cursor-pointer py-2 font-semibold">
              Extra selectie · meerdere klanten of panden
            </summary>
            <div className="mt-2 grid gap-3">
              {klantKeuze}
              {pandKeuze(false)}
            </div>
          </details>
        )}

        <fieldset className="rounded-xl border border-slate-200 p-3">
          <legend className="px-1 text-sm font-semibold">Energieproducten</legend>
          <div className="mt-1 space-y-1">
            {energieproducten.map((product, index) => (
              <label
                key={product}
                className="flex min-h-11 items-center gap-3 py-2 text-sm capitalize"
              >
                <input
                  type="checkbox"
                  name="drager"
                  value={product}
                  checked={actieveDragers.includes(product)}
                  required={index === 0}
                  onChange={() =>
                    setActieveDragers((huidig) =>
                      huidig.includes(product)
                        ? huidig.filter((item) => item !== product)
                        : [...huidig, product],
                    )
                  }
                  aria-invalid={!!foutTekst("drager") || undefined}
                  aria-describedby={
                    foutTekst("drager") ? selectieFoutId("drager") : undefined
                  }
                  className="h-5 w-5 shrink-0 accent-emerald-700"
                />
                {product}
              </label>
            ))}
          </div>
          <input type="hidden" name="producten_ingediend" value="1" />
          {foutTekst("drager") && (
            <p
              id={selectieFoutId("drager")}
              role="alert"
              className="mt-2 text-sm font-medium text-rose-800"
            >
              {foutTekst("drager")}
            </p>
          )}
        </fieldset>

        <EnergieAnalyseDatumvelden
          vanaf={vanaf}
          totEnMet={totEnMet}
          minimum={minimum}
          maximum={maximum}
          onWijzigBereik={wijzigBereik}
          validationError={
            validationError?.veld === "vanaf" ||
            validationError?.veld === "tot"
              ? {
                  veld: validationError.veld,
                  bericht: validationError.bericht,
                }
              : undefined
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="archief"
            value="1"
            checked={archief}
            onChange={(event) => {
              const volgendeArchief = event.target.checked;
              setArchief(volgendeArchief);
              const woningIds = new Set(
                beschikbareEnergieWoningen(bron, {
                  bedrijfIds: selectieBedrijfIds,
                  vanaf,
                  totEnMet,
                  archief: volgendeArchief,
                }).map((woning) => woning.id),
              );
              setPanden((geselecteerd) =>
                geselecteerd.filter((id) => woningIds.has(id)),
              );
              if (primairePand && !woningIds.has(Number(primairePand)))
                setPrimairePand("");
            }}
            className="h-5 w-5 shrink-0 accent-emerald-700"
          />
          Historische / gearchiveerde panden meenemen
        </label>
      </div>

      <details
        open={uitgebreidOpen}
        onToggle={(event) =>
          setUitgebreidOpen(event.currentTarget.open)
        }
        className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
      >
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">
          Uitgebreide instellingen ·{" "}
          {selectie.modus === "schatting" ||
          enkelewaarde(initialValues, "modus") === "schatting"
            ? "schattingen"
            : "gemeten intervallen"}{" "}
          · benchmark ≥ {enkelewaarde(initialValues, "dekking") ?? selectie.minimaleDekking ?? 100}% ·{" "}
          {enkelewaarde(initialValues, "kwaliteit") ?? selectie.kwaliteit ?? "alle"}{" "}
          gegevens
        </summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-semibold">
            Berekeningsmodus
            <select
              name="modus"
              defaultValue={enkelewaarde(initialValues, "modus") ?? selectie.modus ?? "exact"}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3"
              {...foutProps("modus")}
            >
              <option value="exact">Alleen gemeten intervallen</option>
              <option value="schatting">Inclusief geschatte grensverdeling</option>
            </select>
            {foutTekst("modus") && (
              <span id={selectieFoutId("modus")} role="alert" className="mt-2 block text-rose-800">
                {foutTekst("modus")}
              </span>
            )}
          </label>
          <label className="text-sm font-semibold">
            Minimale benchmarkdekking (%)
            <input
              name="dekking"
              type="number"
              min="0"
              max="100"
              defaultValue={enkelewaarde(initialValues, "dekking") ?? selectie.minimaleDekking ?? 100}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3"
              {...foutProps("dekking")}
            />
            {foutTekst("dekking") && (
              <span id={selectieFoutId("dekking")} role="alert" className="mt-2 block text-rose-800">
                {foutTekst("dekking")}
              </span>
            )}
          </label>
          <label className="text-sm font-semibold">
            Datakwaliteit
            <select
              name="kwaliteit"
              defaultValue={enkelewaarde(initialValues, "kwaliteit") ?? selectie.kwaliteit ?? "alle"}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3"
              {...foutProps("kwaliteit")}
            >
              <option value="alle">Alles, inclusief ontbrekende gegevens</option>
              <option value="betrouwbaar">Alleen betrouwbare gegevens</option>
              <option value="controleren">Alleen controle nodig</option>
            </select>
            {foutTekst("kwaliteit") && (
              <span id={selectieFoutId("kwaliteit")} role="alert" className="mt-2 block text-rose-800">
                {foutTekst("kwaliteit")}
              </span>
            )}
          </label>
        </div>
      </details>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="min-h-12 rounded-xl bg-emerald-700 px-6 py-3 font-bold text-white hover:bg-emerald-800"
        >
          Analyse toepassen
        </button>
        <p className="text-xs text-slate-600">
          Beginmeetdatum inclusief, eindmeetdatum exclusief. Geen gekozen
          panden betekent: alle relevante panden.
        </p>
      </div>
    </form>
  );
}
