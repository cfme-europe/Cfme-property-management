"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  archiveerRapporttemplate,
  createRapportblok,
  createRapporttemplate,
  createRapporttemplateversie,
  updateRapportblok,
  updateRapporttemplate,
} from "@/services/rapportagebibliotheek-client";
import type {
  Rapportblok,
  RapportblokType,
  RapportDoelgroep,
  RapporttemplateDoelgroep,
  RapporttemplateMetVersies,
} from "@/types/rapportagebibliotheek";

type Props = {
  rapportblokken: Rapportblok[];
  rapporttemplates: RapporttemplateMetVersies[];
};

export default function RapportagebibliotheekBeheer({
  rapportblokken,
  rapporttemplates,
}: Props) {
  const router = useRouter();

  const [blok, setBlok] =
    useState<Rapportblok | null>(null);
  const [blokNaam, setBlokNaam] = useState("");
  const [blokCode, setBlokCode] = useState("");
  const [blokOmschrijving, setBlokOmschrijving] =
    useState("");
  const [bloktype, setBloktype] =
    useState<RapportblokType>("vrije_tekst");
  const [blokDoelgroep, setBlokDoelgroep] =
    useState<RapportDoelgroep>("beide");
  const [blokZichtbaar, setBlokZichtbaar] =
    useState(true);
  const [blokActief, setBlokActief] =
    useState(true);

  const [template, setTemplate] =
    useState<RapporttemplateMetVersies | null>(
      null
    );
  const [templateNaam, setTemplateNaam] =
    useState("");
  const [templateCode, setTemplateCode] =
    useState("");
  const [
    templateOmschrijving,
    setTemplateOmschrijving,
  ] = useState("");
  const [
    templateDoelgroep,
    setTemplateDoelgroep,
  ] = useState<RapporttemplateDoelgroep>(
    "extern"
  );
  const [templateActief, setTemplateActief] =
    useState(true);

  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const invoerClass =
    "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 disabled:bg-slate-100";

  function resetBlok() {
    setBlok(null);
    setBlokNaam("");
    setBlokCode("");
    setBlokOmschrijving("");
    setBloktype("vrije_tekst");
    setBlokDoelgroep("beide");
    setBlokZichtbaar(true);
    setBlokActief(true);
    setFout("");
  }

  function bewerkBlok(waarde: Rapportblok) {
    setBlok(waarde);
    setBlokNaam(waarde.naam);
    setBlokCode(waarde.code);
    setBlokOmschrijving(
      waarde.omschrijving ?? ""
    );
    setBloktype(waarde.bloktype);
    setBlokDoelgroep(waarde.doelgroep);
    setBlokZichtbaar(
      waarde.standaard_zichtbaar
    );
    setBlokActief(waarde.actief);
    setFout("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function slaBlokOp(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setBezig(true);
    setFout("");

    try {
      const invoer = {
        code: blokCode,
        naam: blokNaam,
        omschrijving: blokOmschrijving,
        bloktype,
        doelgroep: blokDoelgroep,
        standaard_zichtbaar: blokZichtbaar,
        actief: blokActief,
        configuratie: {},
      };

      if (blok) {
        await updateRapportblok(blok.id, invoer);
      } else {
        await createRapportblok(invoer);
      }

      resetBlok();
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Rapportblok opslaan mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  function resetTemplate() {
    setTemplate(null);
    setTemplateNaam("");
    setTemplateCode("");
    setTemplateOmschrijving("");
    setTemplateDoelgroep("extern");
    setTemplateActief(true);
    setFout("");
  }

  function bewerkTemplate(
    waarde: RapporttemplateMetVersies
  ) {
    setTemplate(waarde);
    setTemplateNaam(waarde.naam);
    setTemplateCode(waarde.code);
    setTemplateOmschrijving(
      waarde.omschrijving ?? ""
    );
    setTemplateDoelgroep(waarde.doelgroep);
    setTemplateActief(waarde.actief);
    setFout("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function slaTemplateOp(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setBezig(true);
    setFout("");

    try {
      const invoer = {
        code: templateCode,
        naam: templateNaam,
        omschrijving: templateOmschrijving,
        doelgroep: templateDoelgroep,
        actief: templateActief,
      };

      if (template) {
        await updateRapporttemplate(
          template.id,
          invoer
        );
      } else {
        await createRapporttemplate(invoer);
      }

      resetTemplate();
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Rapporttemplate opslaan mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  async function nieuweVersie(
    templateId: number
  ) {
    setBezig(true);
    setFout("");

    try {
      const versie =
        await createRapporttemplateversie({
          template_id: templateId,
          geldig_vanaf: null,
          toelichting: null,
          configuratie: {},
        });

      router.push(
        `/rapportages/bibliotheek/versies/${versie.id}`
      );
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Templateversie aanmaken mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  async function archiveer(templateId: number) {
    if (
      !window.confirm(
        "Rapporttemplate archiveren?"
      )
    ) {
      return;
    }

    setBezig(true);
    setFout("");

    try {
      await archiveerRapporttemplate(templateId);
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Archiveren mislukt."
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="space-y-8">
      {fout && (
        <p className="rounded-xl bg-red-100 p-4 text-red-800">
          {fout}
        </p>
      )}

      <div className="grid gap-8 xl:grid-cols-2">
        <form
          onSubmit={slaBlokOp}
          className="rounded-2xl bg-white p-6 shadow"
        >
          <h2 className="text-2xl font-bold">
            {blok
              ? "Rapportblok bewerken"
              : "Nieuw rapportblok"}
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <input
              required
              value={blokNaam}
              onChange={(event) =>
                setBlokNaam(event.target.value)
              }
              className={invoerClass}
              placeholder="Naam"
            />

            <input
              required
              value={blokCode}
              onChange={(event) =>
                setBlokCode(event.target.value)
              }
              className={invoerClass}
              placeholder="Code"
            />

            <select
              value={bloktype}
              onChange={(event) =>
                setBloktype(
                  event.target.value as RapportblokType
                )
              }
              className={invoerClass}
            >
              {[
                "samenvatting",
                "bewoners",
                "inspecties",
                "meldingen",
                "meterstanden",
                "energieverbruik",
                "opmerkingen",
                "vrije_tekst",
              ].map((waarde) => (
                <option key={waarde} value={waarde}>
                  {waarde}
                </option>
              ))}
            </select>

            <select
              value={blokDoelgroep}
              onChange={(event) =>
                setBlokDoelgroep(
                  event.target.value as RapportDoelgroep
                )
              }
              className={invoerClass}
            >
              <option value="intern">Intern</option>
              <option value="extern">Extern</option>
              <option value="beide">Beide</option>
            </select>
          </div>

          <textarea
            rows={4}
            value={blokOmschrijving}
            onChange={(event) =>
              setBlokOmschrijving(event.target.value)
            }
            className={`${invoerClass} mt-4`}
            placeholder="Omschrijving"
          />

          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={blokZichtbaar}
                onChange={(event) =>
                  setBlokZichtbaar(
                    event.target.checked
                  )
                }
              />
              Standaard zichtbaar
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={blokActief}
                onChange={(event) =>
                  setBlokActief(event.target.checked)
                }
              />
              Actief
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              disabled={bezig}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-50"
            >
              Opslaan
            </button>

            {blok && (
              <button
                type="button"
                onClick={resetBlok}
                className="rounded-xl border px-5 py-3"
              >
                Annuleren
              </button>
            )}
          </div>
        </form>

        <form
          onSubmit={slaTemplateOp}
          className="rounded-2xl bg-white p-6 shadow"
        >
          <h2 className="text-2xl font-bold">
            {template
              ? "Rapporttemplate bewerken"
              : "Nieuw rapporttemplate"}
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <input
              required
              value={templateNaam}
              onChange={(event) =>
                setTemplateNaam(event.target.value)
              }
              className={invoerClass}
              placeholder="Naam"
            />

            <input
              required
              value={templateCode}
              onChange={(event) =>
                setTemplateCode(event.target.value)
              }
              className={invoerClass}
              placeholder="Code"
            />

            <select
              value={templateDoelgroep}
              onChange={(event) =>
                setTemplateDoelgroep(
                  event.target
                    .value as RapporttemplateDoelgroep
                )
              }
              className={invoerClass}
            >
              <option value="intern">Intern</option>
              <option value="extern">Extern</option>
            </select>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={templateActief}
                onChange={(event) =>
                  setTemplateActief(
                    event.target.checked
                  )
                }
              />
              Beschikbaar
            </label>
          </div>

          <textarea
            rows={4}
            value={templateOmschrijving}
            onChange={(event) =>
              setTemplateOmschrijving(
                event.target.value
              )
            }
            className={`${invoerClass} mt-4`}
            placeholder="Omschrijving"
          />

          <div className="mt-6 flex gap-3">
            <button
              disabled={bezig}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-50"
            >
              Opslaan
            </button>

            {template && (
              <button
                type="button"
                onClick={resetTemplate}
                className="rounded-xl border px-5 py-3"
              >
                Annuleren
              </button>
            )}
          </div>
        </form>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold">
          Rapportblokken
        </h2>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {rapportblokken.map((waarde) => (
            <button
              key={waarde.id}
              type="button"
              onClick={() => bewerkBlok(waarde)}
              className="rounded-xl border p-4 text-left hover:border-emerald-500"
            >
              <strong>{waarde.naam}</strong>
              <span className="mt-1 block text-sm text-slate-500">
                {waarde.code} · {waarde.doelgroep} ·{" "}
                {waarde.actief ? "actief" : "inactief"}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold">
          Rapporttemplates en versies
        </h2>

        <div className="mt-5 space-y-4">
          {rapporttemplates.map((waarde) => (
            <article
              key={waarde.id}
              className="rounded-xl border p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold">
                    {waarde.naam}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {waarde.code} · {waarde.doelgroep} ·{" "}
                    {waarde.status}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      bewerkTemplate(waarde)
                    }
                    className="rounded-lg border px-4 py-2"
                  >
                    Bewerken
                  </button>

                  <button
                    type="button"
                    disabled={bezig}
                    onClick={() =>
                      nieuweVersie(waarde.id)
                    }
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50"
                  >
                    Nieuwe versie
                  </button>

                  {waarde.status !==
                    "gearchiveerd" && (
                    <button
                      type="button"
                      onClick={() =>
                        archiveer(waarde.id)
                      }
                      className="rounded-lg border border-red-300 px-4 py-2 text-red-700"
                    >
                      Archiveren
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {waarde.versies.map((versie) => (
                  <button
                    key={versie.id}
                    type="button"
                    onClick={() =>
                      router.push(
                        `/rapportages/bibliotheek/versies/${versie.id}`
                      )
                    }
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm"
                  >
                    Versie {versie.versienummer} ·{" "}
                    {versie.status}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
