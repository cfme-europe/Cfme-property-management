import { controleerPeriode, datumTijd, dagen } from "./rekenregels";
import type { EnergieInterval } from "./portfolio-analyse";
export type Tariefcomponent = {
  soort:
    | "variabel"
    | "dag"
    | "nacht"
    | "vast_dag"
    | "vast_maand"
    | "belasting"
    | "toeslag"
    | "teruglevering";
  prijs: string;
  btw_percentage: string;
  inclusief_btw: boolean;
};
export type Tariefplan = {
  id: string;
  product: string;
  eenheid: string;
  valuta: string;
  vanaf: string;
  tot: string | null;
  woning_id: number | null;
  bedrijf_id: number | null;
  bron: string;
  componenten: Tariefcomponent[];
  created_at?: string;
  created_by?: string;
  voorganger_id?: string | null;
};
export type Kostenregel = {
  tarief_id: string;
  bron: string;
  vanaf: string;
  tot: string;
  soort: string;
  hoeveelheid: number;
  eenheidsprijs: string;
  inclusief_btw: boolean;
  exclusief_btw: number;
  btw: number;
  totaal: number;
  geschat: boolean;
  valuta: string;
};
export type Energiekosten = {
  regels: Kostenregel[];
  ontbrekend: string[];
  totaal: number | null;
  bekend_subtotaal: number;
  variabel: number;
  vast: number;
  belastingen: number;
  btw: number;
  valuta: string | null;
  geschat: boolean;
  gemiddelde_eenheidsprijs: number | null;
};
const S = BigInt(1000000000);
function decimal(s: string | number): bigint {
  const text = String(s);
  if (!/^-?\d+(\.\d{1,9})?$/.test(text))
    throw new Error("Gebruik een decimaal getal met maximaal 9 decimalen.");
  const [a, b = ""] = text.replace("-", "").split(".");
  return (
    (text.startsWith("-") ? -BigInt(1) : BigInt(1)) *
    (BigInt(a) * S + BigInt(b.padEnd(9, "0")))
  );
}
function rond(n: bigint, d: bigint): bigint {
  return n < 0 ? -rond(-n, d) : (n + d / BigInt(2)) / d;
}
export function valideerTarief(t: Tariefplan) {
  datumTijd(t.vanaf);
  if (t.tot) controleerPeriode(t.vanaf, t.tot);
  if (
    !t.product ||
    !t.bron.trim() ||
    !t.eenheid ||
    !/^[A-Z]{3}$/.test(t.valuta) ||
    (t.woning_id && t.bedrijf_id)
  )
    throw new Error("Ongeldig tariefplan.");
  if (!t.componenten.length)
    throw new Error("Voeg minimaal één tariefcomponent toe.");
  const types = new Set<string>();
  for (const c of t.componenten) {
    if (
      ![
        "variabel",
        "dag",
        "nacht",
        "vast_dag",
        "vast_maand",
        "belasting",
        "toeslag",
        "teruglevering",
      ].includes(c.soort) ||
      types.has(c.soort)
    )
      throw new Error("Ongeldige of dubbele tariefcomponent.");
    types.add(c.soort);
    if (
      decimal(c.prijs) < 0 ||
      decimal(c.btw_percentage) < 0 ||
      decimal(c.btw_percentage) > BigInt(100) * S
    )
      throw new Error("Prijs en btw buiten bereik.");
  }
  if (types.has("variabel") && (types.has("dag") || types.has("nacht")))
    throw new Error("Kies totaalverbruik of dag/nacht, niet beide.");
  if (types.has("dag") !== types.has("nacht"))
    throw new Error("Dag- en nachttarief samen vastleggen.");
}
export function effectieveTariefplannen(plannen: Tariefplan[]): Tariefplan[] {
  return plannen.map((tarief) => {
    const opvolgerdatum = plannen
      .filter(
        (kandidaat) =>
          kandidaat.id !== tarief.id &&
          kandidaat.product === tarief.product &&
          kandidaat.woning_id === tarief.woning_id &&
          kandidaat.bedrijf_id === tarief.bedrijf_id &&
          kandidaat.vanaf > tarief.vanaf,
      )
      .map((kandidaat) => kandidaat.vanaf)
      .sort()[0];
    if (!opvolgerdatum || (tarief.tot && tarief.tot <= opvolgerdatum))
      return tarief;
    return { ...tarief, tot: opvolgerdatum };
  });
}
export function vindGeldendTarief(
  plannen: Tariefplan[],
  product: string,
  woningId: number,
  bedrijfId: number | null,
  datum: string,
): Tariefplan | null {
  const actief = effectieveTariefplannen(plannen).filter(
    (tarief) =>
      tarief.product === product &&
      (!tarief.woning_id || tarief.woning_id === woningId) &&
      (!tarief.bedrijf_id ||
        (bedrijfId !== null && tarief.bedrijf_id === bedrijfId)) &&
      tarief.vanaf <= datum &&
      (!tarief.tot || datum < tarief.tot),
  );
  const prioriteit = (tarief: Tariefplan) =>
    tarief.woning_id ? 2 : tarief.bedrijf_id ? 1 : 0;
  const hoogste = Math.max(-1, ...actief.map(prioriteit));
  const gekozen = actief.filter((tarief) => prioriteit(tarief) === hoogste);
  return gekozen.length === 1 ? gekozen[0] : null;
}
export function berekenEnergiekosten(
  intervallen: EnergieInterval[],
  plannen: Tariefplan[],
  product: string,
  eenheid: string,
  register?: "dag" | "nacht",
): Energiekosten {
  const regels: Kostenregel[] = [],
    ontbrekend: string[] = [],
    geldendePlannen = effectieveTariefplannen(plannen);
  for (const t of plannen) valideerTarief(t);
  for (const i of intervallen.filter(
    (i) => i.betrouwbaar && i.waarde !== null,
  )) {
    const relevant = geldendePlannen.filter(
      (t) =>
        t.product ===
          (product === "dagstroom" || product === "nachtstroom"
            ? "elektriciteit"
            : product) &&
        t.eenheid === eenheid &&
        (!t.woning_id || t.woning_id === i.woningId) &&
        (!t.bedrijf_id ||
          (i.bedrijfIds.length === 1 && t.bedrijf_id === i.bedrijfIds[0])) &&
        t.vanaf < i.totDatum &&
        (!t.tot || t.tot > i.vanDatum),
    );
    const grenzen = [
      ...new Set([
        i.vanDatum,
        i.totDatum,
        ...relevant.flatMap((t) =>
          [t.vanaf, t.tot].filter(
            (s): s is string => !!s && s > i.vanDatum && s < i.totDatum,
          ),
        ),
      ]),
    ].sort();
    // Fixed monthly components split at calendar boundaries too.
    const month = new Date(`${i.vanDatum.slice(0, 7)}-01T00:00:00Z`);
    month.setUTCMonth(month.getUTCMonth() + 1);
    while (
      relevant.some((t) =>
        t.componenten.some((c) => c.soort === "vast_maand"),
      ) &&
      month.toISOString().slice(0, 10) < i.totDatum
    ) {
      grenzen.push(month.toISOString().slice(0, 10));
      month.setUTCMonth(month.getUTCMonth() + 1);
    }
    const cuts = [...new Set(grenzen)].sort();
    const winningIds = cuts.slice(0, -1).map((van, n) => {
      const active = relevant.filter(
        (t) => t.vanaf <= van && (!t.tot || t.tot >= cuts[n + 1]),
      );
      const weight = (t: Tariefplan) =>
        t.woning_id ? 2 : t.bedrijf_id ? 1 : 0;
      const max = Math.max(-1, ...active.map(weight));
      const winners = active.filter((t) => weight(t) === max);
      return winners.length === 1 ? winners[0].id : null;
    });
    const constantPlan =
      winningIds.length > 0 &&
      winningIds[0] !== null &&
      winningIds.every((id) => id === winningIds[0]);
    for (let n = 1; n < cuts.length; n++) {
      const van = cuts[n - 1],
        tot = cuts[n];
      const pool = relevant.filter(
        (t) => t.vanaf <= van && (!t.tot || t.tot >= tot),
      );
      const priority = (t: Tariefplan) =>
        t.woning_id ? 2 : t.bedrijf_id ? 1 : 0;
      const max = Math.max(-1, ...pool.map(priority));
      const winners = pool.filter((t) => priority(t) === max);
      if (winners.length !== 1) {
        ontbrekend.push(
          `${van} → ${tot}: ${winners.length ? "overlappende tarieven" : "tarief ontbreekt"}`,
        );
        continue;
      }
      const t = winners[0];
      const split = van !== i.vanDatum || tot !== i.totDatum;
      for (const c of t.componenten) {
        if (register && c.soort !== register) continue;
        const fixed = c.soort.startsWith("vast_");
        const wholeVariable = !fixed && constantPlan;
        if (wholeVariable && n > 1) continue;
        if (c.soort === "teruglevering") {
          ontbrekend.push(
            "Teruglevering vereist afzonderlijk gemeten exportvolume",
          );
          continue;
        }
        const base =
          c.soort === "dag" || register === "dag"
            ? i.dag
            : c.soort === "nacht" || register === "nacht"
              ? i.nacht
              : i.waarde;
        if (!fixed && base === null) {
          ontbrekend.push(`${c.soort}: registerverbruik ontbreekt`);
          continue;
        }
        const monthDays = new Date(
          Date.UTC(Number(van.slice(0, 4)), Number(van.slice(5, 7)), 0),
        ).getUTCDate();
        const qty = fixed
          ? dagen(van, tot) / (c.soort === "vast_maand" ? monthDays : 1)
          : base! * (wholeVariable ? 1 : dagen(van, tot) / i.dagen);
        const amount = decimal(qty.toFixed(9)) * decimal(c.prijs); // scale squared, no binary money arithmetic
        const vat = decimal(c.btw_percentage),
          hundred = BigInt(100) * S;
        const exNumerator = c.inclusief_btw ? amount * hundred : amount;
        const exDenominator = c.inclusief_btw ? S * S * (hundred + vat) : S * S;
        const exUnits = rond(exNumerator * S, exDenominator);
        const vatUnits = rond(exUnits * vat, hundred);
        const ex = Number(exUnits) / Number(S);
        const btw = Number(vatUnits) / Number(S);
        if (!Number.isFinite(ex) || !Number.isFinite(btw))
          throw new Error("Bedrag buiten het veilige rekenbereik.");
        regels.push({
          tarief_id: t.id,
          bron: t.bron,
          vanaf: wholeVariable ? i.vanDatum : van,
          tot: wholeVariable ? i.totDatum : tot,
          soort: c.soort,
          hoeveelheid: qty,
          eenheidsprijs: c.prijs,
          inclusief_btw: c.inclusief_btw,
          exclusief_btw: ex,
          btw,
          totaal: Number(exUnits + vatUnits) / Number(S),
          geschat: !fixed && ((split && !wholeVariable) || i.geschat),
          valuta: t.valuta,
        });
      }
    }
  }
  const sum = (rows: Kostenregel[], key: "totaal" | "btw" | "exclusief_btw") =>
    Number(
      rows.reduce(
        (total, row) => total + decimal(row[key].toFixed(9)),
        BigInt(0),
      ),
    ) / Number(S);
  const currencies = [...new Set(regels.map((r) => r.valuta))];
  if (currencies.length > 1)
    ontbrekend.push("Verschillende valuta: geen opgeteld totaal");
  const known = currencies.length <= 1 ? sum(regels, "totaal") : 0;
  const variableRows = regels.filter((r) =>
    ["variabel", "dag", "nacht"].includes(r.soort),
  );
  const variableConsumption = variableRows.reduce(
    (total, row) => total + row.hoeveelheid,
    0,
  );
  return {
    regels,
    ontbrekend: [...new Set(ontbrekend)],
    totaal: regels.length && !ontbrekend.length ? known : null,
    bekend_subtotaal: known,
    variabel: sum(variableRows, "exclusief_btw"),
    vast: sum(
      regels.filter((r) => r.soort.startsWith("vast_")),
      "exclusief_btw",
    ),
    belastingen: sum(
      regels.filter((r) => ["belasting", "toeslag"].includes(r.soort)),
      "exclusief_btw",
    ),
    btw: sum(regels, "btw"),
    valuta: currencies.length === 1 ? currencies[0] : null,
    geschat: regels.some((r) => r.geschat),
    gemiddelde_eenheidsprijs:
      !ontbrekend.length && variableConsumption > 0
        ? sum(variableRows, "totaal") / variableConsumption
        : null,
  };
}
