"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createControlesessie, startControlesessie } from "@/services/controlesessies";
import { createInspectie } from "@/services/inspecties";
import type { ControlesessieLocatieInvoer } from "@/types/controlesessie";

type Props = {
  woningId: number;
  verhuurperiodeId: number | null;
  controleurId: string;
  controleurNaam: string;
  openInspectieId: number | null;
};

async function bepaalLocatie(): Promise<ControlesessieLocatieInvoer> {
  if (!navigator.geolocation) {
    return { locatie_status: "niet_beschikbaar", start_latitude: null, start_longitude: null, start_nauwkeurigheid_meter: null, start_afstand_tot_woning_meter: null };
  }

  return new Promise((resolve) => navigator.geolocation.getCurrentPosition(
    (positie) => resolve({ locatie_status: "beschikbaar", start_latitude: positie.coords.latitude, start_longitude: positie.coords.longitude, start_nauwkeurigheid_meter: positie.coords.accuracy, start_afstand_tot_woning_meter: null }),
    (fout) => resolve({ locatie_status: fout.code === fout.PERMISSION_DENIED ? "toestemming_geweigerd" : "fout", start_latitude: null, start_longitude: null, start_nauwkeurigheid_meter: null, start_afstand_tot_woning_meter: null }),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  ));
}

export default function ControleStartButton({ woningId, verhuurperiodeId, controleurId, controleurNaam, openInspectieId }: Props) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function starten() {
    setBezig(true);
    setFout("");

    try {
      const inspectieId = openInspectieId ?? (await createInspectie({
        woning_id: woningId,
        verhuurperiode_id: verhuurperiodeId,
        type: "periodiek",
        inspectiedatum: new Date().toISOString().slice(0, 10),
        status: "open",
        algemene_toestand: "goed",
        orde_netheid_score: 3,
        schade_aanwezig: false,
        schade_omschrijving: null,
        uitgevoerd_door: controleurNaam,
        opmerkingen: null,
      })).id;

      const sessie = await createControlesessie({
        woning_id: woningId,
        inspectie_id: inspectieId,
        controleur_id: controleurId,
        status: "gepland",
        gepland_voor: new Date().toISOString(),
        gemiddelde_controletijd_minuten: null,
        locatie_status: "niet_geprobeerd",
        start_latitude: null,
        start_longitude: null,
        start_nauwkeurigheid_meter: null,
        start_afstand_tot_woning_meter: null,
        opmerkingen: null,
      });

      await startControlesessie(sessie.id, await bepaalLocatie());
      router.push(`/woningen/${woningId}/inspecties/${inspectieId}`);
      router.refresh();
    } catch (error) {
      setFout(error instanceof Error ? error.message : "Controle starten mislukt.");
      setBezig(false);
    }
  }

  return <div>{fout && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{fout}</p>}<button type="button" onClick={starten} disabled={bezig} className="w-full rounded-xl bg-emerald-700 px-5 py-4 text-base font-bold text-white disabled:opacity-60">{bezig ? "Controle wordt gestart..." : "Controle starten"}</button></div>;
}
