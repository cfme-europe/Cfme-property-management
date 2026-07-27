"use client";

import {
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  markeerAfwijkingNietRelevant,
  rondControleflowAf,
  slaControleAfwijkingOp,
  slaControleResultaatOp,
  uploadControleFoto,
} from "@/services/controleurflow";
import {
  slaRouteMeterstandOp,
  type RouteMeterType,
} from "@/services/meterstanden";
import {
  AFWIJKING_URGENTIES,
  CONTROLE_RESULTATEN,
  GEBREK_TYPEN,
  type AfwijkingUrgentie,
  type ControleResultaatWaarde,
  type ControleurFlowGegevens,
  type ControleurRoutepunt,
  type GebrekType,
} from "@/types/controleurflow";

type Props = {
  gegevens: ControleurFlowGegevens;
};

type InvoerPerPunt = {
  resultaat: ControleResultaatWaarde | "";
  numeriekeWaarde: string;
  gebrekType: GebrekType;
  toelichting: string;
  urgentie: AfwijkingUrgentie;
  foto: File | null;
};

const afwijkendeResultaten =
  new Set<ControleResultaatWaarde>([
    "onvoldoende",
    "niet_aanwezig",
    "niet_bereikbaar",
  ]);

function label(waarde: string): string {
  return waarde
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

const METER_TYPE_PER_OBJECT: Record<
  string,
  RouteMeterType
> = {
  elektriciteitsmeter_dag:
    "dagstroom_kwh",
  elektriciteitsmeter_nacht:
    "nachtstroom_kwh",
  gasmeter: "gas_m3",
  watermeter: "water_m3",
};

function isMeterpunt(
  punt: ControleurRoutepunt,
): boolean {
  return Boolean(
    punt.object_type &&
      METER_TYPE_PER_OBJECT[
        punt.object_type
      ],
  );
}

function isInternetpunt(
  punt: ControleurRoutepunt,
): boolean {
  return (
    punt.object_type ===
    "internetvoorziening"
  );
}

function meterEenheid(
  metertype: RouteMeterType,
): string {
  return metertype === "gas_m3" ||
    metertype === "water_m3"
    ? "m³"
    : "kWh";
}

function vorigeMeterstand(
  punt: ControleurRoutepunt,
  gegevens: ControleurFlowGegevens,
): number | null {
  if (!punt.object_type) {
    return null;
  }

  const metertype =
    METER_TYPE_PER_OBJECT[
      punt.object_type
    ];

  if (!metertype) {
    return null;
  }

  return (
    gegevens.laatste_meterstand?.[
      metertype
    ] ?? null
  );
}

function maakBeginInvoer(
  punt: ControleurRoutepunt,
  gegevens: ControleurFlowGegevens,
): InvoerPerPunt {
  const resultaat = gegevens.resultaten.find(
    (item) =>
      item.woning_controlepunt_id ===
      punt.woning_controlepunt_id,
  );

  const afwijking = resultaat
    ? gegevens.afwijkingen.find(
        (item) =>
          item.controle_resultaat_id === resultaat.id &&
          item.status !== "niet_relevant",
      )
    : null;

  return {
    resultaat: resultaat?.resultaat ?? "",
    numeriekeWaarde:
      resultaat?.numerieke_waarde != null
        ? String(resultaat.numerieke_waarde)
        : "",
    gebrekType: afwijking?.gebrek_type ?? "overig",
    toelichting: afwijking?.toelichting ?? "",
    urgentie:
      afwijking?.urgentie ?? punt.standaard_prioriteit,
    foto: null,
  };
}

export default function ControleurFlow({
  gegevens,
}: Props) {
  const router = useRouter();

  const ruimten = useMemo(() => {
    const resultaat = new Map<
      number,
      {
        id: number;
        naam: string;
        type: string;
        volgorde: number;
        instructie: string | null;
        punten: ControleurRoutepunt[];
      }
    >();

    for (const punt of gegevens.route) {
      const bestaand = resultaat.get(punt.ruimte_id);

      if (bestaand) {
        bestaand.punten.push(punt);
      } else {
        resultaat.set(punt.ruimte_id, {
          id: punt.ruimte_id,
          naam: punt.ruimte_naam,
          type: punt.ruimte_type,
          volgorde: punt.ruimte_volgorde,
          instructie: punt.route_instructie,
          punten: [punt],
        });
      }
    }

    return [...resultaat.values()].sort(
      (a, b) => a.volgorde - b.volgorde,
    );
  }, [gegevens.route]);

  const [ruimteIndex, setRuimteIndex] = useState(0);
  const [invoer, setInvoer] = useState<
    Record<number, InvoerPerPunt>
  >(() =>
    Object.fromEntries(
      gegevens.route.map((punt) => [
        punt.woning_controlepunt_id,
        maakBeginInvoer(punt, gegevens),
      ]),
    ),
  );
  const [opgeslagen, setOpgeslagen] = useState<Set<number>>(
    () =>
      new Set(
        gegevens.resultaten.map(
          (item) => item.woning_controlepunt_id,
        ),
      ),
  );
  const [bezigPunt, setBezigPunt] =
    useState<number | null>(null);
  const [afrondenBezig, setAfrondenBezig] =
    useState(false);
  const [fout, setFout] = useState("");

  const huidigeRuimte = ruimten[ruimteIndex] ?? null;

  const verplichtePunten = gegevens.route.filter(
    (punt) => punt.verplicht,
  );
  const afgerondeVerplichtePunten =
    verplichtePunten.filter((punt) =>
      opgeslagen.has(punt.woning_controlepunt_id),
    ).length;

  const voortgang =
    verplichtePunten.length === 0
      ? 100
      : Math.round(
          (afgerondeVerplichtePunten /
            verplichtePunten.length) *
            100,
        );

  function wijzigPunt(
    puntId: number,
    wijziging: Partial<InvoerPerPunt>,
  ) {
    setInvoer((huidig) => ({
      ...huidig,
      [puntId]: {
        ...huidig[puntId],
        ...wijziging,
      },
    }));
    setFout("");
  }

  function kiesFoto(
    puntId: number,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    wijzigPunt(puntId, {
      foto: event.target.files?.[0] ?? null,
    });
  }

  async function slaPuntOp(
    punt: ControleurRoutepunt,
    directResultaat?: ControleResultaatWaarde,
  ) {
    const basisInvoer =
      invoer[punt.woning_controlepunt_id];

    const puntInvoer = {
      ...basisInvoer,
      resultaat:
        directResultaat ??
        basisInvoer?.resultaat ??
        "",
    };

    const meterpunt = isMeterpunt(punt);

    if (
      meterpunt &&
      !puntInvoer?.numeriekeWaarde.trim()
    ) {
      setFout(
        "Vul eerst de actuele meterstand in.",
      );
      return;
    }

    if (
      !meterpunt &&
      !puntInvoer?.resultaat
    ) {
      setFout(
        "Kies eerst een beoordeling.",
      );
      return;
    }

    const numeriekeWaarde = meterpunt
      ? Number(
          puntInvoer.numeriekeWaarde.replace(
            ",",
            ".",
          ),
        )
      : null;

    if (
      meterpunt &&
      (
        numeriekeWaarde === null ||
        !Number.isFinite(
          numeriekeWaarde,
        ) ||
        numeriekeWaarde < 0
      )
    ) {
      setFout(
        "De meterstand moet nul of hoger zijn.",
      );
      return;
    }

    const resultaatWaarde =
      meterpunt
        ? "goed"
        : puntInvoer.resultaat;

    const heeftAfwijking =
      resultaatWaarde
        ? afwijkendeResultaten.has(
            resultaatWaarde,
          )
        : false;

    if (
      heeftAfwijking &&
      punt.toelichting_verplicht_bij_afwijking &&
      !puntInvoer.toelichting.trim()
    ) {
      setFout("Toelichting bij deze afwijking is verplicht.");
      return;
    }

    if (
      heeftAfwijking &&
      punt.foto_verplicht_bij_afwijking &&
      !puntInvoer.foto
    ) {
      setFout("Een foto bij deze afwijking is verplicht.");
      return;
    }

    setBezigPunt(punt.woning_controlepunt_id);
    setFout("");

    try {

      if (
        meterpunt &&
        punt.object_type
      ) {
        const metertype =
          METER_TYPE_PER_OBJECT[
            punt.object_type
          ];

        await slaRouteMeterstandOp({
          woning_id:
            gegevens.woning.id,
          controlesessie_id:
            gegevens.sessie.id,
          metertype,
          waarde:
            numeriekeWaarde as number,
          bewoners_aantal:
            gegevens.bewoners_aantal,
        });
      }

      const resultaat = await slaControleResultaatOp({
        controlesessie_id: gegevens.sessie.id,
        inspectie_id: gegevens.sessie.inspectie_id,
        woning_id: gegevens.woning.id,
        ruimte_id: punt.ruimte_id,
        object_id: punt.object_id,
        woning_controlepunt_id:
          punt.woning_controlepunt_id,
        resultaat:
          resultaatWaarde || "goed",
        numerieke_waarde:
          numeriekeWaarde,
        ruimte_naam_snapshot: punt.ruimte_naam,
        object_naam_snapshot: punt.object_naam,
        controlepunt_naam_snapshot:
          punt.controlepunt_naam,
        opmerkingen: null,
      });

      if (heeftAfwijking) {
        const afwijking =
          await slaControleAfwijkingOp({
            controle_resultaat_id: resultaat.id,
            woning_id: gegevens.woning.id,
            inspectie_id:
              gegevens.sessie.inspectie_id,
            controlesessie_id: gegevens.sessie.id,
            gebrek_type: puntInvoer.gebrekType,
            toelichting: puntInvoer.toelichting,
            urgentie: puntInvoer.urgentie,
          });

        if (
          puntInvoer.foto &&
          gegevens.sessie.inspectie_id
        ) {
          await uploadControleFoto({
            inspectie_id:
              gegevens.sessie.inspectie_id,
            controle_resultaat_id: resultaat.id,
            controle_afwijking_id: afwijking.id,
            bestand: puntInvoer.foto,
            omschrijving:
              puntInvoer.toelichting ||
              punt.controlepunt_naam,
          });
        }
      } else {
        await markeerAfwijkingNietRelevant(resultaat.id);
      }

      const nieuwOpgeslagen = new Set(
        opgeslagen,
      );

      nieuwOpgeslagen.add(
        punt.woning_controlepunt_id,
      );

      setOpgeslagen(nieuwOpgeslagen);

      wijzigPunt(
        punt.woning_controlepunt_id,
        {
          resultaat:
            resultaatWaarde || "goed",
          foto: null,
        },
      );

      const huidigeRuimteAfgerond =
        huidigeRuimte?.punten.every(
          (ruimtePunt) =>
            nieuwOpgeslagen.has(
              ruimtePunt.woning_controlepunt_id,
            ),
        ) ?? false;

      if (
        huidigeRuimteAfgerond &&
        ruimteIndex < ruimten.length - 1
      ) {
        setRuimteIndex(
          (huidig) =>
            Math.min(
              ruimten.length - 1,
              huidig + 1,
            ),
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Controlepunt opslaan mislukt.",
      );
    } finally {
      setBezigPunt(null);
    }
  }

  async function afronden() {
    const ontbrekend = verplichtePunten.filter(
      (punt) =>
        !opgeslagen.has(punt.woning_controlepunt_id),
    );

    if (ontbrekend.length > 0) {
      setFout(
        `Nog ${ontbrekend.length} verplicht controlepunt(en) niet opgeslagen.`,
      );
      return;
    }

    setAfrondenBezig(true);
    setFout("");

    try {
      await rondControleflowAf(
        gegevens.sessie.id,
        gegevens.sessie.inspectie_id,
      );
      router.push("/controleur");
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Controle afronden mislukt.",
      );
      setAfrondenBezig(false);
    }
  }

  if (!huidigeRuimte) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">
            Geen controlepunten geconfigureerd
          </h1>
          <p className="mt-2 text-slate-600">
            Configureer eerst de fysieke woningroute en
            controlepunten.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
            CFME Control
          </p>
          <h1 className="mt-2 text-2xl font-bold">
            {gegevens.woning.dossiernummer} ·{" "}
            {gegevens.woning.adres}
          </h1>
          <p className="mt-1 text-slate-300">
            {gegevens.woning.postcode}{" "}
            {gegevens.woning.plaats}
          </p>

          <div className="mt-5">
            <div className="flex justify-between text-sm">
              <span>Voortgang controle</span>
              <span>{voortgang}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full bg-emerald-400 transition-all"
                style={{ width: `${voortgang}%` }}
              />
            </div>
          </div>
        </header>

        <section className="mt-5 rounded-2xl bg-white p-5 shadow">
          <p className="text-sm font-semibold text-emerald-700">
            Stap {ruimteIndex + 1} van {ruimten.length}
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            {huidigeRuimte.naam}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {label(huidigeRuimte.type)}
          </p>

          {huidigeRuimte.instructie && (
            <p className="mt-4 rounded-xl bg-blue-50 p-4 text-blue-900">
              {huidigeRuimte.instructie}
            </p>
          )}
        </section>

        {fout && (
          <p className="mt-5 rounded-xl bg-red-100 p-4 text-red-800">
            {fout}
          </p>
        )}

        <div className="mt-5 space-y-5">
          {huidigeRuimte.punten.map((punt) => {
            const puntInvoer =
              invoer[punt.woning_controlepunt_id];
            const meterpunt =
              isMeterpunt(punt);

            const internetpunt =
              isInternetpunt(punt);

            const metertype =
              punt.object_type
                ? METER_TYPE_PER_OBJECT[
                    punt.object_type
                  ]
                : undefined;

            const vorigeStand =
              vorigeMeterstand(
                punt,
                gegevens,
              );

            const heeftAfwijking =
              puntInvoer?.resultaat &&
              afwijkendeResultaten.has(
                puntInvoer.resultaat,
              );

            return (
              <article
                key={punt.woning_controlepunt_id}
                className="rounded-2xl bg-white p-5 shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {punt.object_naam && (
                      <p className="text-sm font-semibold text-blue-700">
                        {punt.object_naam}
                      </p>
                    )}
                    <h3 className="text-lg font-bold">
                      {punt.controlepunt_naam}
                    </h3>
                    {punt.controlepunt_omschrijving && (
                      <p className="mt-1 text-sm text-slate-600">
                        {punt.controlepunt_omschrijving}
                      </p>
                    )}
                  </div>

                  {opgeslagen.has(
                    punt.woning_controlepunt_id,
                  ) && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      Opgeslagen
                    </span>
                  )}
                </div>

                {meterpunt && metertype ? (
                  <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                    <label className="block">
                      <span className="block text-lg font-bold text-slate-950">
                        Actuele meterstand
                      </span>

                      {vorigeStand !== null && (
                        <span className="mt-1 block text-sm text-slate-600">
                          Vorige stand:{" "}
                          {vorigeStand.toLocaleString(
                            "nl-NL",
                            {
                              maximumFractionDigits: 3,
                            },
                          )}{" "}
                          {meterEenheid(metertype)}
                        </span>
                      )}

                      <div className="mt-4 flex items-center gap-3">
                        <input
                          autoFocus
                          inputMode="decimal"
                          type="number"
                          min="0"
                          step="0.001"
                          value={
                            puntInvoer?.numeriekeWaarde ??
                            ""
                          }
                          onChange={(event) =>
                            wijzigPunt(
                              punt.woning_controlepunt_id,
                              {
                                numeriekeWaarde:
                                  event.target.value,
                              },
                            )
                          }
                          className="min-w-0 flex-1 rounded-xl border border-blue-300 bg-white px-4 py-4 text-2xl font-bold"
                          placeholder="0,000"
                        />

                        <span className="shrink-0 text-lg font-bold text-slate-700">
                          {meterEenheid(metertype)}
                        </span>
                      </div>
                    </label>
                  </div>
                ) : internetpunt ? (
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      {
                        resultaat:
                          "goed" as const,
                        tekst: "Werkt",
                        stijl:
                          "border-emerald-700 bg-emerald-700 text-white",
                        directOpslaan: true,
                      },
                      {
                        resultaat:
                          "onvoldoende" as const,
                        tekst: "Storing",
                        stijl:
                          "border-red-700 bg-red-700 text-white",
                        directOpslaan: false,
                      },
                      {
                        resultaat:
                          "niet_aanwezig" as const,
                        tekst: "Niet aanwezig",
                        stijl:
                          "border-slate-700 bg-slate-700 text-white",
                        directOpslaan: false,
                      },
                    ].map((keuze) => {
                      const geselecteerd =
                        puntInvoer?.resultaat ===
                        keuze.resultaat;

                      return (
                        <button
                          key={keuze.resultaat}
                          type="button"
                          disabled={
                            bezigPunt ===
                            punt.woning_controlepunt_id
                          }
                          onClick={() => {
                            if (
                              keuze.directOpslaan
                            ) {
                              void slaPuntOp(
                                punt,
                                keuze.resultaat,
                              );
                              return;
                            }

                            wijzigPunt(
                              punt.woning_controlepunt_id,
                              {
                                resultaat:
                                  keuze.resultaat,
                              },
                            );
                          }}
                          className={`min-h-16 rounded-xl border px-4 py-4 text-lg font-bold disabled:opacity-50 ${
                            geselecteerd
                              ? keuze.stijl
                              : "border-slate-300 bg-white text-slate-900"
                          }`}
                        >
                          {bezigPunt ===
                          punt.woning_controlepunt_id
                            ? "Opslaan..."
                            : keuze.tekst}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {CONTROLE_RESULTATEN.map(
                      (resultaat) => (
                        <button
                          key={resultaat}
                          type="button"
                          onClick={() =>
                            wijzigPunt(
                              punt.woning_controlepunt_id,
                              { resultaat },
                            )
                          }
                          className={`min-h-12 rounded-xl border px-3 py-3 text-sm font-semibold ${
                            puntInvoer?.resultaat ===
                            resultaat
                              ? "border-emerald-700 bg-emerald-700 text-white"
                              : "border-slate-300 bg-white text-slate-800"
                          }`}
                        >
                          {label(resultaat)}
                        </button>
                      ),
                    )}
                  </div>
                )}

                {heeftAfwijking && (
                  <div className="mt-5 space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <select
                      value={puntInvoer.gebrekType}
                      onChange={(event) =>
                        wijzigPunt(
                          punt.woning_controlepunt_id,
                          {
                            gebrekType: event.target
                              .value as GebrekType,
                          },
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                    >
                      {GEBREK_TYPEN.map((type) => (
                        <option key={type} value={type}>
                          {label(type)}
                        </option>
                      ))}
                    </select>

                    <textarea
                      rows={4}
                      value={puntInvoer.toelichting}
                      onChange={(event) =>
                        wijzigPunt(
                          punt.woning_controlepunt_id,
                          {
                            toelichting:
                              event.target.value,
                          },
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                      placeholder="Beschrijf de afwijking en benodigde opvolging"
                    />

                    <select
                      value={puntInvoer.urgentie}
                      onChange={(event) =>
                        wijzigPunt(
                          punt.woning_controlepunt_id,
                          {
                            urgentie: event.target
                              .value as AfwijkingUrgentie,
                          },
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                    >
                      {AFWIJKING_URGENTIES.map(
                        (urgentie) => (
                          <option
                            key={urgentie}
                            value={urgentie}
                          >
                            Urgentie: {label(urgentie)}
                          </option>
                        ),
                      )}
                    </select>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium">
                        Foto
                        {punt.foto_verplicht_bij_afwijking
                          ? " *"
                          : ""}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        onChange={(event) =>
                          kiesFoto(
                            punt.woning_controlepunt_id,
                            event,
                          )
                        }
                        className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-3"
                      />
                    </label>
                  </div>
                )}

                {(
                  !internetpunt ||
                  Boolean(heeftAfwijking)
                ) && (
                  <button
                    type="button"
                    disabled={
                      bezigPunt ===
                      punt.woning_controlepunt_id
                    }
                    onClick={() =>
                      void slaPuntOp(punt)
                    }
                    className="mt-5 w-full rounded-xl bg-emerald-700 px-5 py-4 font-bold text-white disabled:opacity-50"
                  >
                    {bezigPunt ===
                    punt.woning_controlepunt_id
                      ? "Opslaan..."
                      : meterpunt
                        ? "Meterstand opslaan en verder"
                        : internetpunt
                          ? "Afwijking opslaan en verder"
                          : "Controlepunt opslaan"}
                  </button>
                )}
              </article>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={ruimteIndex === 0}
            onClick={() =>
              setRuimteIndex((huidig) =>
                Math.max(0, huidig - 1),
              )
            }
            className="rounded-xl border border-slate-300 bg-white px-4 py-4 font-bold disabled:opacity-40"
          >
            Vorige ruimte
          </button>

          {ruimteIndex < ruimten.length - 1 ? (
            <button
              type="button"
              onClick={() =>
                setRuimteIndex((huidig) =>
                  Math.min(
                    ruimten.length - 1,
                    huidig + 1,
                  ),
                )
              }
              className="rounded-xl bg-blue-700 px-4 py-4 font-bold text-white"
            >
              Volgende ruimte
            </button>
          ) : (
            <button
              type="button"
              disabled={afrondenBezig}
              onClick={afronden}
              className="rounded-xl bg-slate-950 px-4 py-4 font-bold text-white disabled:opacity-50"
            >
              {afrondenBezig
                ? "Afronden..."
                : "Controle afronden"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
