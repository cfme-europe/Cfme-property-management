export const ENERGIE_MAAND_KLEUREN = [
  "#14532d",
  "#166534",
  "#15803d",
  "#047857",
  "#0f766e",
  "#4d7c0f",
  "#3f6212",
  "#2f855a",
  "#059669",
  "#567d46",
  "#365314",
  "#65a30d",
] as const;

export function kleurEnergieMaand(maand: string) {
  return ENERGIE_MAAND_KLEUREN[Number(maand.slice(5)) - 1];
}
