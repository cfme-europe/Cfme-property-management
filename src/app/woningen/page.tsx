import Link from "next/link";
import { getWoningen } from "@/services/woningen-server";
import type { Woning } from "@/types/woning";

export const dynamic = "force-dynamic";

type Sorteervolgorde =
  | "nieuwste"
  | "oudste"
  | "adres-oplopend"
  | "adres-aflopend"
  | "plaats-oplopend";

type ZoekParameters = {
  zoeken?: string;
  plaats?: string;
  sorteren?: string;
};

function geldigeSortering(
  waarde: string | undefined
): Sorteervolgorde {
  const opties: Sorteervolgorde[] = [
    "nieuwste",
    "oudste",
    "adres-oplopend",
    "adres-aflopend",
    "plaats-oplopend",
  ];

  return opties.includes(
    waarde as Sorteervolgorde
  )
    ? (waarde as Sorteervolgorde)
    : "nieuwste";
}

function sorteerWoningen(
  woningen: Woning[],
  sortering: Sorteervolgorde
): Woning[] {
  return [...woningen].sort((a, b) => {
    switch (sortering) {
      case "oudste":
        return (
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
        );

      case "adres-oplopend":
        return a.adres.localeCompare(
          b.adres,
          "nl",
          { sensitivity: "base" }
        );

      case "adres-aflopend":
        return b.adres.localeCompare(
          a.adres,
          "nl",
          { sensitivity: "base" }
        );

      case "plaats-oplopend":
        return (
          a.plaats.localeCompare(
            b.plaats,
            "nl",
            { sensitivity: "base" }
          ) ||
          a.adres.localeCompare(
            b.adres,
            "nl",
            { sensitivity: "base" }
          )
        );

      case "nieuwste":
      default:
        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );
    }
  });
}

export default async function WoningenPage({
  searchParams,
}: {
  searchParams: Promise<ZoekParameters>;
}) {
  const parameters = await searchParams;

  const zoekterm =
    parameters.zoeken?.trim().toLowerCase() ?? "";
  const plaatsfilter =
    parameters.plaats?.trim() ?? "";
  const sortering = geldigeSortering(
    parameters.sorteren
  );

  let alleWoningen: Woning[] = [];
  let fout = "";

  try {
    alleWoningen = await getWoningen();
  } catch (error) {
    fout =
      error instanceof Error
        ? error.message
        : "Woningen ophalen mislukt.";
  }

  const plaatsen = Array.from(
    new Set(
      alleWoningen
        .map((woning) => woning.plaats.trim())
        .filter(Boolean)
    )
  ).sort((a, b) =>
    a.localeCompare(b, "nl", {
      sensitivity: "base",
    })
  );

  const woningen = sorteerWoningen(
    alleWoningen.filter((woning) => {
      const pastBijZoekterm =
        zoekterm === "" ||
        woning.adres
          .toLowerCase()
          .includes(zoekterm) ||
        woning.postcode
          .toLowerCase()
          .includes(zoekterm) ||
        woning.plaats
          .toLowerCase()
          .includes(zoekterm);

      const pastBijPlaats =
        plaatsfilter === "" ||
        woning.plaats === plaatsfilter;

      return pastBijZoekterm && pastBijPlaats;
    }),
    sortering
  );

  const filtersActief =
    zoekterm !== "" ||
    plaatsfilter !== "" ||
    sortering !== "nieuwste";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/"
              className="mb-3 inline-block text-sm font-medium text-emerald-700 hover:underline"
            >
              ← Dashboard
            </Link>

            <h1 className="text-3xl font-bold">
              Woningen
            </h1>

            <p className="mt-2 text-slate-600">
              Zoek, filter en beheer alle woningen.
            </p>
          </div>

          <Link
            href="/woningen/nieuw"
            className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white hover:bg-emerald-600"
          >
            Nieuwe woning
          </Link>
        </div>

        <form className="mb-5 grid gap-3 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-[minmax(240px,1fr)_220px_220px_auto]">
          <label>
            <span className="mb-1 block text-sm font-medium">
              Zoeken
            </span>

            <input
              name="zoeken"
              defaultValue={parameters.zoeken ?? ""}
              placeholder="Adres, postcode of plaats"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Plaats
            </span>

            <select
              name="plaats"
              defaultValue={plaatsfilter}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
            >
              <option value="">
                Alle plaatsen
              </option>

              {plaatsen.map((plaats) => (
                <option
                  key={plaats}
                  value={plaats}
                >
                  {plaats}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Sorteren
            </span>

            <select
              name="sorteren"
              defaultValue={sortering}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
            >
              <option value="nieuwste">
                Nieuwste eerst
              </option>
              <option value="oudste">
                Oudste eerst
              </option>
              <option value="adres-oplopend">
                Adres A–Z
              </option>
              <option value="adres-aflopend">
                Adres Z–A
              </option>
              <option value="plaats-oplopend">
                Plaats A–Z
              </option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button className="flex-1 rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800">
              Toepassen
            </button>

            {filtersActief && (
              <Link
                href="/woningen"
                className="rounded-xl border border-slate-300 px-4 py-3 font-medium hover:bg-slate-50"
              >
                Wissen
              </Link>
            )}
          </div>
        </form>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">
              {woningen.length}
            </span>{" "}
            van {alleWoningen.length} woningen
          </p>

          {filtersActief && (
            <p className="text-sm font-medium text-emerald-700">
              Filters actief
            </p>
          )}
        </div>

        {fout && (
          <div className="mb-5 rounded-xl bg-red-100 p-4 text-red-800">
            {fout}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full min-w-[720px]">
            <thead className="border-b bg-slate-200">
              <tr>
                <th className="p-4 text-left">
                  Adres
                </th>
                <th className="p-4 text-left">
                  Postcode
                </th>
                <th className="p-4 text-left">
                  Plaats
                </th>
                <th className="p-4 text-right">
                  Actie
                </th>
              </tr>
            </thead>

            <tbody>
              {woningen.map((woning) => (
                <tr
                  key={woning.id}
                  className="border-b border-slate-200 last:border-0 hover:bg-slate-50"
                >
                  <td className="p-4">
                    <Link
                      href={`/woningen/${woning.id}`}
                      className="font-semibold text-emerald-700 hover:underline"
                    >
                      {woning.adres}
                    </Link>
                  </td>

                  <td className="p-4">
                    {woning.postcode}
                  </td>

                  <td className="p-4">
                    {woning.plaats}
                  </td>

                  <td className="p-4 text-right">
                    <Link
                      href={`/woningen/${woning.id}`}
                      className="font-medium text-slate-700 hover:text-emerald-700 hover:underline"
                    >
                      Openen
                    </Link>
                  </td>
                </tr>
              ))}

              {!fout && woningen.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="p-10 text-center text-slate-600"
                  >
                    Geen woningen gevonden met deze
                    zoekopdracht.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
