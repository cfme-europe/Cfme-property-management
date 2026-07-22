"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  annuleerControlesessie,
  createControlesessie,
  rondControlesessieAf,
  startControlesessie,
} from "@/services/controlesessies";
import type {
  Controlesessie,
  ControlesessieLocatieInvoer,
} from "@/types/controlesessie";

type Props = {
  woningId: number;
  inspectieId: number;
  controlesessie: Controlesessie | null;
};

function datumTijd(
  waarde: string | null
): string {
  if (!waarde) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "nl-NL",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(new Date(waarde));
}

async function bepaalLocatie(): Promise<
  ControlesessieLocatieInvoer
> {
  if (!navigator.geolocation) {
    return {
      locatie_status:
        "niet_beschikbaar",
      start_latitude: null,
      start_longitude: null,
      start_nauwkeurigheid_meter:
        null,
      start_afstand_tot_woning_meter:
        null,
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (positie) => {
        resolve({
          locatie_status: "beschikbaar",
          start_latitude:
            positie.coords.latitude,
          start_longitude:
            positie.coords.longitude,
          start_nauwkeurigheid_meter:
            positie.coords.accuracy,
          start_afstand_tot_woning_meter:
            null,
        });
      },
      (fout) => {
        resolve({
          locatie_status:
            fout.code ===
            fout.PERMISSION_DENIED
              ? "toestemming_geweigerd"
              : "fout",
          start_latitude: null,
          start_longitude: null,
          start_nauwkeurigheid_meter:
            null,
          start_afstand_tot_woning_meter:
            null,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

export default function ControlesessieBeheer({
  woningId,
  inspectieId,
  controlesessie,
}: Props) {
  const router = useRouter();
  const [bezig, setBezig] =
    useState(false);
  const [fout, setFout] =
    useState("");

  async function uitvoeren(
    actie: () => Promise<unknown>
  ) {
    setBezig(true);
    setFout("");

    try {
      await actie();
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Controlesessie wijzigen mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  async function aanmaken() {
    await uitvoeren(() =>
      createControlesessie({
        woning_id: woningId,
        inspectie_id: inspectieId,
        controleur_id: null,
        status: "gepland",
        gepland_voor: null,
        gemiddelde_controletijd_minuten:
          null,
        locatie_status:
          "niet_geprobeerd",
        start_latitude: null,
        start_longitude: null,
        start_nauwkeurigheid_meter:
          null,
        start_afstand_tot_woning_meter:
          null,
        opmerkingen: null,
      })
    );
  }

  async function starten() {
    if (!controlesessie) {
      return;
    }

    setBezig(true);
    setFout("");

    try {
      const locatie =
        await bepaalLocatie();

      await startControlesessie(
        controlesessie.id,
        locatie
      );

      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Controlesessie starten mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-slate-200 p-5">
      <h2 className="text-xl font-bold">
        Controlesessie
      </h2>

      <p className="mt-1 text-slate-600">
        Registreer de werkelijke start- en
        eindtijd van deze controle.
      </p>

      {fout && (
        <p className="mt-4 rounded-xl bg-red-50 p-4 text-red-800">
          {fout}
        </p>
      )}

      {!controlesessie ? (
        <button
          type="button"
          disabled={bezig}
          onClick={aanmaken}
          className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {bezig
            ? "Aanmaken..."
            : "Controlesessie aanmaken"}
        </button>
      ) : (
        <>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-slate-500">
                Status
              </dt>
              <dd className="mt-1 font-semibold">
                {controlesessie.status}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Gestart
              </dt>
              <dd className="mt-1 font-semibold">
                {datumTijd(
                  controlesessie.gestart_at
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Afgerond
              </dt>
              <dd className="mt-1 font-semibold">
                {datumTijd(
                  controlesessie.afgerond_at
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-3">
            {controlesessie.status ===
              "gepland" && (
              <button
                type="button"
                disabled={bezig}
                onClick={starten}
                className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-50"
              >
                Controle starten
              </button>
            )}

            {controlesessie.status ===
              "bezig" && (
              <button
                type="button"
                disabled={bezig}
                onClick={() =>
                  uitvoeren(() =>
                    rondControlesessieAf(
                      controlesessie.id
                    )
                  )
                }
                className="rounded-xl bg-blue-700 px-5 py-3 font-medium text-white disabled:opacity-50"
              >
                Controle afronden
              </button>
            )}

            {[
              "gepland",
              "bezig",
            ].includes(
              controlesessie.status
            ) && (
              <button
                type="button"
                disabled={bezig}
                onClick={() =>
                  uitvoeren(() =>
                    annuleerControlesessie(
                      controlesessie.id
                    )
                  )
                }
                className="rounded-xl border border-red-300 px-5 py-3 font-medium text-red-700 disabled:opacity-50"
              >
                Annuleren
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
