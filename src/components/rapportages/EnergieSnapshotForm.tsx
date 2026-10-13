import { maakEnergieRapportSnapshot } from "@/app/bedrijven/energieanalyse/actions";
export default function EnergieSnapshotForm({
  rapportId,
  beschikbaar,
}: {
  rapportId: number;
  beschikbaar: boolean;
}) {
  return (
    <details className="my-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <summary className="cursor-pointer font-bold text-emerald-950">
        Optionele energiepagina voorbereiden
      </summary>
      {!beschikbaar ? (
        <p className="mt-3 text-sm">
          Beschikbaar na de afzonderlijk goedgekeurde database-uitbreiding.
        </p>
      ) : (
        <form action={maakEnergieRapportSnapshot} className="mt-4 space-y-4">
          <input type="hidden" name="rapportage_id" value={rapportId} />
          <p className="text-sm">
            Maak een nieuwe momentopname voor dit pand en deze rapportmaand.
            Bestaande rapportgegevens en eerdere momentopnames blijven behouden.
            Kies daarna bij ‘Klantversie maken’ of de extra energiepagina
            meegaat.
          </p>
          <fieldset className="flex flex-wrap gap-4">
            <legend className="mb-2 text-sm font-semibold">
              Energieproducten
            </legend>
            {["elektriciteit", "gas", "water"].map((d) => (
              <label key={d} className="flex gap-2 text-sm">
                <input name="drager" value={d} type="checkbox" defaultChecked />
                {d}
              </label>
            ))}
          </fieldset>
          <label className="block text-sm">
            Berekening
            <select
              name="modus"
              className="ml-3 rounded-lg border bg-white p-2"
            >
              <option value="exact">Alleen gemeten intervallen</option>
              <option value="schatting">
                Inclusief geschatte grensverdeling
              </option>
            </select>
          </label>
          <button className="rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white">
            Nieuwe energiesnapshot vastleggen
          </button>
        </form>
      )}
    </details>
  );
}
