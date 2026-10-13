export const klantversieOnderdelen = [
  ["meerwaarde", "CFME-resultaten"],
  ["opvolging", "Meldingen en opvolgsnelheid"],
  ["reparaties", "Reparaties en oplossingen"],
  ["energie", "Energieverbruik en vergelijking"],
  ["energie_intelligence", "Extra energiepagina (optioneel)"],
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
    klantversieOnderdelen.filter(([sleutel]) => sleutel !== "energie_intelligence").map(([sleutel]) => sleutel),
  );
}

export function klantversiePaginaAantal(onderdelen: ReadonlySet<KlantversieOnderdeel>): number {
  return 1 + Number(onderdelen.has("reparaties")) + Number(onderdelen.has("energie_intelligence"));
}
