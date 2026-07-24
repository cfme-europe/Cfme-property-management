"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  createControlepunt,
  createObject,
  createRuimte,
  createVerdieping,
  updateControlepunt,
  updateObject,
  updateRuimte,
  updateVerdieping,
} from "@/services/woningconfiguratie";
import type {
  ControlepuntDefinitie,
  WoningConfiguratie,
  WoningControlepunt,
  WoningObject,
  WoningRuimte,
  WoningVerdieping,
} from "@/types/woningconfiguratie";
import { RUIMTE_TYPEN } from "@/types/woningconfiguratie";

type Props = {
  woningId: number;
  configuratie: WoningConfiguratie;
};

const invoerClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-600 disabled:bg-slate-100";

function nummer(waarde: string, standaard = 0): number {
  const resultaat = Number(waarde);
  return Number.isInteger(resultaat) && resultaat >= 0
    ? resultaat
    : standaard;
}

function label(waarde: string): string {
  return waarde.replaceAll("_", " ");
}

export default function WoningconfiguratieBeheer({
  woningId,
  configuratie,
}: Props) {
  const router = useRouter();
  const [sectie, setSectie] = useState<
    "verdiepingen" | "ruimten" | "objecten" | "controlepunten"
  >("verdiepingen");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const [verdieping, setVerdieping] = useState<WoningVerdieping | null>(null);
  const [verdiepingNaam, setVerdiepingNaam] = useState("");
  const [niveau, setNiveau] = useState("0");
  const [verdiepingVolgorde, setVerdiepingVolgorde] = useState("0");
  const [verdiepingActief, setVerdiepingActief] = useState(true);
  const [verdiepingOpmerking, setVerdiepingOpmerking] = useState("");

  const [ruimte, setRuimte] = useState<WoningRuimte | null>(null);
  const [ruimteNaam, setRuimteNaam] = useState("");
  const [ruimteType, setRuimteType] = useState<(typeof RUIMTE_TYPEN)[number]>("overig");
  const [ruimteVerdiepingId, setRuimteVerdiepingId] = useState("");
  const [ruimteVolgorde, setRuimteVolgorde] = useState("0");
  const [ruimteActief, setRuimteActief] = useState(true);
  const [ruimteVerplicht, setRuimteVerplicht] = useState(true);
  const [routeInstructie, setRouteInstructie] = useState("");

  const [object, setObject] = useState<WoningObject | null>(null);
  const [objectRuimteId, setObjectRuimteId] = useState("");
  const [objectType, setObjectType] = useState("");
  const [objectNaam, setObjectNaam] = useState("");
  const [objectNummer, setObjectNummer] = useState("");
  const [objectVolgorde, setObjectVolgorde] = useState("0");
  const [objectActief, setObjectActief] = useState(true);
  const [objectVerplicht, setObjectVerplicht] = useState(true);

  const [controlepunt, setControlepunt] =
    useState<WoningControlepunt | null>(null);
  const [controleRuimteId, setControleRuimteId] = useState("");
  const [controleObjectId, setControleObjectId] = useState("");
  const [definitieId, setDefinitieId] = useState("");
  const [controleNaam, setControleNaam] = useState("");
  const [controleVolgorde, setControleVolgorde] = useState("0");
  const [controleVerplicht, setControleVerplicht] = useState(true);
  const [controleActief, setControleActief] = useState(true);

  const actieveVerdiepingen = useMemo(
    () => configuratie.verdiepingen.filter((item) => item.actief),
    [configuratie.verdiepingen],
  );
  const actieveRuimten = useMemo(
    () => configuratie.ruimten.filter((item) => item.actief),
    [configuratie.ruimten],
  );

  function resetFout() {
    setFout("");
  }

  async function uitvoeren(actie: () => Promise<unknown>) {
    setBezig(true);
    setFout("");
    try {
      await actie();
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "Opslaan mislukt.",
      );
    } finally {
      setBezig(false);
    }
  }

  function leegVerdieping() {
    setVerdieping(null);
    setVerdiepingNaam("");
    setNiveau("0");
    setVerdiepingVolgorde("0");
    setVerdiepingActief(true);
    setVerdiepingOpmerking("");
    resetFout();
  }

  function bewerkVerdieping(item: WoningVerdieping) {
    setVerdieping(item);
    setVerdiepingNaam(item.naam);
    setNiveau(String(item.niveau));
    setVerdiepingVolgorde(String(item.loopvolgorde));
    setVerdiepingActief(item.actief);
    setVerdiepingOpmerking(item.opmerkingen ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function slaVerdiepingOp(event: FormEvent) {
    event.preventDefault();
    await uitvoeren(async () => {
      const invoer = {
        woning_id: woningId,
        naam: verdiepingNaam,
        niveau: Number(niveau),
        loopvolgorde: nummer(verdiepingVolgorde),
        actief: verdiepingActief,
        opmerkingen: verdiepingOpmerking,
      };
      if (verdieping) await updateVerdieping(verdieping.id, invoer);
      else await createVerdieping(invoer);
      leegVerdieping();
    });
  }

  function leegRuimte() {
    setRuimte(null);
    setRuimteNaam("");
    setRuimteType("overig");
    setRuimteVerdiepingId("");
    setRuimteVolgorde("0");
    setRuimteActief(true);
    setRuimteVerplicht(true);
    setRouteInstructie("");
    resetFout();
  }

  function bewerkRuimte(item: WoningRuimte) {
    setRuimte(item);
    setRuimteNaam(item.naam);
    setRuimteType(item.ruimte_type);
    setRuimteVerdiepingId(item.verdieping_id ? String(item.verdieping_id) : "");
    setRuimteVolgorde(String(item.loopvolgorde));
    setRuimteActief(item.actief);
    setRuimteVerplicht(item.controle_verplicht);
    setRouteInstructie(item.route_instructie ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function slaRuimteOp(event: FormEvent) {
    event.preventDefault();
    await uitvoeren(async () => {
      const invoer = {
        woning_id: woningId,
        verdieping_id: ruimteVerdiepingId ? Number(ruimteVerdiepingId) : null,
        kamer_id: null,
        naam: ruimteNaam,
        ruimte_type: ruimteType,
        loopvolgorde: nummer(ruimteVolgorde),
        actief: ruimteActief,
        controle_verplicht: ruimteVerplicht,
        omschrijving: null,
        route_instructie: routeInstructie,
        opmerkingen: null,
      };
      if (ruimte) await updateRuimte(ruimte.id, invoer);
      else await createRuimte(invoer);
      leegRuimte();
    });
  }

  function leegObject() {
    setObject(null);
    setObjectRuimteId("");
    setObjectType("");
    setObjectNaam("");
    setObjectNummer("");
    setObjectVolgorde("0");
    setObjectActief(true);
    setObjectVerplicht(true);
    resetFout();
  }

  function bewerkObject(item: WoningObject) {
    setObject(item);
    setObjectRuimteId(String(item.ruimte_id));
    setObjectType(item.object_type);
    setObjectNaam(item.naam);
    setObjectNummer(item.objectnummer ?? "");
    setObjectVolgorde(String(item.loopvolgorde));
    setObjectActief(item.actief);
    setObjectVerplicht(item.controle_verplicht);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function slaObjectOp(event: FormEvent) {
    event.preventDefault();
    await uitvoeren(async () => {
      const invoer = {
        woning_id: woningId,
        ruimte_id: Number(objectRuimteId),
        object_type: objectType,
        naam: objectNaam,
        objectnummer: objectNummer,
        merk: null,
        model: null,
        serienummer: null,
        loopvolgorde: nummer(objectVolgorde),
        actief: objectActief,
        controle_verplicht: objectVerplicht,
        geplaatst_op: null,
        vervangen_op: null,
        opmerkingen: null,
      };
      if (object) await updateObject(object.id, invoer);
      else await createObject(invoer);
      leegObject();
    });
  }

  function leegControlepunt() {
    setControlepunt(null);
    setControleRuimteId("");
    setControleObjectId("");
    setDefinitieId("");
    setControleNaam("");
    setControleVolgorde("0");
    setControleVerplicht(true);
    setControleActief(true);
    resetFout();
  }

  function bewerkControlepunt(item: WoningControlepunt) {
    setControlepunt(item);
    setControleRuimteId(String(item.ruimte_id));
    setControleObjectId(item.object_id ? String(item.object_id) : "");
    setDefinitieId(String(item.definitie_id));
    setControleNaam(item.naam_override ?? "");
    setControleVolgorde(String(item.loopvolgorde));
    setControleVerplicht(item.verplicht);
    setControleActief(item.actief);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function slaControlepuntOp(event: FormEvent) {
    event.preventDefault();
    await uitvoeren(async () => {
      const invoer = {
        woning_id: woningId,
        ruimte_id: Number(controleRuimteId),
        object_id: controleObjectId ? Number(controleObjectId) : null,
        definitie_id: Number(definitieId),
        naam_override: controleNaam,
        omschrijving_override: null,
        loopvolgorde: nummer(controleVolgorde),
        verplicht: controleVerplicht,
        actief: controleActief,
        foto_verplicht_bij_afwijking: null,
        toelichting_verplicht_bij_afwijking: null,
        melding_maken_bij_afwijking: null,
        taak_maken_bij_afwijking: null,
        opmerkingen: null,
      };
      if (controlepunt) await updateControlepunt(controlepunt.id, invoer);
      else await createControlepunt(invoer);
      leegControlepunt();
    });
  }

  const tabs = [
    ["verdiepingen", "Verdiepingen"],
    ["ruimten", "Ruimten"],
    ["objecten", "Objecten"],
    ["controlepunten", "Controlepunten"],
  ] as const;

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 rounded-2xl bg-white p-3 shadow">
        {tabs.map(([waarde, tekst]) => (
          <button
            key={waarde}
            type="button"
            onClick={() => setSectie(waarde)}
            className={`rounded-xl px-4 py-3 font-semibold ${
              sectie === waarde
                ? "bg-emerald-700 text-white"
                : "bg-slate-100 text-slate-800"
            }`}
          >
            {tekst}
          </button>
        ))}
      </nav>

      {fout && (
        <p className="rounded-xl bg-red-100 p-4 text-red-800">{fout}</p>
      )}

      {sectie === "verdiepingen" && (
        <>
          <form onSubmit={slaVerdiepingOp} className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold">
              {verdieping ? "Verdieping bewerken" : "Verdieping toevoegen"}
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <input required value={verdiepingNaam} onChange={(e) => setVerdiepingNaam(e.target.value)} className={invoerClass} placeholder="Naam" />
              <input required type="number" step="1" value={niveau} onChange={(e) => setNiveau(e.target.value)} className={invoerClass} placeholder="Niveau" />
              <input required type="number" min="0" step="1" value={verdiepingVolgorde} onChange={(e) => setVerdiepingVolgorde(e.target.value)} className={invoerClass} placeholder="Loopvolgorde" />
            </div>
            <textarea value={verdiepingOpmerking} onChange={(e) => setVerdiepingOpmerking(e.target.value)} className={`${invoerClass} mt-4`} placeholder="Opmerkingen" />
            <label className="mt-4 flex gap-3"><input type="checkbox" checked={verdiepingActief} onChange={(e) => setVerdiepingActief(e.target.checked)} /> Actief</label>
            <div className="mt-5 flex gap-3">
              <button disabled={bezig} className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-50">Opslaan</button>
              {verdieping && <button type="button" onClick={leegVerdieping} className="rounded-xl border px-5 py-3">Annuleren</button>}
            </div>
          </form>
          <Lijst
            leegTekst="Nog geen verdiepingen."
            items={configuratie.verdiepingen}
            render={(item) => (
              <Rij
                key={item.id}
                titel={`${item.loopvolgorde}. ${item.naam}`}
                subtitel={`Niveau ${item.niveau} · ${item.actief ? "Actief" : "Inactief"}`}
                onBewerken={() => bewerkVerdieping(item)}
              />
            )}
          />
        </>
      )}

      {sectie === "ruimten" && (
        <>
          <form onSubmit={slaRuimteOp} className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold">{ruimte ? "Ruimte bewerken" : "Ruimte toevoegen"}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input required value={ruimteNaam} onChange={(e) => setRuimteNaam(e.target.value)} className={invoerClass} placeholder="Naam" />
              <select value={ruimteType} onChange={(e) => setRuimteType(e.target.value as (typeof RUIMTE_TYPEN)[number])} className={invoerClass}>
                {RUIMTE_TYPEN.map((type) => <option key={type} value={type}>{label(type)}</option>)}
              </select>
              <select value={ruimteVerdiepingId} onChange={(e) => setRuimteVerdiepingId(e.target.value)} className={invoerClass}>
                <option value="">Geen verdieping</option>
                {actieveVerdiepingen.map((item) => <option key={item.id} value={item.id}>{item.naam}</option>)}
              </select>
              <input required type="number" min="0" step="1" value={ruimteVolgorde} onChange={(e) => setRuimteVolgorde(e.target.value)} className={invoerClass} placeholder="Loopvolgorde" />
            </div>
            <input value={routeInstructie} onChange={(e) => setRouteInstructie(e.target.value)} className={`${invoerClass} mt-4`} placeholder="Route-instructie" />
            <div className="mt-4 flex flex-wrap gap-6">
              <label className="flex gap-3"><input type="checkbox" checked={ruimteActief} onChange={(e) => setRuimteActief(e.target.checked)} /> Actief</label>
              <label className="flex gap-3"><input type="checkbox" checked={ruimteVerplicht} onChange={(e) => setRuimteVerplicht(e.target.checked)} /> Controle verplicht</label>
            </div>
            <div className="mt-5 flex gap-3">
              <button disabled={bezig} className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-50">Opslaan</button>
              {ruimte && <button type="button" onClick={leegRuimte} className="rounded-xl border px-5 py-3">Annuleren</button>}
            </div>
          </form>
            <Lijst
              leegTekst="Nog geen ruimten."
              items={configuratie.ruimten}
              render={(item) => (
                <Rij
                  key={item.id}
                  titel={`${item.loopvolgorde}. ${item.naam}`}
                  subtitel={`${label(item.ruimte_type)} · ${
                    item.actief ? "Actief" : "Inactief"
                  }`}
                  onBewerken={() => bewerkRuimte(item)}
                />
              )}
            />
        </>
      )}

      {sectie === "objecten" && (
        <>
          <form onSubmit={slaObjectOp} className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold">{object ? "Object bewerken" : "Object toevoegen"}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <select required value={objectRuimteId} onChange={(e) => setObjectRuimteId(e.target.value)} className={invoerClass}>
                <option value="">Selecteer ruimte</option>
                {actieveRuimten.map((item) => <option key={item.id} value={item.id}>{item.naam}</option>)}
              </select>
              <input required value={objectType} onChange={(e) => setObjectType(e.target.value)} className={invoerClass} placeholder="Objecttype, bijvoorbeeld rookmelder" />
              <input required value={objectNaam} onChange={(e) => setObjectNaam(e.target.value)} className={invoerClass} placeholder="Naam" />
              <input value={objectNummer} onChange={(e) => setObjectNummer(e.target.value)} className={invoerClass} placeholder="Uniek objectnummer" />
              <input required type="number" min="0" step="1" value={objectVolgorde} onChange={(e) => setObjectVolgorde(e.target.value)} className={invoerClass} placeholder="Loopvolgorde" />
            </div>
            <div className="mt-4 flex flex-wrap gap-6">
              <label className="flex gap-3"><input type="checkbox" checked={objectActief} onChange={(e) => setObjectActief(e.target.checked)} /> Actief</label>
              <label className="flex gap-3"><input type="checkbox" checked={objectVerplicht} onChange={(e) => setObjectVerplicht(e.target.checked)} /> Controle verplicht</label>
            </div>
            <div className="mt-5 flex gap-3">
              <button disabled={bezig} className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-50">Opslaan</button>
              {object && <button type="button" onClick={leegObject} className="rounded-xl border px-5 py-3">Annuleren</button>}
            </div>
          </form>
          <Lijst leegTekst="Nog geen objecten." items={configuratie.objecten} render={(item) => (
            <Rij key={item.id} titel={`${item.loopvolgorde}. ${item.naam}`} subtitel={`${item.object_type} · ${item.actief ? "Actief" : "Inactief"}`} onBewerken={() => bewerkObject(item)} />
          )} />
        </>
      )}

      {sectie === "controlepunten" && (
        <>
          <form onSubmit={slaControlepuntOp} className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold">{controlepunt ? "Controlepunt bewerken" : "Controlepunt koppelen"}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <select required value={controleRuimteId} onChange={(e) => { setControleRuimteId(e.target.value); setControleObjectId(""); }} className={invoerClass}>
                <option value="">Selecteer ruimte</option>
                {actieveRuimten.map((item) => <option key={item.id} value={item.id}>{item.naam}</option>)}
              </select>
              <select value={controleObjectId} onChange={(e) => setControleObjectId(e.target.value)} className={invoerClass}>
                <option value="">Geen object</option>
                {configuratie.objecten.filter((item) => item.ruimte_id === Number(controleRuimteId) && item.actief).map((item) => <option key={item.id} value={item.id}>{item.naam}</option>)}
              </select>
              <select required value={definitieId} onChange={(e) => setDefinitieId(e.target.value)} className={invoerClass}>
                <option value="">Selecteer controlepunt</option>
                {configuratie.definities.map((item: ControlepuntDefinitie) => <option key={item.id} value={item.id}>{item.naam} · {item.categorie}</option>)}
              </select>
              <input value={controleNaam} onChange={(e) => setControleNaam(e.target.value)} className={invoerClass} placeholder="Afwijkende naam (optioneel)" />
              <input required type="number" min="0" step="1" value={controleVolgorde} onChange={(e) => setControleVolgorde(e.target.value)} className={invoerClass} placeholder="Loopvolgorde" />
            </div>
            <div className="mt-4 flex flex-wrap gap-6">
              <label className="flex gap-3"><input type="checkbox" checked={controleVerplicht} onChange={(e) => setControleVerplicht(e.target.checked)} /> Verplicht</label>
              <label className="flex gap-3"><input type="checkbox" checked={controleActief} onChange={(e) => setControleActief(e.target.checked)} /> Actief</label>
            </div>
            <div className="mt-5 flex gap-3">
              <button disabled={bezig} className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white disabled:opacity-50">Opslaan</button>
              {controlepunt && <button type="button" onClick={leegControlepunt} className="rounded-xl border px-5 py-3">Annuleren</button>}
            </div>
          </form>
          <Lijst
            leegTekst="Nog geen controlepunten gekoppeld."
            items={configuratie.controlepunten}
            render={(item) => (
              <Rij
                key={item.id}
                titel={`${item.loopvolgorde}. ${
                  item.naam_override ||
                  item.definitie?.naam ||
                  "Controlepunt"
                }`}
                subtitel={`${item.definitie?.categorie || "algemeen"} · ${
                  item.actief ? "Actief" : "Inactief"
                }`}
                onBewerken={() => bewerkControlepunt(item)}
              />
            )}
          />
        </>
      )}
    </div>
  );
}

function Lijst<T>({
  items,
  leegTekst,
  render,
}: {
  items: T[];
  leegTekst: string;
  render: (item: T) => ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow">
      {items.length === 0 ? (
        <p className="rounded-xl bg-slate-100 p-5 text-slate-600">{leegTekst}</p>
      ) : (
        <div className="divide-y">{items.map(render)}</div>
      )}
    </section>
  );
}

function Rij({
  titel,
  subtitel,
  onBewerken,
}: {
  titel: string;
  subtitel: string;
  onBewerken: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div>
        <p className="font-semibold">{titel}</p>
        <p className="mt-1 text-sm text-slate-600">{subtitel}</p>
      </div>
      <button type="button" onClick={onBewerken} className="rounded-xl border border-slate-300 px-4 py-2 font-medium">
        Bewerken
      </button>
    </div>
  );
}
