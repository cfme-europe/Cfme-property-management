"use server";
import { energieClient } from "@/services/energieanalyse-server";
import {
  controleerAfspraak,
  type VoorschotAfspraak,
} from "@/lib/energie/voorschotten";
import { revalidatePath } from "next/cache";
export type BewaarResultaat = { fout?: string; klaar?: string };
function bedrag(v: FormDataEntryValue | null, negatief = false): number | null {
  const raw = String(v ?? "")
    .trim()
    .replace(",", ".");
  if (!raw) return null;
  if (!/^-?\d+(\.\d{1,6})?$/.test(raw))
    throw new Error(
      "Gebruik een bedrag zonder duizendtallen, bijvoorbeeld 0,32.",
    );
  const n = Number(raw);
  if (!Number.isFinite(n) || (!negatief && n < 0) || Math.abs(n) > 999999999)
    throw new Error("Ongeldig bedrag.");
  return n;
}
export async function bewaarEnergieInvoer(
  _: BewaarResultaat,
  f: FormData,
): Promise<BewaarResultaat> {
  try {
    const { supabase } = await energieClient(true);
    const { data: mag, error: rolfout } = await supabase.rpc("heeft_rol", {
      toegestane_rollen: ["admin", "management"],
    });
    if (rolfout || !mag)
      throw new Error("Alleen beheer en management mogen deze invoer bewaren.");
    const vorig = String(f.get("voorganger_id") ?? "") || null;
    const soort = f.get("soort");
    let input: Record<string, unknown>;
    let tabel: string;
    if (soort === "prijzen") {
      const woning = Number(f.get("woning_id")),
        jaar = Number(f.get("jaar"));
      if (
        !Number.isSafeInteger(woning) ||
        woning <= 0 ||
        !Number.isInteger(jaar) ||
        jaar < 1900 ||
        jaar > 2200
      )
        throw new Error("Selecteer een geldig pand en jaar.");
      const stroomtype = String(f.get("stroomtype"));
      if (!["enkel", "dag_nacht"].includes(stroomtype))
        throw new Error("Kies een stroomtarief.");
      input = { woning_id: woning, jaar, stroomtype, voorganger_id: vorig };
      for (const key of ["stroom", "dag", "nacht", "gas", "water", "vast_jaar"])
        input[key] = bedrag(f.get(key));
      for (const key of ["stroom_actief", "gas_actief", "water_actief"])
        input[key] = f.get(key) === "on";
      tabel = "energie_jaarprijzen";
    } else if (soort === "afspraak") {
      const huur = Number(f.get("verhuurperiode_id"));
      if (!Number.isSafeInteger(huur) || huur <= 0)
        throw new Error("Kies een verhuurperiode.");
      const datums = f.getAll("voorschot_vanaf"),
        bedragen = f.getAll("voorschot_bedrag");
      if (
        datums.length !== bedragen.length ||
        datums.some(
          (d, i) => !String(d).trim() && String(bedragen[i] ?? "").trim(),
        )
      )
        throw new Error("Vul bij ieder voorschot een ingangsdatum in.");
      const a: VoorschotAfspraak = {
        verhuurperiode_id: huur,
        voorganger_id: vorig,
        vanaf: String(f.get("vanaf") ?? ""),
        tot: String(f.get("tot") ?? "") || null,
        startsaldo: bedrag(f.get("startsaldo"), true),
        voorschotten: datums
          .map((d, i) => ({
            vanaf: String(d),
            bedrag: bedrag(bedragen[i] ?? null),
          }))
          .filter((v) => v.vanaf),
      };
      controleerAfspraak(a);
      input = { ...a };
      tabel = "energie_voorschotafspraken";
    } else throw new Error("Ongeldige invoer.");
    const { error } = await supabase.from(tabel).insert(input);
    if (error) throw new Error(error.message);
    revalidatePath("/bedrijven/energieanalyse");
    revalidatePath("/bedrijven/energieanalyse/beheer");
    return { klaar: "Opgeslagen. Eerdere versies blijven bewaard." };
  } catch (e) {
    return { fout: e instanceof Error ? e.message : "Opslaan mislukt." };
  }
}
