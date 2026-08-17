import type { Gebruikersrol } from "@/types/gebruiker";

export const GEBRUIKERSBEHEER_ROLLEN = [
  "admin",
  "management",
] as const satisfies readonly Gebruikersrol[];

export type Gebruikersbeheerrol =
  (typeof GEBRUIKERSBEHEER_ROLLEN)[number];

export function rolMagGebruikersBeheren(
  rol: string | null | undefined
): rol is Gebruikersbeheerrol {
  return GEBRUIKERSBEHEER_ROLLEN.some(
    (toegestaneRol) =>
      toegestaneRol === rol
  );
}
