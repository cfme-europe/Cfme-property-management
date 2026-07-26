"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateControleAfwijkingBeheer } from "@/services/controleafwijkingen";
import type {
  ControleAfwijkingBeheer,
  ControleAfwijkingStatus,
  FactuurOntvanger,
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

  if (!resultaat) return `Afwijking ${afwijking.id}`;

  return [
    resultaat.ruimte_naam_snapshot,
    resultaat.object_naam_snapshot,
    resultaat.controlepunt_naam_snapshot,
  ]
    .filter(Boolean)
    .join(" · ");
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

  function selecteer(afwijking: ControleAfwijkingBeheer) {
    setGeselecteerd(afwijking);
    setStatus(afwijking.status);
    setVerantwoordelijke(
      afwijking.verantwoordelijke ?? "",
    );
    setDeadline(afwijking.deadline ?? "");
    setHercontroleNodig(afwijking.hercontrole_nodig);
    setHercontroleVoor(
      afwijking.hercontrole_voor ?? "",
    );
    setHerstelbewijsVerplicht(
      afwijking.herstelbewijs_verplicht,
    );
    setHerstelbewijsOmschrijving(
      afwijking.herstelbewijs_omschrijving ?? "",
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function opslaan(
    event: FormEvent<HTMLFormElement>,
  ) {
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
          operationeel_gevolg: operationeelGevolg,
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
              <option value="opgelost">Opgelost</option>
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
                setVerantwoordelijke(event.target.value)
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
                  event.target.value as FactuurOntvanger,
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
                setGeschatteKosten(event.target.value)
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
                setWerkelijkeKosten(event.target.value)
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
                  setHerstelbewijsVerplicht(
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
                setHercontroleVoor(event.target.value)
              }
              className={`${invoerClass} mt-4`}
            />
          )}

          {herstelbewijsVerplicht && (
            <textarea
              rows={3}
              value={herstelbewijsOmschrijving}
              onChange={(event) =>
                setHerstelbewijsOmschrijving(
                  event.target.value,
                )
              }
              className={`${invoerClass} mt-4`}
              placeholder="Vereist herstelbewijs"
            />
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
              setFinancieelGevolg(event.target.value)
            }
            className={`${invoerClass} mt-4`}
            placeholder="Financieel gevolg"
          />

          <textarea
            rows={3}
            value={operationeelGevolg}
            onChange={(event) =>
              setOperationeelGevolg(event.target.value)
            }
            className={`${invoerClass} mt-4`}
            placeholder="Operationeel gevolg"
          />

          <div className="mt-5 flex gap-3">
            <button
              disabled={bezig}
              className="rounded-xl bg-emerald-700 px-6 py-3 font-bold text-white disabled:opacity-50"
            >
              {bezig ? "Opslaan..." : "Opvolging opslaan"}
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
                    {afwijking.status.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <p>
                    <span className="text-sm text-slate-500">
                      Urgentie
                    </span>
                    <br />
                    <strong>{afwijking.urgentie}</strong>
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
