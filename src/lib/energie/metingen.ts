import { verschil } from "./rekenregels";
export type ElektriciteitsStand = {
  dagstroom_kwh: number | null;
  nachtstroom_kwh: number | null;
  elektriciteit_kwh: number | null;
  elektriciteit_dag_kwh?: number | null;
  elektriciteit_nacht_kwh?: number | null;
};
export type RegisterType = "dag_nacht" | "enkel" | "totaal";
export function elektriciteitsMeting(
  a: ElektriciteitsStand,
  b: ElektriciteitsStand,
  configuratie?: RegisterType,
) {
  const meldingen: string[] = [];
  for (const m of [a, b]) {
    if (
      (m.elektriciteit_dag_kwh != null &&
        m.dagstroom_kwh !== m.elektriciteit_dag_kwh) ||
      (m.elektriciteit_nacht_kwh != null &&
        m.nachtstroom_kwh !== m.elektriciteit_nacht_kwh)
    )
      meldingen.push("Tegenstrijdige elektriciteitskolommen");
    if (
      m.dagstroom_kwh !== null &&
      m.nachtstroom_kwh !== null &&
      m.elektriciteit_kwh !== null &&
      Math.abs(m.dagstroom_kwh + m.nachtstroom_kwh - m.elektriciteit_kwh) >
        0.000001
    )
      meldingen.push("Totaalmeter wijkt af van dag + nacht");
  }
  const dag = verschil(a.dagstroom_kwh, b.dagstroom_kwh),
    nacht = verschil(a.nachtstroom_kwh, b.nachtstroom_kwh),
    totaal = verschil(a.elektriciteit_kwh, b.elektriciteit_kwh);
  let waarde: number | null = null;
  if (configuratie === "totaal") waarde = totaal;
  else if (configuratie === "enkel") waarde = dag;
  else if (dag !== null && nacht !== null) waarde = dag + nacht;
  else if (
    configuratie === undefined &&
    a.dagstroom_kwh === null &&
    b.dagstroom_kwh === null &&
    a.nachtstroom_kwh === null &&
    b.nachtstroom_kwh === null
  ) {
    waarde = totaal;
    meldingen.push("Totaalmeterconfiguratie nog niet bevestigd");
  } else {
    meldingen.push("Registerconfiguratie of registerstanden onvolledig");
  }
  return {
    waarde: meldingen.some(
      (m) =>
        m.startsWith("Tegenstrijdige") || m.startsWith("Totaalmeter wijkt"),
    )
      ? null
      : waarde,
    dag,
    nacht,
    meldingen,
  };
}
