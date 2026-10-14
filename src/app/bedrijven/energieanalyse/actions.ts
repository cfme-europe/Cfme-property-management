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
  vindGeldendTarief,
  type Tariefplan,
  type Tariefcomponent,
} from "@/lib/energie/tarieven";
import {
  controleerPeriode,
  datumTijd,
  ENERGIE_REKENREGELS,
} from "@/lib/energie/rekenregels";
import { bouwEnergieSnapshot } from "@/lib/energie/snapshot";
import type { Energiedrager } from "@/lib/energie/portfolio-analyse";
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
const decimaal = (waarde: string, label: string) => {
  const opgeschoond = waarde.replace(",", ".");
  if (!/^\d+(\.\d{1,9})?$/.test(opgeschoond))
    throw new Error(`${label}: gebruik een niet-negatief getal met maximaal 9 decimalen.`);
  return opgeschoond;
};
function planId(sleutel: string) {
  const bytes = createHash("sha256").update(sleutel).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export async function slaEnergiePrijzen(f: FormData) {
  let fout = "";
  try {
    const { supabase } = await admin();
    const uitbreiding = await getEnergieUitbreiding();
    if (!uitbreiding.beschikbaar)
      throw new Error("De tariefregistratie is nog niet beschikbaar.");
    const woningId = id(f, "woning_id")!;
    const vanaf = text(f, "vanaf");
    datumTijd(vanaf);
    const btw = decimaal(text(f, "btw_percentage"), "Btw-percentage");
    if (Number(btw) > 100) throw new Error("Btw-percentage mag maximaal 100 zijn.");
    const inclusief = text(f, "inclusief_btw") === "ja";
    const producten = ["elektriciteit", "gas", "water"] as const;
    const tariefPlannen = uitbreiding.tarieven;
    const nieuwePlannen: Tariefplan[] = [];
    const contract = [...(await getEnergieAnalyseBrondata()).verhuurperioden]
      .filter(
        (periode) =>
          periode.woning_id === woningId &&
          (!periode.startdatum || periode.startdatum <= vanaf) &&
          (!periode.werkelijke_einddatum || periode.werkelijke_einddatum > vanaf),
      )
      .sort((a, b) => (b.startdatum ?? "").localeCompare(a.startdatum ?? ""))[0];
    const bedrijfId = contract?.bedrijf_id ?? null;

    for (const product of producten) {
      const veld =
        product === "elektriciteit" ? "dagstroom" : `${product}_prijs`;
      const ingevoerd =
        product === "elektriciteit"
          ? [text(f, "dagstroom_prijs"), text(f, "nachtstroom_prijs")]
          : [text(f, veld)];
      if (ingevoerd.every((prijs) => !prijs)) continue;
      if (
        tariefPlannen.some(
          (tarief) =>
            tarief.product === product &&
            tarief.vanaf === vanaf &&
            tarief.woning_id === woningId &&
            tarief.bedrijf_id === null,
        )
      )
        throw new Error(
          `${product}: er bestaat al een prijswijziging op ${vanaf}. Kies een andere datum.`,
        );

      const huidig = vindGeldendTarief(
        tariefPlannen,
        product,
        woningId,
        bedrijfId,
        vanaf,
      );
      const componenten = huidig?.componenten ?? [];
      let nieuweComponenten: Tariefcomponent[];
      if (product === "elektriciteit") {
        const dag = componenten.find((c) => c.soort === "dag");
        const nacht = componenten.find((c) => c.soort === "nacht");
        const nieuweDag = ingevoerd[0]
          ? {
              soort: "dag" as const,
              prijs: decimaal(ingevoerd[0], "Dagstroomprijs"),
              btw_percentage: btw,
              inclusief_btw: inclusief,
            }
          : dag;
        const nieuweNacht = ingevoerd[1]
          ? {
              soort: "nacht" as const,
              prijs: decimaal(ingevoerd[1], "Nachtstroomprijs"),
              btw_percentage: btw,
              inclusief_btw: inclusief,
            }
          : nacht;
        if (!nieuweDag || !nieuweNacht)
          throw new Error(
            "Vul Dagstroom en Nachtstroom in als een van beide nog geen geregistreerd tarief heeft.",
          );
        nieuweComponenten = [
          ...componenten.filter(
            (c) =>
              !["variabel", "dag", "nacht"].includes(c.soort),
          ),
          nieuweDag,
          nieuweNacht,
        ];
      } else {
        nieuweComponenten = [
          ...componenten.filter((c) => c.soort !== "variabel"),
          {
            soort: "variabel",
            prijs: decimaal(ingevoerd[0], `${product}prijs`),
            btw_percentage: btw,
            inclusief_btw: inclusief,
          },
        ];
      }

      const scope = tariefPlannen.filter(
        (tarief) =>
          tarief.product === product &&
          tarief.woning_id === woningId &&
          tarief.bedrijf_id === null,
      );
      const tot =
        scope
          .map((tarief) => tarief.vanaf)
          .filter((datum) => datum > vanaf)
          .sort()[0] ?? null;
      const bestaandeOpvolgers = new Set(
        scope
          .map((tarief) => tarief.voorganger_id)
          .filter((id): id is string => !!id),
      );
      const voorganger =
        scope
          .filter((tarief) => !bestaandeOpvolgers.has(tarief.id))
          .filter((tarief) => tarief.vanaf < vanaf)
          .sort((a, b) => b.vanaf.localeCompare(a.vanaf))[0] ?? null;
      const input = {
        id: planId(`${woningId}:${product}:${vanaf}`),
        product,
        eenheid: product === "elektriciteit" ? "kWh" : "m³",
        valuta: huidig?.valuta ?? "EUR",
        vanaf,
        tot,
        woning_id: woningId,
        bedrijf_id: null,
        bron: "Handmatig ingevoerde prijs",
        componenten: nieuweComponenten,
        voorganger_id: voorganger?.id ?? null,
      };
      valideerTarief(input);
      nieuwePlannen.push(input);
    }
    if (
      producten.every((product) =>
        product === "elektriciteit"
          ? !text(f, "dagstroom_prijs") && !text(f, "nachtstroom_prijs")
          : !text(f, `${product}_prijs`),
      )
    )
      throw new Error("Vul minimaal één nieuwe prijs in.");
    const { error } = await supabase
      .from("energie_tariefplannen")
      .insert(nieuwePlannen);
    if (error) throw new Error(error.message);
  } catch (error) {
    fout = error instanceof Error ? error.message : "Prijzen opslaan mislukt.";
  }
  revalidatePath("/bedrijven/energieanalyse");
  revalidatePath("/bedrijven/energieanalyse/beheer");
  redirect(
    `/bedrijven/energieanalyse/beheer?${new URLSearchParams(
      fout ? { fout } : { klaar: "Nieuwe prijzen opgeslagen; eerdere en toekomstige tarieven blijven bewaard." },
    )}`,
  );
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
  const dragers = f.getAll("drager").map(String);
  if (
    !dragers.length ||
    dragers.some(
      (d) =>
        ![
          "elektriciteit",
          "dagstroom",
          "nachtstroom",
          "gas",
          "water",
        ].includes(d),
    )
  )
    throw new Error("Selecteer geldige energieproducten.");
  const huur = bron.verhuurperioden.find(
    (v) => v.id === rapport.verhuurperiode_id,
  );
  const snapshot = bouwEnergieSnapshot(
    bron,
    ext.tarieven,
    {
      niveau: "totaal",
      woningIds: [rapport.woning_id],
      bedrijfIds: huur ? [huur.bedrijf_id] : [],
      vanaf,
      totEnMet: tot,
      modus: "schatting",
      archief: true,
    },
    dragers as Energiedrager[],
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
