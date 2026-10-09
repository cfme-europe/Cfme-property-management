import type { ControleAfwijkingBeheer } from "@/types/controleafwijking";
import type { Melding } from "@/types/melding";
import type { OpvolgItem, OpvolgStatus } from "@/types/opvolging";
import type { Taak } from "@/types/taak";

function afwijkingTitel(afwijking: ControleAfwijkingBeheer): string {
  const resultaat = afwijking.resultaat;
  if (!resultaat) return `Controleafwijking ${afwijking.id}`;

  return [
    resultaat.ruimte_naam_snapshot,
    resultaat.object_naam_snapshot,
    resultaat.controlepunt_naam_snapshot,
  ].filter(Boolean).join(" · ");
}

function afwijkingStatus(status: ControleAfwijkingBeheer["status"]): OpvolgStatus {
  if (status === "opgelost" || status === "geaccepteerd") return "afgehandeld";
  if (status === "niet_relevant") return "niet_relevant";
  if (status === "in_opvolging") return "in_behandeling";
  return "open";
}

function taakStatus(status: Taak["status"]): OpvolgStatus {
  if (status === "afgerond") return "afgehandeld";
  if (status === "geannuleerd") return "niet_relevant";
  return status;
}

export function groepeerOpvolging(
  afwijkingen: ControleAfwijkingBeheer[],
  meldingen: Melding[],
  taken: Taak[],
): OpvolgItem[] {
  const gebruikteMeldingen = new Set<number>();
  const gebruikteTaken = new Set<number>();
  const items: OpvolgItem[] = [];

  for (const afwijking of afwijkingen) {
    if (afwijking.melding_id) gebruikteMeldingen.add(afwijking.melding_id);
    if (afwijking.taak_id) gebruikteTaken.add(afwijking.taak_id);

    const gekoppeldeTaken = taken.filter(
      (taak) => taak.melding_id === afwijking.melding_id || taak.id === afwijking.taak_id,
    );
    gekoppeldeTaken.forEach((taak) => gebruikteTaken.add(taak.id));

    items.push({
      sleutel: `afwijking-${afwijking.id}`,
      bron_type: "afwijking",
      bron_id: afwijking.id,
      woning_id: afwijking.woning_id,
      titel: afwijkingTitel(afwijking),
      omschrijving: afwijking.toelichting,
      categorie: afwijking.gebrek_type.replaceAll("_", " "),
      prioriteit: afwijking.urgentie,
      status: afwijkingStatus(afwijking.status),
      aangemaakt_op: afwijking.created_at,
      verantwoordelijke: afwijking.verantwoordelijke,
      deadline: afwijking.deadline ?? afwijking.taak_deadline,
      oplossing: afwijking.oplossing,
      inspectie_id: afwijking.inspectie_id,
      afwijking_id: afwijking.id,
      melding_id: afwijking.melding_id,
      taak_ids: gekoppeldeTaken.map((taak) => taak.id),
      bewijs_aantal: afwijking.herstelbewijs_aantal,
    });
  }

  for (const melding of meldingen) {
    if (gebruikteMeldingen.has(melding.id)) continue;

    const gekoppeldeTaken = taken.filter((taak) => taak.melding_id === melding.id);
    gekoppeldeTaken.forEach((taak) => gebruikteTaken.add(taak.id));
    const actieveTaak = gekoppeldeTaken.find((taak) =>
      taak.status === "in_behandeling" || taak.status === "open",
    ) ?? gekoppeldeTaken[0];

    const status: OpvolgStatus = melding.status === "opgelost"
      ? (actieveTaak?.status === "geannuleerd" ? "niet_relevant" : "afgehandeld")
      : melding.status === "in_behandeling" || actieveTaak?.status === "in_behandeling"
        ? "in_behandeling"
        : "open";

    items.push({
      sleutel: `melding-${melding.id}`,
      bron_type: "melding",
      bron_id: melding.id,
      woning_id: melding.woning_id,
      titel: melding.titel,
      omschrijving: melding.omschrijving,
      categorie: melding.categorie,
      prioriteit: melding.prioriteit,
      status,
      aangemaakt_op: melding.created_at,
      verantwoordelijke: actieveTaak?.toegewezen_aan ?? melding.verantwoordelijke,
      deadline: actieveTaak?.deadline ?? null,
      oplossing: melding.oplossing,
      inspectie_id: melding.inspectie_id,
      afwijking_id: null,
      melding_id: melding.id,
      taak_ids: gekoppeldeTaken.map((taak) => taak.id),
      bewijs_aantal: 0,
    });
  }

  for (const taak of taken) {
    if (gebruikteTaken.has(taak.id)) continue;

    items.push({
      sleutel: `taak-${taak.id}`,
      bron_type: "taak",
      bron_id: taak.id,
      woning_id: taak.woning_id,
      titel: taak.titel,
      omschrijving: taak.omschrijving ?? "Losse taak",
      categorie: taak.categorie,
      prioriteit: taak.prioriteit,
      status: taakStatus(taak.status),
      aangemaakt_op: taak.created_at,
      verantwoordelijke: taak.toegewezen_aan,
      deadline: taak.deadline,
      oplossing: taak.status === "afgerond" ? taak.opmerkingen : null,
      inspectie_id: taak.inspectie_id,
      afwijking_id: null,
      melding_id: taak.melding_id,
      taak_ids: [taak.id],
      bewijs_aantal: 0,
    });
  }

  const rang = { spoed: 4, hoog: 3, normaal: 2, laag: 1 };
  return items.sort((a, b) => {
    const aOpen = a.status === "open" || a.status === "in_behandeling";
    const bOpen = b.status === "open" || b.status === "in_behandeling";
    if (aOpen !== bOpen) return aOpen ? -1 : 1;
    return rang[b.prioriteit] - rang[a.prioriteit]
      || b.aangemaakt_op.localeCompare(a.aangemaakt_op);
  });
}
