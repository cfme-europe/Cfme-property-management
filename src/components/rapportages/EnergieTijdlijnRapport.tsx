import { saldoOverzicht } from "@/lib/energie/saldo-overzicht";
import type { TijdlijnRapport } from "@/lib/energie/tijdlijn-rapport";
import { geld } from "@/components/energie/EnergieSaldo";
const maanden = [
  "Jan",
  "Feb",
  "Mrt",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
];
export default function EnergieTijdlijnRapport({
  data,
  adres,
  datum,
}: {
  data: TijdlijnRapport;
  adres: string;
  datum: string;
}) {
  const indices = Array.from(
    { length: data.tot - data.van + 1 },
    (_, i) => i + data.van,
  );
  const overzicht = data.saldo ? saldoOverzicht([data.saldo], [data.saldo.woning_id], data.jaar, data.van, data.tot, data.tot) : null;
  return (
    <section
      data-energiepagina
      className="mx-auto max-w-5xl break-before-page rounded-xl border bg-[#fafaf6] p-6 text-slate-950 print:border-0"
      style={{ colorScheme: "light" }}
    >
      <p className="font-bold text-emerald-900">CFME CONTROL</p>
      <h2 className="text-3xl font-semibold mt-2">Verbruik en voorschot</h2>
      <p className="mb-4">
        {adres} · {maanden[data.van]}–{maanden[data.tot]} {data.jaar}
      </p>
      <div className="rounded-xl border bg-white p-3">
      <h3 className="font-bold text-emerald-950">Verbruik per maand</h3>
      {data.grafieken.map((g) => {
        const maximum =
          Math.max(
            1,
            ...g.waarden.filter((v): v is number => v !== null),
            ...g.referentie.filter((v): v is number => v !== null),
          ) * 1.1;
        const x = (i: number) =>
            55 + ((i - data.van) * 720) / Math.max(1, indices.length - 1),
          y = (v: number) => 150 - (v / maximum) * 120;
        return (
          <div className="py-1" key={g.product}>
            <h3 className="font-semibold capitalize">
              {g.product} · {g.eenheid}
            </h3>
            <svg
              viewBox="0 0 810 180"
              className="w-full max-h-40"
              role="img"
              aria-label={`${g.product} ${data.jaar}`}
            >
              {[0, 1, 2].map((n) => (
                <g key={n}>
                  <line
                    x1="55"
                    x2="785"
                    y1={y((maximum * n) / 2)}
                    y2={y((maximum * n) / 2)}
                    stroke="#cbd5e1"
                  />
                  <text
                    x="50"
                    y={y((maximum * n) / 2) + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="#334155"
                  >
                    {((maximum * n) / 2).toLocaleString("nl-NL", {
                      maximumFractionDigits: 0,
                    })}
                  </text>
                </g>
              ))}
              {[
                { v: g.waarden, f: g.volledig, kleur: "#047857", ref: false },
                {
                  v: g.referentie,
                  f: g.referentieVolledig,
                  kleur: "#2563eb",
                  ref: true,
                },
              ].map((r, k) => (
                <g key={k}>
                  {indices.map((i, j) =>
                    r.v[i] === null ? null : (
                      <g key={i}>
                        {j > 0 && r.v[indices[j - 1]] !== null && (
                          <line
                            x1={x(indices[j - 1])}
                            y1={y(r.v[indices[j - 1]]!)}
                            x2={x(i)}
                            y2={y(r.v[i]!)}
                            stroke={r.kleur}
                            strokeWidth="2.5"
                            strokeDasharray={
                              r.ref
                                ? "6 4"
                                : r.f[i] && r.f[indices[j - 1]]
                                  ? undefined
                                  : "2 4"
                            }
                          />
                        )}
                        <circle
                          cx={x(i)}
                          cy={y(r.v[i]!)}
                          r="4"
                          fill={r.f[i] ? r.kleur : "white"}
                          stroke={r.kleur}
                          strokeWidth="2"
                        />
                      </g>
                    ),
                  )}
                </g>
              ))}
              {indices.map((i) => (
                <text
                  key={i}
                  x={x(i)}
                  y="174"
                  textAnchor="middle"
                  fontSize="12"
                  fill="#334155"
                >
                  {maanden[i]}
                </text>
              ))}
            </svg>
            {!g.waarden.some((v) => v !== null) && (
              <p>Geen bruikbare gegevens.</p>
            )}
          </div>
        );
      })}
      <p className="text-sm">
        Groen: {data.jaar}
        {data.vergelijkjaar !== null
          ? ` · blauw gestreept: ${data.vergelijkjaar}`
          : ""}
        . Open punten: lopende maand of onvolledige metingen. Maandwaarden
        verdeeld uit meteropnames; geen dagelijkse metingen.
      </p>
      </div>
      {data.saldoOntbreekt && (
        <p className="mt-4">
          Voorschotsaldo onbekend: er is nog geen voorschotafspraak voor deze
          verhuurperiode vastgelegd.
        </p>
      )}
      {data.saldo && (
        <section className="mt-4 rounded-lg border bg-white p-4">
          <h3 className="font-semibold">
            Voorschot en geschatte kosten · stroom + gas + water
          </h3>
          <p className="text-sm">
            Start {data.saldo.vanaf} · startsaldo {geld(data.saldo.startsaldo)}
          </p>
          {overzicht && <div className="grid grid-cols-3 gap-3 my-3">
            <div><p>Afgesproken voorschot</p><strong>{geld(overzicht.voorschot)}</strong></div>
            <div><p>Geschatte kosten</p><strong>{geld(overzicht.kosten)}</strong></div>
            <div><p>{overzicht.saldo !== null && overzicht.saldo < 0 ? "Opgebouwd tekort" : "Opgebouwd tegoed / saldo"}</p><strong>{geld(overzicht.saldo === null ? null : Math.abs(overzicht.saldo))}</strong></div>
          </div>}
          <details><summary className="cursor-pointer">Maandoverzicht bekijken</summary>
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr>
                {["Maand", "Voorschot", "Kosten", "Verschil", "Saldo"].map(
                  (v) => (
                    <th className="p-1" key={v}>
                      {v}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {data.saldo.maanden.map((m) => (
                <tr key={m.maand} className="border-t">
                  <td className="p-1">
                    {m.maand}
                    {m.lopend ? " *" : ""}
                  </td>
                  <td>{geld(m.voorschot)}</td>
                  <td>{geld(m.kosten)}</td>
                  <td>{geld(m.verschil)}</td>
                  <td>{geld(m.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table></details>
          <p className="mt-2 text-sm">
            Positief = tegoed; negatief = tekort. * Lopende maand, nog
            onvolledig. Onbekend betekent dat invoer of metingen ontbreken.
          </p>
        </section>
      )}
      <p className="mt-4 text-sm">
        Alle bedragen inclusief btw, op basis van geschatte prijzen en
        afgesproken voorschotten. Geen betalingscontrole of afrekening.
        Momentopname {datum.slice(0, 10)}.
      </p>
    </section>
  );
}
