import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ControleAfwijkingBeheer,
} from "@/types/controleafwijking";

type AfwijkingRij = Omit<
  ControleAfwijkingBeheer,
  | "resultaat"
  | "herstelbewijs_aantal"
  | "melding_status"
  | "taak_status"
  | "taak_deadline"
  | "doorlooptijd_dagen"
  | "over_deadline"
  | "terugkeer_aantal"
> & {
  resultaat:
    | {
        ruimte_naam_snapshot: string;
        object_naam_snapshot: string | null;
        controlepunt_naam_snapshot: string;
      }
    | {
        ruimte_naam_snapshot: string;
        object_naam_snapshot: string | null;
        controlepunt_naam_snapshot: string;
      }[]
    | null;
  melding:
    | { status: string }
    | { status: string }[]
    | null;
  taak:
    | { status: string; deadline: string | null }
    | { status: string; deadline: string | null }[]
    | null;
  herstelbewijs:
    | { id: number }[]
    | null;
};

function enkelvoudig<T>(
  waarde: T | T[] | null,
): T | null {
  return Array.isArray(waarde)
    ? waarde[0] ?? null
    : waarde;
}

function datumDagen(
  begin: string,
  einde: string,
): number {
  const verschil =
    new Date(einde).getTime() -
    new Date(begin).getTime();

  return Math.max(
    0,
    Math.floor(verschil / 86_400_000),
  );
}

function historieSleutel(
  rij: AfwijkingRij,
): string {
  const resultaat = enkelvoudig(rij.resultaat);

  return [
    rij.woning_id,
    resultaat?.ruimte_naam_snapshot ?? "",
    resultaat?.object_naam_snapshot ?? "",
    resultaat?.controlepunt_naam_snapshot ?? "",
    rij.gebrek_type,
  ].join("|");
}

export async function getControleAfwijkingenVoorWoning(
  woningId: number,
): Promise<ControleAfwijkingBeheer[]> {
  if (!Number.isInteger(woningId) || woningId <= 0) {
    throw new Error("Ongeldige woning.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("controle_afwijkingen")
    .select(`
      *,
      resultaat:controle_resultaten(
        ruimte_naam_snapshot,
        object_naam_snapshot,
        controlepunt_naam_snapshot
      ),
      melding:meldingen!controle_afwijkingen_melding_id_fkey(
        status
      ),
      taak:taken!controle_afwijkingen_taak_id_fkey(
        status,
        deadline
      ),
      herstelbewijs:inspectie_fotos!inspectie_fotos_controle_afwijking_id_fkey(
        id
      )
    `)
    .eq("woning_id", woningId)
    .order("status", { ascending: true })
    .order("urgentie", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Controleafwijkingen ophalen mislukt: ${error.message}`,
    );
  }

  const rijen = (data ?? []) as unknown as AfwijkingRij[];
  const frequenties = new Map<string, number>();

  for (const rij of rijen) {
    const sleutel = historieSleutel(rij);
    frequenties.set(
      sleutel,
      (frequenties.get(sleutel) ?? 0) + 1,
    );
  }

  const vandaag = new Date()
    .toISOString()
    .slice(0, 10);

  return rijen.map((rij) => {
    const resultaat = enkelvoudig(rij.resultaat);
    const melding = enkelvoudig(rij.melding);
    const taak = enkelvoudig(rij.taak);
    const eindtijd =
      rij.opgelost_at ??
      new Date().toISOString();

    return {
      ...rij,
      resultaat,
      herstelbewijs_aantal:
        rij.herstelbewijs?.length ?? 0,
      melding_status: melding?.status ?? null,
      taak_status: taak?.status ?? null,
      taak_deadline: taak?.deadline ?? null,
      doorlooptijd_dagen: datumDagen(
        rij.created_at,
        eindtijd,
      ),
      over_deadline:
        rij.status !== "opgelost" &&
        rij.deadline !== null &&
        rij.deadline < vandaag,
      terugkeer_aantal:
        frequenties.get(historieSleutel(rij)) ?? 1,
    } as ControleAfwijkingBeheer;
  });
}
