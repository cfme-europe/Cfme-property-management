"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  activeerRapporttemplateversie,
  slaConceptTemplateblokkenOp,
} from "@/services/rapportagebibliotheek-client";
import type {
  Rapportblok,
  Rapporttemplate,
  RapporttemplateblokInvoer,
  RapporttemplateversieMetBlokken,
} from "@/types/rapportagebibliotheek";

type Props = {
  template: Rapporttemplate;
  versie: RapporttemplateversieMetBlokken;
  rapportblokken: Rapportblok[];
};

export default function TemplateversieBeheer({
  template,
  versie,
  rapportblokken,
}: Props) {
  const router = useRouter();
  const bestaand = useMemo(
    () =>
      new Map(
        versie.blokken.map((blok) => [
          blok.rapportblok_id,
          blok,
        ])
      ),
    [versie.blokken]
  );

  const [geselecteerd, setGeselecteerd] =
    useState<Set<number>>(
      new Set(
        versie.blokken
          .filter((blok) => blok.zichtbaar)
          .map((blok) => blok.rapportblok_id)
      )
    );
  const [verplicht, setVerplicht] =
    useState<Set<number>>(
      new Set(
        versie.blokken
          .filter((blok) => blok.verplicht)
          .map((blok) => blok.rapportblok_id)
      )
    );
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const wijzigbaar = versie.status === "concept";

  function wissel(
    setWaarde: Set<number>,
    id: number,
    aan: boolean
  ): Set<number> {
    const nieuw = new Set(setWaarde);

    if (aan) {
      nieuw.add(id);
    } else {
      nieuw.delete(id);
    }

    return nieuw;
  }

  async function opslaan() {
    setBezig(true);
    setFout("");

    try {
      const blokken: RapporttemplateblokInvoer[] =
        rapportblokken
          .filter((blok) =>
            geselecteerd.has(blok.id)
          )
          .map((blok, index) => ({
            rapportblok_id: blok.id,
            volgorde: index + 1,
            verplicht: verplicht.has(blok.id),
            zichtbaar: true,
            titel_override:
              bestaand.get(blok.id)
                ?.titel_override ?? null,
            configuratie:
              bestaand.get(blok.id)
                ?.configuratie ?? {},
          }));

      await slaConceptTemplateblokkenOp(
        versie.id,
        blokken
      );

      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Templateblokken opslaan mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  async function activeer() {
    if (
      !window.confirm(
        "Deze versie activeren? De vorige actieve versie wordt vervallen."
      )
    ) {
      return;
    }

    setBezig(true);
    setFout("");

    try {
      await activeerRapporttemplateversie(
        versie.id
      );
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Activeren mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow">
      {fout && (
        <p className="mb-5 rounded-xl bg-red-100 p-4 text-red-800">
          {fout}
        </p>
      )}

      <p className="text-slate-600">
        Doelgroep: {template.doelgroep}. De
        blokvolgorde volgt de onderstaande lijst.
      </p>

      <div className="mt-6 space-y-3">
        {rapportblokken.map((blok, index) => {
          const gekozen = geselecteerd.has(
            blok.id
          );

          return (
            <article
              key={blok.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
            >
              <div>
                <strong>
                  {index + 1}. {blok.naam}
                </strong>
                <p className="text-sm text-slate-500">
                  {blok.code} · {blok.doelgroep}
                </p>
              </div>

              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    disabled={!wijzigbaar}
                    checked={gekozen}
                    onChange={(event) => {
                      setGeselecteerd(
                        wissel(
                          geselecteerd,
                          blok.id,
                          event.target.checked
                        )
                      );

                      if (!event.target.checked) {
                        setVerplicht(
                          wissel(
                            verplicht,
                            blok.id,
                            false
                          )
                        );
                      }
                    }}
                  />
                  Zichtbaar
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    disabled={
                      !wijzigbaar || !gekozen
                    }
                    checked={verplicht.has(blok.id)}
                    onChange={(event) =>
                      setVerplicht(
                        wissel(
                          verplicht,
                          blok.id,
                          event.target.checked
                        )
                      )
                    }
                  />
                  Verplicht
                </label>
              </div>
            </article>
          );
        })}
      </div>

      {wijzigbaar && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={bezig}
            onClick={opslaan}
            className="rounded-xl border border-emerald-700 px-5 py-3 font-medium text-emerald-800 disabled:opacity-50"
          >
            Blokken opslaan
          </button>

          <button
            type="button"
            disabled={bezig}
            onClick={activeer}
            className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-50"
          >
            Versie activeren
          </button>
        </div>
      )}
    </section>
  );
}
