"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import InspectieFotoUpload from "@/components/inspecties/InspectieFotoUpload";
import { updateControleAfwijkingBeheer } from "@/services/controleafwijkingen";
import type {
  ControleAfwijkingBeheer,
  ControleAfwijkingStatus,
  FactuurOntvanger,
  HerstelbewijsStatus,
} from "@/types/controleafwijking";

type Props = {
  woningId: number;
  afwijkingen: ControleAfwijkingBeheer[];
};

function bedrag(waarde: number | null): string {
  if (waarde === null) return "—";

  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(waarde);
}

function titel(afwijking: ControleAfwijkingBeheer): string {
  const resultaat = afwijking.resultaat;

  if (!resultaat) {
    return `Afwijking ${afwijking.id}`;
  }

  return [
    resultaat.ruimte_naam_snapshot,
    resultaat.object_naam_snapshot,
    resultaat.controlepunt_naam_snapshot,
  ]
    .filter(Boolean)
    .join(" · ");
}

function statusLabel(status: string | null): string {
  return status?.replaceAll("_", " ") ?? "—";
}

export default function ControleAfwijkingenBeheer({
  woningId,
  afwijkingen,
}: Props) {
  const router = useRouter();

  const [geselecteerd, setGeselecteerd] =
    useState<ControleAfwijkingBeheer | null>(null);
  const [status, setStatus] =
    useState<ControleAfwijkingStatus>("open");
  const [verantwoordelijke, setVerantwoordelijke] =
    useState("");
  const [deadline, setDeadline] = useState("");
  const [hercontroleNodig, setHercontroleNodig] =
    useState(false);
  const [hercontroleVoor, setHercontroleVoor] =
    useState("");
  const [
    herstelbewijsVerplicht,
    setHerstelbewijsVerplicht,
  ] = useState(false);
  const [
    herstelbewijsOmschrijving,
    setHerstelbewijsOmschrijving,
  ] = useState("");
  const [
    herstelbewijsStatus,
    setHerstelbewijsStatus,
  ] = useState<HerstelbewijsStatus>("niet_vereist");
  const [oplossing, setOplossing] = useState("");
  const [geschatteKosten, setGeschatteKosten] =
    useState("");
  const [werkelijkeKosten, setWerkelijkeKosten] =
    useState("");
  const [factuurNaar, setFactuurNaar] =
    useState<FactuurOntvanger>("nog_te_bepalen");
  const [financieelGevolg, setFinancieelGevolg] =
    useState("");
  const [operationeelGevolg, setOperationeelGevolg] =
    useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const invoerClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-600";

  function selecteer(
    afwijking: ControleAfwijkingBeheer,
  ): void {
    setGeselecteerd(afwijking);
    setStatus(afwijking.status);
    setVerantwoordelijke(
      afwijking.verantwoordelijke ?? "",
    );
    setDeadline(afwijking.deadline ?? "");
    setHercontroleNodig(
      afwijking.hercontrole_nodig,
    );
    setHercontroleVoor(
      afwijking.hercontrole_voor ?? "",
    );
    setHerstelbewijsVerplicht(
      afwijking.herstelbewijs_verplicht,
    );
    setHerstelbewijsOmschrijving(
      afwijking.herstelbewijs_omschrijving ?? "",
    );
    setHerstelbewijsStatus(
      afwijking.herstelbewijs_status,
    );
    setOplossing(afwijking.oplossing ?? "");
    setGeschatteKosten(
      afwijking.geschatte_kosten === null
        ? ""
        : String(afwijking.geschatte_kosten),
    );
    setWerkelijkeKosten(
      afwijking.werkelijke_kosten === null
        ? ""
        : String(afwijking.werkelijke_kosten),
    );
    setFactuurNaar(
      afwijking.factuur_naar ?? "nog_te_bepalen",
    );
    setFinancieelGevolg(
      afwijking.financieel_gevolg ?? "",
    );
    setOperationeelGevolg(
      afwijking.operationeel_gevolg ?? "",
    );
    setFout("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function wijzigHerstelbewijsVerplicht(
    verplicht: boolean,
  ): void {
    setHerstelbewijsVerplicht(verplicht);
    setHerstelbewijsStatus(
      verplicht ? "vereist" : "niet_vereist",
    );

    if (!verplicht) {
      setHerstelbewijsOmschrijving("");
    }
  }

  async function opslaan(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!geselecteerd) return;

    setBezig(true);
    setFout("");

    try {
      await updateControleAfwijkingBeheer(
        geselecteerd.id,
        woningId,
        {
          status,
          verantwoordelijke,
          deadline: deadline || null,
          hercontrole_nodig: hercontroleNodig,
          hercontrole_voor:
            hercontroleNodig
              ? hercontroleVoor || null
              : null,
          herstelbewijs_verplicht:
            herstelbewijsVerplicht,
          herstelbewijs_omschrijving:
            herstelbewijsOmschrijving,
          herstelbewijs_status:
            herstelbewijsVerplicht
              ? herstelbewijsStatus
              : "niet_vereist",
          oplossing,
          geschatte_kosten:
            geschatteKosten === ""
              ? null
              : Number(geschatteKosten),
          werkelijke_kosten:
            werkelijkeKosten === ""
              ? null
              : Number(werkelijkeKosten),
          factuur_naar: factuurNaar,
          financieel_gevolg: financieelGevolg,
          operationeel_gevolg:
            operationeelGevolg,
        },
      );

      setGeselecteerd(null);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Afwijking opslaan mislukt.",
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="space-y-6">
      {geselecteerd && (
        <form
          onSubmit={opslaan}
          className="rounded-2xl bg-white p-6 shadow"
        >
          <h2 className="text-xl font-bold">
            {titel(geselecteerd)}
          </h2>

          <p className="mt-2 text-slate-600">
            {geselecteerd.toelichting}
          </p>

          {fout && (
            <p className="mt-4 rounded-xl bg-red-100 p-4 text-red-800">
              {fout}
            </p>
          )}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as ControleAfwijkingStatus,
                )
              }
              className={invoerClass}
            >
              <option value="open">Open</option>
              <option value="in_opvolging">
                In opvolging
              </option>
              <option value="opgelost">
                Opgelost
              </option>
              <option value="geaccepteerd">
                Geaccepteerd
              </option>
              <option value="niet_relevant">
                Niet relevant
              </option>
            </select>

            <input
              value={verantwoordelijke}
              onChange={(event) =>
                setVerantwoordelijke(
                  event.target.value,
                )
              }
              className={invoerClass}
              placeholder="Verantwoordelijke"
            />

            <input
              type="date"
              value={deadline}
              onChange={(event) =>
                setDeadline(event.target.value)
              }
              className={invoerClass}
            />

            <select
              value={factuurNaar}
              onChange={(event) =>
                setFactuurNaar(
                  event.target
                    .value as FactuurOntvanger,
                )
              }
              className={invoerClass}
            >
              <option value="nog_te_bepalen">
                Factuur nog te bepalen
              </option>
              <option value="cfme">CFME</option>
              <option value="hurend_bedrijf">
                Hurend bedrijf
              </option>
              <option value="eigenaar">
                Eigenaar
              </option>
            </select>

            <input
              type="number"
              min="0"
              step="0.01"
              value={geschatteKosten}
              onChange={(event) =>
                setGeschatteKosten(
                  event.target.value,
                )
              }
              className={invoerClass}
              placeholder="Geschatte kosten"
            />

            <input
              type="number"
              min="0"
              step="0.01"
              value={werkelijkeKosten}
              onChange={(event) =>
                setWerkelijkeKosten(
                  event.target.value,
                )
              }
              className={invoerClass}
              placeholder="Werkelijke kosten"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={hercontroleNodig}
                onChange={(event) =>
                  setHercontroleNodig(
                    event.target.checked,
                  )
                }
              />
              Hercontrole nodig
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={herstelbewijsVerplicht}
                onChange={(event) =>
                  wijzigHerstelbewijsVerplicht(
                    event.target.checked,
                  )
                }
              />
              Herstelbewijs verplicht
            </label>
          </div>

          {hercontroleNodig && (
            <input
              required
              type="date"
              value={hercontroleVoor}
              onChange={(event) =>
                setHercontroleVoor(
                  event.target.value,
                )
              }
              className={`${invoerClass} mt-4`}
            />
          )}

          {herstelbewijsVerplicht && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <select
                value={herstelbewijsStatus}
                onChange={(event) =>
                  setHerstelbewijsStatus(
                    event.target
                      .value as HerstelbewijsStatus,
                  )
                }
                className={invoerClass}
              >
                <option value="vereist">
                  Bewijs vereist
                </option>
                <option value="aangeleverd">
                  Bewijs aangeleverd
                </option>
                <option value="goedgekeurd">
                  Bewijs goedgekeurd
                </option>
                <option value="afgekeurd">
                  Bewijs afgekeurd
                </option>
              </select>

              <div className="rounded-xl bg-slate-100 px-4 py-3">
                <span className="text-sm text-slate-500">
                  Gekoppelde bewijsfoto’s
                </span>
                <br />
                <strong>
                  {geselecteerd.herstelbewijs_aantal}
                </strong>
              </div>

              <textarea
                rows={3}
                value={herstelbewijsOmschrijving}
                onChange={(event) =>
                  setHerstelbewijsOmschrijving(
                    event.target.value,
                  )
                }
                className={`${invoerClass} md:col-span-2`}
                placeholder="Vereist herstelbewijs"
              />

              <div className="md:col-span-2">
                {geselecteerd.inspectie_id ? (
                  <InspectieFotoUpload
                    inspectieId={
                      geselecteerd.inspectie_id
                    }
                    controleAfwijkingId={
                      geselecteerd.id
                    }
                  />
                ) : (
                  <p className="rounded-xl bg-amber-100 p-4 text-amber-900">
                    Herstelbewijs kan niet worden
                    toegevoegd omdat deze afwijking
                    niet aan een inspectie is gekoppeld.
                  </p>
                )}
              </div>
            </div>
          )}

          {status === "opgelost" && (
            <textarea
              required
              rows={4}
              value={oplossing}
              onChange={(event) =>
                setOplossing(event.target.value)
              }
              className={`${invoerClass} mt-4`}
              placeholder="Beschrijf het uitgevoerde herstel"
            />
          )}

          <textarea
            rows={3}
            value={financieelGevolg}
            onChange={(event) =>
              setFinancieelGevolg(
                event.target.value,
              )
            }
            className={`${invoerClass} mt-4`}
            placeholder="Financieel gevolg"
          />

          <textarea
            rows={3}
            value={operationeelGevolg}
            onChange={(event) =>
              setOperationeelGevolg(
                event.target.value,
              )
            }
            className={`${invoerClass} mt-4`}
            placeholder="Operationeel gevolg"
          />

          <div className="mt-5 flex gap-3">
            <button
              disabled={bezig}
              className="rounded-xl bg-emerald-700 px-6 py-3 font-bold text-white disabled:opacity-50"
            >
              {bezig
                ? "Opslaan..."
                : "Opvolging opslaan"}
            </button>

            <button
              type="button"
              onClick={() => setGeselecteerd(null)}
              className="rounded-xl border border-slate-300 px-6 py-3 font-medium"
            >
              Annuleren
            </button>
          </div>
        </form>
      )}

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold">
          Geregistreerde afwijkingen
        </h2>

        {afwijkingen.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-100 p-5 text-slate-600">
            Nog geen controleafwijkingen geregistreerd.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {afwijkingen.map((afwijking) => (
              <article
                key={afwijking.id}
                className="rounded-xl border border-slate-200 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">
                      {titel(afwijking)}
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      {afwijking.toelichting}
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
                    {statusLabel(afwijking.status)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <p>
                    <span className="text-sm text-slate-500">
                      Urgentie
                    </span>
                    <br />
                    <strong>
                      {statusLabel(afwijking.urgentie)}
                    </strong>
                  </p>

                  <p>
                    <span className="text-sm text-slate-500">
                      Melding
                    </span>
                    <br />
                    <strong>
                      {afwijking.melding_id ?? "—"}
                    </strong>
                  </p>

                  <p>
                    <span className="text-sm text-slate-500">
                      Taak
                    </span>
                    <br />
                    <strong>
                      {afwijking.taak_id ?? "—"}
                    </strong>
                  </p>

                  <p>
                    <span className="text-sm text-slate-500">
                      Kosten
                    </span>
                    <br />
                    <strong>
                      {bedrag(
                        afwijking.werkelijke_kosten ??
                          afwijking.geschatte_kosten,
                      )}
                    </strong>
                  </p>

                  <p>
                    <span className="text-sm text-slate-500">
                      Doorlooptijd
                    </span>
                    <br />
                    <strong>
                      {afwijking.doorlooptijd_dagen} dagen
                    </strong>
                  </p>

                  <p>
                    <span className="text-sm text-slate-500">
                      Deadline
                    </span>
                    <br />
                    <strong>
                      {afwijking.over_deadline
                        ? "Overschreden"
                        : afwijking.deadline ?? "—"}
                    </strong>
                  </p>

                  <p>
                    <span className="text-sm text-slate-500">
                      Opvolging
                    </span>
                    <br />
                    <strong>
                      Melding:{" "}
                      {statusLabel(
                        afwijking.melding_status,
                      )}
                      {" · "}
                      Taak:{" "}
                      {statusLabel(
                        afwijking.taak_status,
                      )}
                    </strong>
                  </p>

                  <p>
                    <span className="text-sm text-slate-500">
                      Herhaling
                    </span>
                    <br />
                    <strong>
                      {afwijking.terugkeer_aantal > 1
                        ? `${afwijking.terugkeer_aantal}× terugkerend`
                        : "Eerste registratie"}
                    </strong>
                  </p>

                  <p>
                    <span className="text-sm text-slate-500">
                      Herstelbewijs
                    </span>
                    <br />
                    <strong>
                      {statusLabel(
                        afwijking.herstelbewijs_status,
                      )}
                      {" · "}
                      {afwijking.herstelbewijs_aantal} foto’s
                    </strong>
                  </p>

                  <p>
                    <span className="text-sm text-slate-500">
                      Factuur
                    </span>
                    <br />
                    <strong>
                      {statusLabel(
                        afwijking.factuur_naar,
                      )}
                    </strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => selecteer(afwijking)}
                  className="mt-4 rounded-xl border border-slate-300 px-5 py-3 font-medium"
                >
                  Opvolging beheren
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
