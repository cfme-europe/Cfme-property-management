export const klantversieOnderdelen = [
  ["meerwaarde", "CFME-resultaten"],
  ["opvolging", "Meldingen en opvolgsnelheid"],
  ["reparaties", "Reparaties en oplossingen"],
  ["energie", "Energieverbruik en vergelijking"],
  ["inspecties", "Inspecties"],
  ["aandachtspunten", "Openstaande aandachtspunten"],
] as const;

export type KlantversieOnderdeel =
  (typeof klantversieOnderdelen)[number][0];

const geldigeOnderdelen = new Set<string>(
  klantversieOnderdelen.map(([sleutel]) => sleutel),
);

export function leesKlantversieOnderdelen(
  waarde: string | null | undefined,
): Set<KlantversieOnderdeel> {
  return new Set(
    (waarde ?? "")
      .split(",")
      .filter(
        (onderdeel): onderdeel is KlantversieOnderdeel =>
          geldigeOnderdelen.has(onderdeel),
      ),
  );
}

export function alleKlantversieOnderdelen(): Set<KlantversieOnderdeel> {
  return new Set(
    klantversieOnderdelen.map(([sleutel]) => sleutel),
  );
}
