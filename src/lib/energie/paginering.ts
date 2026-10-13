/** Advance by returned rows, not requested page size: also safe with a lower server cap. */
export async function leesAlleRijen<T extends { id: number | string }>(
  haal: (
    van: number,
    tot: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pagina = 500,
): Promise<T[]> {
  const resultaat: T[] = [],
    ids = new Set<number | string>();
  for (;;) {
    const { data, error } = await haal(
      resultaat.length,
      resultaat.length + pagina - 1,
    );
    if (error) throw new Error(error.message);
    if (!data?.length) return resultaat;
    for (const row of data) {
      if (ids.has(row.id))
        throw new Error(
          "Brongegevens veranderden tijdens ophalen; probeer opnieuw.",
        );
      ids.add(row.id);
      resultaat.push(row);
    }
  }
}
