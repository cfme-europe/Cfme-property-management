import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getActieveControlebriefingVoorWoning,
} from "@/services/intelligence-server";
import type {
  ControleAfwijking,
  ControleResultaat,
  ControleurFlowGegevens,
  ControleurRoutepunt,
} from "@/types/controleurflow";

export async function getControleurFlow(
  sessieId: number,
): Promise<ControleurFlowGegevens | null> {
  if (!Number.isInteger(sessieId) || sessieId <= 0) {
    return null;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Geen geldige gebruikerssessie.");
  }

  const { data: sessie, error: sessieFout } = await supabase
    .from("controlesessies")
    .select(
      "id, woning_id, inspectie_id, controleur_id, status, gestart_at, locatie_status",
    )
    .eq("id", sessieId)
    .maybeSingle();

  if (sessieFout) {
    throw new Error(
      `Controlesessie ophalen mislukt: ${sessieFout.message}`,
    );
  }

  if (!sessie) {
    return null;
  }

  if (sessie.controleur_id && sessie.controleur_id !== user.id) {
    throw new Error("Deze controle is niet aan jou toegewezen.");
  }

  const [
    woningResultaat,
    routeResultaat,
    resultatenResultaat,
    afwijkingenResultaat,
  ] = await Promise.all([
    supabase
      .from("woningen")
      .select("id, dossiernummer, adres, postcode, plaats")
      .eq("id", sessie.woning_id)
      .single(),
    supabase
      .from("woning_controlepunten")
      .select(`
        id,
        woning_id,
        ruimte_id,
        object_id,
        naam_override,
        omschrijving_override,
        loopvolgorde,
        verplicht,
        foto_verplicht_bij_afwijking,
        toelichting_verplicht_bij_afwijking,
        ruimte:woning_ruimten(
          id,
          naam,
          ruimte_type,
          loopvolgorde,
          route_instructie,
          actief
        ),
        object:woning_objecten(
          id,
          naam,
          object_type,
          objectnummer,
          loopvolgorde,
          actief
        ),
        definitie:controlepunt_definities(
          naam,
          omschrijving,
          invoertype,
          categorie,
          foto_verplicht_bij_afwijking,
          toelichting_verplicht_bij_afwijking,
          standaard_prioriteit
        )
      `)
      .eq("woning_id", sessie.woning_id)
      .eq("actief", true)
      .order("ruimte_id", { ascending: true })
      .order("loopvolgorde", { ascending: true }),
    supabase
      .from("controle_resultaten")
      .select("*")
      .eq("controlesessie_id", sessie.id),
    supabase
      .from("controle_afwijkingen")
      .select("*")
      .eq("controlesessie_id", sessie.id),
  ]);

  const fout =
    woningResultaat.error ??
    routeResultaat.error ??
    resultatenResultaat.error ??
    afwijkingenResultaat.error;

  if (fout) {
    throw new Error(`Controleflow ophalen mislukt: ${fout.message}`);
  }

  if (!woningResultaat.data) {
    throw new Error("De woning van deze controlesessie is niet gevonden.");
  }

  const route: ControleurRoutepunt[] = (
    routeResultaat.data ?? []
  ).flatMap((rij) => {
    const ruimte = Array.isArray(rij.ruimte)
      ? rij.ruimte[0]
      : rij.ruimte;
    const object = Array.isArray(rij.object)
      ? rij.object[0]
      : rij.object;
    const definitie = Array.isArray(rij.definitie)
      ? rij.definitie[0]
      : rij.definitie;

    if (!ruimte?.actief || !definitie) {
      return [];
    }

    if (object && !object.actief) {
      return [];
    }

    return [{
      woning_controlepunt_id: rij.id,
      woning_id: rij.woning_id,
      ruimte_id: rij.ruimte_id,
      ruimte_naam: ruimte.naam,
      ruimte_type: ruimte.ruimte_type,
      ruimte_volgorde: ruimte.loopvolgorde,
      route_instructie: ruimte.route_instructie,
      object_id: rij.object_id,
      object_naam: object?.naam ?? null,
      object_type: object?.object_type ?? null,
      object_volgorde: object?.loopvolgorde ?? null,
      objectnummer: object?.objectnummer ?? null,
      controlepunt_naam:
        rij.naam_override || definitie.naam,
      controlepunt_omschrijving:
        rij.omschrijving_override || definitie.omschrijving,
      controlepunt_volgorde: rij.loopvolgorde,
      verplicht: rij.verplicht,
      invoertype: definitie.invoertype,
      categorie: definitie.categorie,
      foto_verplicht_bij_afwijking:
        rij.foto_verplicht_bij_afwijking ??
        definitie.foto_verplicht_bij_afwijking,
      toelichting_verplicht_bij_afwijking:
        rij.toelichting_verplicht_bij_afwijking ??
        definitie.toelichting_verplicht_bij_afwijking,
      standaard_prioriteit:
        definitie.standaard_prioriteit,
    }];
  }).sort((a, b) =>
    a.ruimte_volgorde - b.ruimte_volgorde ||
    (a.object_volgorde ?? -1) - (b.object_volgorde ?? -1) ||
    a.controlepunt_volgorde - b.controlepunt_volgorde
  );

  const {
    data: actieveVerhuurperiode,
    error: verhuurperiodeFout,
  } = await supabase
    .from("verhuurperiodes")
    .select("id")
    .eq("woning_id", sessie.woning_id)
    .eq("status", "actief")
    .maybeSingle();

  if (verhuurperiodeFout) {
    throw new Error(
      `Actieve verhuurperiode ophalen mislukt: ${verhuurperiodeFout.message}`,
    );
  }

  let bewonersAantal = 0;

  if (actieveVerhuurperiode) {
    const bewonersResultaat = await supabase
      .from("bewoners")
      .select("id", { count: "exact", head: true })
      .eq("verhuurperiode_id", actieveVerhuurperiode.id)
      .eq("status", "actief")
      .is("uitcheckdatum", null);

    if (bewonersResultaat.error) {
      throw new Error(
        `Bewonersaantal ophalen mislukt: ${bewonersResultaat.error.message}`,
      );
    }

    bewonersAantal = bewonersResultaat.count ?? 0;
  }

  const correctiesResultaat = await supabase
    .from("meterstand_correcties")
    .select("created_at, reden, meterstand_id")
    .eq("woning_id", sessie.woning_id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (correctiesResultaat.error) {
    throw new Error(`Meterstandcorrecties ophalen mislukt: ${correctiesResultaat.error.message}`);
  }

  const meterstandResultaat = await supabase
    .from("meterstanden")
    .select(
      "dagstroom_kwh,nachtstroom_kwh,gas_m3,water_m3",
    )
    .eq("woning_id", sessie.woning_id)
    .order("opnamedatum", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (meterstandResultaat.error) {
    throw new Error(
      `Laatste meterstand ophalen mislukt: ${meterstandResultaat.error.message}`,
    );
  }

  const controlebriefing =
    await getActieveControlebriefingVoorWoning(
      sessie.woning_id,
    );

  return {
    sessie,
    woning: woningResultaat.data,
    route,
    resultaten:
      (resultatenResultaat.data ?? []) as ControleResultaat[],
    afwijkingen:
      (afwijkingenResultaat.data ?? []) as ControleAfwijking[],
    bewoners_aantal: bewonersAantal,
    correctiewaarschuwingen: (correctiesResultaat.data ?? []).map(
      (correctie) => `Vorige meteropname is achteraf gecorrigeerd: ${correctie.reden}. Controleer de betreffende meter extra.`,
    ),
    controlebriefing,
    laatste_meterstand: meterstandResultaat.data ?? null,
  };
}
