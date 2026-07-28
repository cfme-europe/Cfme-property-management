import type { RuimteType } from "@/types/woningconfiguratie";

type OpslagbevestigingRuimte = {
  actief: boolean;
  ruimte_type: RuimteType;
};

type OpslagbevestigingControlepunt = {
  actief: boolean;
};

export type WoningrouteOpslagbevestigingBron = {
  ruimten: readonly OpslagbevestigingRuimte[];
  controlepunten: readonly OpslagbevestigingControlepunt[];
};

export function isWoningrouteOpslagbevestigingGevraagd(
  waarde: string | string[] | undefined,
): boolean {
  return waarde === "1";
}

function aantalMetNaam(
  aantal: number,
  enkelvoud: string,
  meervoud: string,
): string {
  return `${aantal} ${aantal === 1 ? enkelvoud : meervoud}`;
}

export function maakWoningrouteOpslagbevestiging(
  configuratie: WoningrouteOpslagbevestigingBron,
): string {
  const actieveRuimten = configuratie.ruimten.filter(
    (ruimte) => ruimte.actief,
  );
  const slaapkamers = actieveRuimten.filter(
    (ruimte) => ruimte.ruimte_type === "slaapkamer",
  ).length;
  const controlepunten = configuratie.controlepunten.filter(
    (controlepunt) => controlepunt.actief,
  ).length;

  return (
    "Wijzigingen opgeslagen en vanuit de database opnieuw geladen: " +
    `${aantalMetNaam(actieveRuimten.length, "ruimte", "ruimten")}, ` +
    `${aantalMetNaam(slaapkamers, "slaapkamer", "slaapkamers")} en ` +
    `${aantalMetNaam(controlepunten, "controlepunt", "controlepunten")}.`
  );
}
