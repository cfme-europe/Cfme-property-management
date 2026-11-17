import {
  bouwEnergiePortfolioAnalyse,
  type Brondata,
  type EnergieInterval,
} from "./portfolio-analyse";
import { dagen, datumTijd, gedekteDagen } from "./rekenregels";
import { parseEnergieMaand } from "./maand-analyse";

export type Jaarprijs = {
  id?: string;
  woning_id: number;
  jaar: number;
  voorganger_id?: string | null;
  stroomtype: "enkel" | "dag_nacht";
  stroom: number | null;
  dag: number | null;
  nacht: number | null;
  gas: number | null;
  water: number | null;
  vast_jaar: number | null;
  stroom_actief: boolean;
  gas_actief: boolean;
  water_actief: boolean;
};
export type VoorschotAfspraak = {
  id?: string;
  verhuurperiode_id: number;
  voorganger_id?: string | null;
  vanaf: string;
  tot: string | null;
  startsaldo: number | null;
  voorschotten: { vanaf: string; bedrag: number | null }[];
};
export type SaldoMaand = {
  maand: string;
  vanaf: string;
  tot: string;
  lopend: boolean;
  kosten: number | null;
  bekend: number;
  voorschot: number | null;
  verschil: number | null;
  saldo: number | null;
  ontbrekend: string[];
  producten: {
    product: string;
    verbruik: number | null;
    kosten: number | null;
    bekend: number;
    dekking: number;
  }[];
};
export type PandSaldo = {
  woning_id: number;
  verhuurperiode_id: number;
  bedrijf_id: number;
  adres: string;
  klant: string;
  vanaf: string;
  startsaldo: number | null;
  maanden: SaldoMaand[];
  startstanden?: {
    product: string;
    register: string;
    stand: number;
    geschat: boolean;
    bronVanaf: string;
    bronTot: string;
  }[];
};
const euro = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
export function actueleVersies<
  T extends { id?: string; voorganger_id?: string | null },
>(rows: T[]): T[] {
  const oud = new Set(rows.map((r) => r.voorganger_id));
  return rows.filter((r) => !r.id || !oud.has(r.id));
}
export function controleerAfspraak(a: VoorschotAfspraak) {
  datumTijd(a.vanaf);
  if (a.tot && dagen(a.vanaf, a.tot) <= 0)
    throw new Error("Einde moet na de start liggen.");
  if (a.startsaldo !== null && !Number.isFinite(a.startsaldo))
    throw new Error("Ongeldig startsaldo.");
  if (!Array.isArray(a.voorschotten) || a.voorschotten.length > 120)
    throw new Error("Ongeldige voorschotten.");
  const gezien = new Set<string>();
  for (const v of a.voorschotten) {
    datumTijd(v.vanaf);
    if (v.vanaf < a.vanaf || (a.tot && v.vanaf >= a.tot) || gezien.has(v.vanaf))
      throw new Error(
        "Voorschotdatum valt buiten de afspraak of komt dubbel voor.",
      );
    if (v.bedrag !== null && (!Number.isFinite(v.bedrag) || v.bedrag < 0))
      throw new Error("Voorschot moet nul of positief zijn.");
    gezien.add(v.vanaf);
  }
}
// Alle bedragen inclusief btw. Afronden per maand; onbekend is nooit nul.
export function berekenSaldoMaand(
  maand: string,
  vanaf: string,
  tot: string,
  lopend: boolean,
  prijs: Jaarprijs | undefined,
  afspraak: VoorschotAfspraak,
  intervallen: Record<"elektriciteit" | "gas" | "water", EnergieInterval[]>,
): SaldoMaand {
  const periode = parseEnergieMaand(maand),
    ontbrekend: string[] = [];
  const producten: SaldoMaand["producten"] = [];
  let bekend = 0;
  for (const product of ["elektriciteit", "gas", "water"] as const) {
    const actief = prijs
      ? product === "elektriciteit"
        ? prijs.stroom_actief
        : product === "gas"
          ? prijs.gas_actief
          : prijs.water_actief
      : true;
    if (!actief) continue;
    const bruikbaar = intervallen[product].filter(
      (i) =>
        i.betrouwbaar &&
        !i.geschat &&
        i.waarde !== null &&
        (!i.bedrijfIds || i.bedrijfIds.length <= 1),
    );
    const dekking = Math.min(
      100,
      (100 * gedekteDagen(bruikbaar)) / dagen(vanaf, tot),
    );
    let kosten = 0,
      volledig = true;
    if (dekking < 99.999) {
      ontbrekend.push(`${product}: metingen onvolledig`);
      volledig = false;
    }
    for (const i of bruikbaar) {
      if (product === "elektriciteit" && prijs?.stroomtype === "dag_nacht") {
        if (
          i.dag === null ||
          i.nacht === null ||
          prijs.dag === null ||
          prijs.nacht === null
        ) {
          volledig = false;
          ontbrekend.push("stroom: dag-/nachtprijs of register ontbreekt");
        } else kosten += i.dag * prijs.dag + i.nacht * prijs.nacht;
      } else {
        const tarief = !prijs
          ? null
          : product === "elektriciteit"
            ? prijs.stroom
            : prijs[product];
        if (tarief === null) {
          volledig = false;
          ontbrekend.push(`${product}: jaarprijs ontbreekt`);
        } else kosten += i.waarde! * tarief;
      }
    }
    if (!prijs) {
      volledig = false;
      ontbrekend.push(`Jaarprijzen ${maand.slice(0, 4)} ontbreken`);
    }
    bekend += kosten;
    producten.push({
      product,
      verbruik: bruikbaar.length
        ? bruikbaar.reduce((s, i) => s + i.waarde!, 0)
        : null,
      kosten: volledig ? euro(kosten) : null,
      bekend: euro(kosten),
      dekking,
    });
  }
  if (prijs?.vast_jaar === null || !prijs)
    ontbrekend.push("Vaste jaarkosten ontbreken (vul 0 in indien geen)");
  else
    bekend +=
      (prijs.vast_jaar * dagen(vanaf, tot)) /
      dagen(`${prijs.jaar}-01-01`, `${prijs.jaar + 1}-01-01`);
  const kosten = ontbrekend.length ? null : euro(bekend);
  const wijzigingen = [...afspraak.voorschotten].sort((a, b) =>
    a.vanaf.localeCompare(b.vanaf),
  );
  const grenzen = [
    vanaf,
    ...wijzigingen.map((v) => v.vanaf).filter((d) => d > vanaf && d < tot),
    tot,
  ];
  let voorschot: number | null = 0;
  for (let i = 0; i < grenzen.length - 1; i++) {
    const v = wijzigingen.filter((v) => v.vanaf <= grenzen[i]).at(-1);
    if (!v || v.bedrag === null) {
      voorschot = null;
      ontbrekend.push("Voorschot ontbreekt");
      break;
    }
    voorschot += (v.bedrag * dagen(grenzen[i], grenzen[i + 1])) / periode.dagen;
  }
  voorschot = voorschot === null ? null : euro(voorschot);
  return {
    maand,
    vanaf,
    tot,
    lopend,
    kosten,
    bekend: euro(bekend),
    voorschot,
    verschil:
      voorschot === null || kosten === null ? null : euro(voorschot - kosten),
    saldo: null,
    ontbrekend: [...new Set(ontbrekend)],
    producten,
  };
}
export function bouwVoorschotSaldi(
  bron: Brondata,
  prijzen: Jaarprijs[],
  afspraken: VoorschotAfspraak[],
  vandaag: string,
): PandSaldo[] {
  const veilig = {
    ...bron,
    meterstanden: bron.meterstanden.filter((m) => m.opnamedatum <= vandaag),
  };
  return actueleVersies(afspraken)
    .map((a): PandSaldo | null => {
      controleerAfspraak(a);
      const huur = bron.verhuurperioden.find(
        (v) => v.id === a.verhuurperiode_id,
      );
      if (!huur) return null;
      const vanaf = [a.vanaf, huur.startdatum ?? a.vanaf].sort().at(-1)!;
      const einde = [vandaag, a.tot, huur.werkelijke_einddatum]
        .filter((v): v is string => !!v)
        .sort()[0];
      const maanden: SaldoMaand[] = [];
      const startstanden: NonNullable<PandSaldo["startstanden"]> = [];
      let saldo = a.startsaldo;
      // Bound to the agreement, independent of visible year or product filters.
      for (
        let m = vanaf.slice(0, 7);
        `${m}-01` < einde;
        m = parseEnergieMaand(m).tot.slice(0, 7)
      ) {
        const p = parseEnergieMaand(m),
          van = vanaf > p.vanaf ? vanaf : p.vanaf,
          tot = einde < p.tot ? einde : p.tot;
        if (tot <= van) continue;
        const intervallen = Object.fromEntries(
          (["elektriciteit", "gas", "water"] as const).map((drager) => [
            drager,
            bouwEnergiePortfolioAnalyse(veilig, {
              niveau: "woning",
              woningId: huur.woning_id,
              bedrijfIds: [huur.bedrijf_id],
              drager,
              vanaf: van,
              totEnMet: tot,
              modus: "schatting",
              kwaliteit: "alle",
              minimaleDekking: 0,
              archief: true,
            }).rijen[0]?.intervallen ?? [],
          ]),
        ) as Record<"elektriciteit" | "gas" | "water", EnergieInterval[]>;
        if (maanden.length === 0)
          for (const product of ["elektriciteit", "gas", "water"] as const) {
            const i = intervallen[product].find(
              (i) =>
                i.vanDatum === vanaf &&
                i.betrouwbaar &&
                !i.geschat &&
                i.waarde !== null,
            );
            if (i)
              for (const r of i.gebruikteStanden)
                if (
                  r.begin !== null &&
                  r.eind !== null &&
                  r.eind >= r.begin &&
                  dagen(i.bronVanaf, i.bronTot) > 0
                ) {
                  startstanden.push({
                    product,
                    register: r.register,
                    stand:
                      r.begin +
                      ((r.eind - r.begin) * dagen(i.bronVanaf, vanaf)) /
                        dagen(i.bronVanaf, i.bronTot),
                    geschat: i.bronVanaf !== vanaf,
                    bronVanaf: i.bronVanaf,
                    bronTot: i.bronTot,
                  });
                }
          }
        const prijs = actueleVersies(prijzen).find(
          (p) =>
            p.woning_id === huur.woning_id && p.jaar === Number(m.slice(0, 4)),
        );
        const rij = berekenSaldoMaand(
          m,
          van,
          tot,
          m === vandaag.slice(0, 7),
          prijs,
          a,
          intervallen,
        );
        saldo =
          saldo === null || rij.verschil === null
            ? null
            : euro(saldo + rij.verschil);
        rij.saldo = saldo;
        if (a.startsaldo === null) rij.ontbrekend.push("Startsaldo ontbreekt");
        if (saldo === null && a.startsaldo !== null && rij.verschil !== null)
          rij.ontbrekend.push(
            "Eerdere maand onvolledig; cumulatief saldo onbekend",
          );
        maanden.push(rij);
      }
      return {
        woning_id: huur.woning_id,
        verhuurperiode_id: huur.id,
        bedrijf_id: huur.bedrijf_id,
        adres: bron.woningen.find((w) => w.id === huur.woning_id)?.adres ?? "",
        klant: bron.bedrijven.find((b) => b.id === huur.bedrijf_id)?.naam ?? "",
        vanaf,
        startsaldo: a.startsaldo,
        maanden,
        startstanden,
      };
    })
    .filter((p): p is PandSaldo => p !== null);
}
