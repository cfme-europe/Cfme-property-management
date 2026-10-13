"use server";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  energieClient,
  getEnergieAnalyseBrondata,
  getEnergieUitbreiding,
} from "@/services/energieanalyse-server";
import {
  valideerTarief,
  type Tariefplan,
  type Tariefcomponent,
} from "@/lib/energie/tarieven";
import {
  controleerPeriode,
  datumTijd,
  ENERGIE_REKENREGELS,
} from "@/lib/energie/rekenregels";
import { bouwEnergieSnapshot } from "@/lib/energie/snapshot";
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
function id(f: FormData, k: string, optional = false) {
  const v = text(f, k);
  if (!v && optional) return null;
  const n = Number(v);
  if (!/^\d+$/.test(v) || !Number.isSafeInteger(n) || n <= 0)
    throw new Error(`Ongeldig ${k}.`);
  return n;
}
function uuid(f: FormData, k: string) {
  const v = text(f, k);
  if (!v) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(v))
    throw new Error("Ongeldige versie.");
  return v;
}
async function admin() {
  const { supabase, user } = await energieClient(true);
  const { data, error } = await supabase.rpc("heeft_rol", {
    toegestane_rollen: ["admin", "management"],
  });
  if (error || !data)
    throw new Error(
      "Alleen beheer en management mogen tarieven en meterconfiguraties vastleggen.",
    );
  return { supabase, user };
}
export async function slaEnergieTarief(f: FormData) {
  let fout = "";
  try {
    const { supabase } = await admin();
    const product = text(f, "product");
    const soort = text(f, "prijssoort");
    const components: Tariefcomponent[] = [];
    for (const key of [
      soort === "dag_nacht" ? "dag" : "variabel",
      ...(soort === "dag_nacht" ? ["nacht"] : []),
      "vast_dag",
      "vast_maand",
      "belasting",
      "toeslag",
      "teruglevering",
    ]) {
      const prijs = text(f, key).replace(",", ".");
      if (prijs)
        components.push({
          soort: key as Tariefcomponent["soort"],
          prijs,
          btw_percentage: text(f, "btw").replace(",", "."),
          inclusief_btw: text(f, "inclusief") === "ja",
        });
    }
    const input = {
      product,
      eenheid: product === "elektriciteit" ? "kWh" : "m³",
      valuta: text(f, "valuta"),
      vanaf: text(f, "vanaf"),
      tot: text(f, "tot") || null,
      woning_id: id(f, "woning_id", true),
      bedrijf_id: id(f, "bedrijf_id", true),
      bron: text(f, "bron"),
      componenten: components,
      voorganger_id: uuid(f, "voorganger_id"),
    };
    valideerTarief({ ...input, id: "nieuw" } as Tariefplan);
    const { error } = await supabase
      .from("energie_tariefplannen")
      .insert(input);
    if (error) throw new Error(error.message);
  } catch (e) {
    fout = e instanceof Error ? e.message : "Opslaan mislukt";
  }
  revalidatePath("/bedrijven/energieanalyse");
  redirect(
    `/bedrijven/energieanalyse/beheer?${new URLSearchParams(fout ? { fout } : { klaar: "Tariefversie opgeslagen" })}`,
  );
}
export async function slaEnergieMeterconfiguratie(f: FormData) {
  let fout = "";
  try {
    const { supabase } = await admin();
    const input = {
      voorganger_id: uuid(f, "voorganger_id"),
      woning_id: id(f, "woning_id"),
      product: text(f, "product"),
      meteridentiteit: text(f, "meteridentiteit"),
      woning_object_id: id(f, "woning_object_id", true),
      registertype: text(f, "registertype"),
      vanaf: text(f, "vanaf"),
      tot: text(f, "tot") || null,
    };
    datumTijd(input.vanaf);
    if (input.tot) controleerPeriode(input.vanaf, input.tot);
    if (
      !input.meteridentiteit ||
      !["dag_nacht", "enkel", "totaal"].includes(input.registertype)
    )
      throw new Error("Controleer de meterconfiguratie.");
    const { error } = await supabase
      .from("energie_meterconfiguraties")
      .insert(input);
    if (error) throw new Error(error.message);
  } catch (e) {
    fout = e instanceof Error ? e.message : "Opslaan mislukt";
  }
  revalidatePath("/bedrijven/energieanalyse");
  redirect(
    `/bedrijven/energieanalyse/beheer?${new URLSearchParams(fout ? { fout } : { klaar: "Meterconfiguratie opgeslagen" })}`,
  );
}
export async function slaEnergieMaatregel(f: FormData) {
  let fout = "";
  try {
    const { supabase } = await energieClient(true);
    const input = {
      woning_id: id(f, "woning_id"),
      product: text(f, "product"),
      titel: text(f, "titel"),
      status: text(f, "status"),
      uitvoerdatum: text(f, "uitvoerdatum") || null,
      taak_id: id(f, "taak_id", true),
      referentie_vanaf: text(f, "referentie_vanaf"),
      referentie_tot: text(f, "referentie_tot"),
      controle_vanaf: text(f, "controle_vanaf") || null,
      controle_tot: text(f, "controle_tot") || null,
      onderbouwing: text(f, "onderbouwing"),
      klant_toelichting: text(f, "klant_toelichting"),
      klant_goedgekeurd: f.get("klant_goedgekeurd") === "on",
      voorganger_id: uuid(f, "voorganger_id"),
    };
    controleerPeriode(input.referentie_vanaf, input.referentie_tot);
    if (input.controle_vanaf && input.controle_tot)
      controleerPeriode(input.controle_vanaf, input.controle_tot);
    if (!input.titel || !input.onderbouwing)
      throw new Error("Titel en onderbouwing zijn verplicht.");
    const { error } = await supabase.from("energie_maatregelen").insert(input);
    if (error) throw new Error(error.message);
  } catch (e) {
    fout = e instanceof Error ? e.message : "Opslaan mislukt";
  }
  revalidatePath("/bedrijven/energieanalyse/beheer");
  redirect(
    `/bedrijven/energieanalyse/beheer?${new URLSearchParams(fout ? { fout } : { klaar: "Maatregelversie opgeslagen; eerdere versie blijft bewaard" })}`,
  );
}
export async function maakEnergieRapportSnapshot(f: FormData) {
  const rapportId = id(f, "rapportage_id")!;
  const { supabase, user } = await energieClient(true);
  const { data: rapport, error } = await supabase
    .from("maandrapportages")
    .select("id,woning_id,verhuurperiode_id,rapportjaar,rapportmaand")
    .eq("id", rapportId)
    .single();
  if (error || !rapport) throw new Error("Rapportage niet gevonden.");
  const [bron, ext] = await Promise.all([
    getEnergieAnalyseBrondata(),
    getEnergieUitbreiding(),
  ]);
  if (!ext.beschikbaar)
    throw new Error("Database-uitbreiding nog niet geactiveerd.");
  bron.meterconfiguraties = ext.configuraties;
  const vanaf = new Date(
      Date.UTC(rapport.rapportjaar, rapport.rapportmaand - 1, 1),
    )
      .toISOString()
      .slice(0, 10),
    tot = new Date(Date.UTC(rapport.rapportjaar, rapport.rapportmaand, 1))
      .toISOString()
      .slice(0, 10);
  const vervangen = new Set(ext.tarieven.map((t) => t.voorganger_id));
  const dragers = f.getAll("drager").map(String);
  if (
    !dragers.length ||
    dragers.some((d) => !["elektriciteit", "gas", "water"].includes(d))
  )
    throw new Error("Selecteer geldige energieproducten.");
  const modus = text(f, "modus");
  if (!["exact", "schatting"].includes(modus))
    throw new Error("Ongeldige berekeningsmodus.");
  const huur = bron.verhuurperioden.find(
    (v) => v.id === rapport.verhuurperiode_id,
  );
  const snapshot = bouwEnergieSnapshot(
    bron,
    ext.tarieven.filter((t) => !vervangen.has(t.id)),
    {
      niveau: "totaal",
      woningIds: [rapport.woning_id],
      bedrijfIds: huur ? [huur.bedrijf_id] : [],
      vanaf,
      totEnMet: tot,
      modus: modus as "exact" | "schatting",
      archief: true,
    },
    dragers as ("elektriciteit" | "gas" | "water")[],
    new Date().toISOString(),
    user.id,
    process.env.VERCEL_GIT_COMMIT_SHA ?? ENERGIE_REKENREGELS,
  );
  const superseded = new Set(ext.maatregelen.map((m) => m.voorganger_id));
  snapshot.klant.maatregelen = ext.maatregelen
    .filter(
      (m) =>
        m.woning_id === rapport.woning_id &&
        !superseded.has(m.id) &&
        m.klant_goedgekeurd &&
        m.created_at.slice(0, 10) < tot &&
        dragers.includes(m.product),
    )
    .map((m) => ({
      titel: m.titel,
      status: m.status,
      uitvoerdatum: m.uitvoerdatum,
      toelichting: m.klant_toelichting,
    }));
  const { error: save } = await supabase
    .from("energie_snapshots")
    .insert({
      maandrapportage_id: rapport.id,
      woning_id: rapport.woning_id,
      klant: snapshot.klant,
      intern: snapshot.intern,
      bron_hash: createHash("sha256")
        .update(JSON.stringify(snapshot.intern))
        .digest("hex"),
      rekenregels: ENERGIE_REKENREGELS,
      codeversie: snapshot.intern.codeversie,
    });
  if (save) throw new Error(save.message);
  revalidatePath(`/woningen/${rapport.woning_id}/rapportages/${rapport.id}`);
  redirect(`/woningen/${rapport.woning_id}/rapportages/${rapport.id}`);
}
