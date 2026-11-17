"use server";
import { createHash } from "node:crypto";
import {
  energieClient,
  getEnergieAnalyseBrondata,
  getEnergieUitbreiding,
} from "@/services/energieanalyse-server";
import { getEnergieVoorschotten } from "@/services/energie-voorschotten-server";
import { bouwVoorschotSaldi } from "@/lib/energie/voorschotten";
import {
  bouwTijdlijn,
  tijdlijnProducten,
  type TijdlijnProduct,
} from "@/lib/energie/tijdlijn";
import {
  bouwTijdlijnRapport,
  klantTijdlijn,
} from "@/lib/energie/tijdlijn-rapport";
import type { EnergieKlantSnapshot } from "@/lib/energie/snapshot";
export async function bewaarTijdlijnRapport(
  _: { fout?: string; url?: string },
  f: FormData,
): Promise<{ fout?: string; url?: string }> {
  try {
    const { supabase, user } = await energieClient(true);
    const rapportId = Number(f.get("rapportage_id")),
      jaar = Number(f.get("jaar")),
      ref = Number(f.get("vergelijkjaar")),
      van = Number(f.get("van")),
      tot = Number(f.get("tot"));
    if (
      !Number.isSafeInteger(rapportId) ||
      rapportId <= 0 ||
      ![jaar, ref].every(
        (n) => Number.isInteger(n) && n >= 1900 && n <= 2200,
      ) ||
      !Number.isInteger(van) ||
      !Number.isInteger(tot) ||
      van < 0 ||
      tot > 11 ||
      tot < van
    )
      throw new Error("Ongeldige rapportselectie.");
    const { data: rapport, error } = await supabase
      .from("maandrapportages")
      .select("id,woning_id,verhuurperiode_id")
      .eq("id", rapportId)
      .single();
    if (error || !rapport) throw new Error("Rapportage niet beschikbaar.");
    const [bron, ext, invoer] = await Promise.all([
      getEnergieAnalyseBrondata(),
      getEnergieUitbreiding(),
      getEnergieVoorschotten(),
    ]);
    const huur = bron.verhuurperioden.find(
      (v) =>
        v.id === rapport.verhuurperiode_id && v.woning_id === rapport.woning_id,
    );
    if (!huur)
      throw new Error(
        "Koppel de rapportage eerst aan de juiste klantverhuurperiode.",
      );
    const vandaag = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Amsterdam",
    }).format(new Date());
    const data = {
      ...bron,
      woningen: bron.woningen.filter((w) => w.id === rapport.woning_id),
      meterconfiguraties: ext.configuraties,
    };
    const pand = bouwTijdlijn(data, jaar, vandaag, [huur.bedrijf_id])[0];
    if (!pand) throw new Error("Pand niet beschikbaar.");
    const vergelijken = f.get("vergelijk") === "jaar";
    const referentie = vergelijken
      ? bouwTijdlijn(data, ref, vandaag, [huur.bedrijf_id], jaar)[0]
      : undefined;
    const producten =
      String(f.get("product")) === "alle"
        ? [...tijdlijnProducten]
        : [String(f.get("product")) as TijdlijnProduct];
    if (producten.some((p) => !tijdlijnProducten.includes(p)))
      throw new Error("Ongeldig product.");
    const afspraken = invoer.afspraken.filter(
      (a) => a.verhuurperiode_id === huur.id,
    );
    const saldi =
      f.get("saldo") === "1"
        ? bouwVoorschotSaldi(data, invoer.prijzen, afspraken, vandaag)
        : [];
    const tijdlijn = klantTijdlijn(
      bouwTijdlijnRapport(
        pand,
        referentie,
        jaar,
        vergelijken ? ref : null,
        van,
        tot,
        f.get("persoon") === "1",
        producten,
        saldi[0] ?? null,
      ),
    );
    tijdlijn.saldoOntbreekt = f.get("saldo") === "1" && !tijdlijn.saldo;
    const nu = new Date().toISOString();
    const klant: EnergieKlantSnapshot = {
      versie: "energie-informatief-1",
      gegenereerd_op: nu,
      vanaf: `${jaar}-${String(van + 1).padStart(2, "0")}-01`,
      tot: new Date(Date.UTC(jaar, tot + 1, 1)).toISOString().slice(0, 10),
      modus: "informatief",
      producten: [],
      maatregelen: [],
      conclusie:
        "Geschatte kosten inclusief btw. Afgesproken voorschotten zijn geen bewijs van betaling. Informatief, geen afrekening.",
      tijdlijn,
    };
    const intern = {
      tijdlijn,
      prijzen: invoer.prijzen.filter((p) => p.woning_id === rapport.woning_id),
      afspraken,
      gebruiker: user.id,
      peildatum: vandaag,
      pand,
      referentie,
      codeversie: process.env.VERCEL_GIT_COMMIT_SHA ?? "energie-informatief-1",
    };
    const { error: save } = await supabase.from("energie_snapshots").insert({
      maandrapportage_id: rapport.id,
      woning_id: rapport.woning_id,
      klant,
      intern,
      bron_hash: createHash("sha256")
        .update(JSON.stringify(intern))
        .digest("hex"),
      rekenregels: "energie-informatief-1",
      codeversie: intern.codeversie,
    });
    if (save) throw new Error(save.message);
    return { url: `/woningen/${rapport.woning_id}/rapportages/${rapport.id}` };
  } catch (e) {
    return {
      fout: e instanceof Error ? e.message : "Rapportage bewaren mislukt.",
    };
  }
}
