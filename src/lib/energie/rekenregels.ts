/** Halfopen kalenderintervallen. Geen lokale DST-uren in dagberekeningen. */
export const ENERGIE_REKENREGELS = "energie-2.0.0";
export const ENERGIE_ANALYSE_STARTDATUM = "2026-09-01";
export function datumTijd(datum: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum))
    throw new Error("Ongeldige kalenderdatum.");
  const tijd = Date.parse(`${datum}T00:00:00Z`);
  if (
    !Number.isFinite(tijd) ||
    new Date(tijd).toISOString().slice(0, 10) !== datum
  )
    throw new Error("Ongeldige kalenderdatum.");
  return tijd;
}
export function dagen(van: string, tot: string) {
  return (datumTijd(tot) - datumTijd(van)) / 86400000;
}
export function volgendeDag(datum: string) {
  return new Date(datumTijd(datum) + 86400000).toISOString().slice(0, 10);
}
export function datumNaDagen(datum: string, aantal: number) {
  return new Date(datumTijd(datum) + aantal * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function controleerPeriode(van: string, tot: string) {
  if (dagen(van, tot) <= 0)
    throw new Error("Eindmeetdatum moet na beginmeetdatum liggen.");
}
export function controleerEnergieAnalysePeriode(van: string, tot: string) {
  controleerPeriode(van, tot);
  if (datumTijd(van) < datumTijd(ENERGIE_ANALYSE_STARTDATUM))
    throw new Error(
      `De analysedatum mag niet vóór ${ENERGIE_ANALYSE_STARTDATUM} liggen.`,
    );
}
export function verschil(
  begin: number | null | undefined,
  eind: number | null | undefined,
): number | null {
  return typeof begin === "number" &&
    typeof eind === "number" &&
    Number.isFinite(begin) &&
    Number.isFinite(eind) &&
    begin >= 0 &&
    eind >= begin
    ? eind - begin
    : null;
}
export function kwartiel(waarden: number[], p: number): number | null {
  if (!waarden.length) return null;
  const sorted = [...waarden].sort((a, b) => a - b),
    pos = (sorted.length - 1) * p;
  return (
    sorted[Math.floor(pos)] +
    (sorted[Math.ceil(pos)] - sorted[Math.floor(pos)]) * (pos - Math.floor(pos))
  );
}
export function gedekteDagen(
  intervallen: { vanDatum: string; totDatum: string }[],
): number {
  const sorted = [...intervallen].sort((a, b) =>
    a.vanDatum.localeCompare(b.vanDatum),
  );
  let eind = "",
    som = 0;
  for (const i of sorted) {
    const begin = i.vanDatum > eind ? i.vanDatum : eind;
    if (i.totDatum > begin) som += dagen(begin, i.totDatum);
    if (i.totDatum > eind) eind = i.totDatum;
  }
  return som;
}
