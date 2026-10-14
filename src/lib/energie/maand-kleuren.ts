export const ENERGIE_MAAND_KLEUREN = [
  "#14532d",
  "#15803d",
  "#4d7c0f",
  "#0f766e",
  "#047857",
  "#3f6212",
  "#166534",
  "#2f855a",
  "#0e7490",
  "#365314",
  "#059669",
  "#567d46",
] as const;

export function kleurEnergieMaand(maand: string) {
  return ENERGIE_MAAND_KLEUREN[Number(maand.slice(5)) - 1];
}
