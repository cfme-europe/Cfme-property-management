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
  let bronVelden: string[] = [];
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
  if (configuratie === "totaal") {
    waarde = totaal;
    bronVelden = ["elektriciteit_kwh"];
    if (waarde === null)
      meldingen.push(
        a.elektriciteit_kwh === null || b.elektriciteit_kwh === null
          ? "Totaalmeter: verplichte totaalmeterstand ontbreekt"
          : "Totaalmeter: stand loopt terug of is ongeldig",
      );
  } else if (configuratie === "enkel") {
    waarde = dag;
    bronVelden = ["dagstroom_kwh"];
    if (waarde === null)
      meldingen.push(
        a.dagstroom_kwh === null || b.dagstroom_kwh === null
          ? "Enkelvoudige meter: verplichte dagstroomstand ontbreekt"
          : "Enkelvoudige meter: dagstroomstand loopt terug of is ongeldig",
      );
  } else if (dag !== null && nacht !== null) {
    waarde = dag + nacht;
    bronVelden = ["dagstroom_kwh", "nachtstroom_kwh"];
  } else if (configuratie === "dag_nacht") {
    if (dag === null)
      meldingen.push(
        a.dagstroom_kwh === null || b.dagstroom_kwh === null
          ? "Dubbele meter: verplichte dagstroomstand ontbreekt"
          : "Dubbele meter: dagstroomstand loopt terug of is ongeldig",
      );
    if (nacht === null)
      meldingen.push(
        a.nachtstroom_kwh === null || b.nachtstroom_kwh === null
          ? "Dubbele meter: verplichte nachtstroomstand ontbreekt"
          : "Dubbele meter: nachtstroomstand loopt terug of is ongeldig",
      );
  } else if (
    configuratie === undefined &&
    a.dagstroom_kwh === null &&
    b.dagstroom_kwh === null &&
    a.nachtstroom_kwh === null &&
    b.nachtstroom_kwh === null
  ) {
    waarde = totaal;
    bronVelden = ["elektriciteit_kwh"];
    meldingen.push("Totaalmeterconfiguratie nog niet bevestigd");
  } else if (
    configuratie === undefined &&
    totaal !== null &&
    a.elektriciteit_kwh === a.dagstroom_kwh &&
    b.elektriciteit_kwh === b.dagstroom_kwh &&
    a.nachtstroom_kwh === null &&
    b.nachtstroom_kwh === null
  ) {
    waarde = totaal;
    bronVelden = ["elektriciteit_kwh"];
    meldingen.push(
      "Historische totaalstanden gebruikt; dag-/nachtverdeling is niet bevestigd.",
    );
  } else {
    meldingen.push(
      "Elektriciteitsmeterconfiguratie ontbreekt; registreer of de meter enkelvoudig, dubbel of totaalmeter is.",
    );
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
    bronVelden:
      meldingen.some(
        (melding) =>
          melding.startsWith("Tegenstrijdige") ||
          melding.startsWith("Totaalmeter wijkt"),
      )
        ? []
        : bronVelden,
    meldingen,
  };
}
