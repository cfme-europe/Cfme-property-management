import Link from "next/link";
import { getBedrijven } from "@/services/bedrijven";
import type { Bedrijf } from "@/types/bedrijf";

export const dynamic = "force-dynamic";

type BedrijfStatus =
  | "alle"
  | "actief"
  | "gearchiveerd";

type Sorteervolgorde =
  | "naam-oplopend"
  | "naam-aflopend"
  | "nieuwste"
  | "oudste"
  | "plaats-oplopend";

type ZoekParameters = {
  zoeken?: string;
  status?: string;
  plaats?: string;
  sorteren?: string;
};

function geldigeStatus(
  waarde: string | undefined
): BedrijfStatus {
  if (waarde === "alle") {
    return "alle";
  }

  if (waarde === "gearchiveerd") {
    return "gearchiveerd";
  }

  return "actief";
}

function geldigeSortering(
  waarde: string | undefined
): Sorteervolgorde {
  const opties: Sorteervolgorde[] = [
    "naam-oplopend",
    "naam-aflopend",
    "nieuwste",
    "oudste",
    "plaats-oplopend",
  ];

  return opties.includes(
    waarde as Sorteervolgorde
  )
    ? (waarde as Sorteervolgorde)
    : "naam-oplopend";
}

function sorteerBedrijven(
  bedrijven: Bedrijf[],
  sortering: Sorteervolgorde
): Bedrijf[] {
  return [...bedrijven].sort((a, b) => {
    switch (sortering) {
      case "naam-aflopend":
        return b.naam.localeCompare(
          a.naam,
          "nl",
          { sensitivity: "base" }
        );

      case "nieuwste":
        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );

      case "oudste":
        return (
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
        );

      case "plaats-oplopend":
        return (
          (a.plaats ?? "").localeCompare(
            b.plaats ?? "",
            "nl",
            { sensitivity: "base" }
          ) ||
          a.naam.localeCompare(
            b.naam,
            "nl",
            { sensitivity: "base" }
          )
        );

      case "naam-oplopend":
      default:
        return a.naam.localeCompare(
          b.naam,
          "nl",
          { sensitivity: "base" }
        );
    }
  });
}

export default async function BedrijvenPage({
  searchParams,
}: {
  searchParams: Promise<ZoekParameters>;
}) {
  const parameters = await searchParams;

  const zoekterm =
    parameters.zoeken?.trim().toLowerCase() ?? "";
  const status = geldigeStatus(
    parameters.status
  );
  const plaatsfilter =
    parameters.plaats?.trim() ?? "";
  const sortering = geldigeSortering(
    parameters.sorteren
  );

  const alleBedrijven = await getBedrijven();

  const plaatsen = Array.from(
    new Set(
      alleBedrijven
        .map((bedrijf) => bedrijf.plaats?.trim())
        .filter(
          (plaats): plaats is string =>
            Boolean(plaats)
        )
    )
  ).sort((a, b) =>
    a.localeCompare(b, "nl", {
      sensitivity: "base",
    })
  );

  const bedrijven = sorteerBedrijven(
    alleBedrijven.filter((bedrijf) => {
      const pastBijZoeken =
        zoekterm === "" ||
        bedrijf.naam
          .toLowerCase()
          .includes(zoekterm) ||
        bedrijf.contactpersoon
          ?.toLowerCase()
          .includes(zoekterm) ||
        bedrijf.plaats
          ?.toLowerCase()
          .includes(zoekterm) ||
        bedrijf.postcode
          ?.toLowerCase()
          .includes(zoekterm) ||
        bedrijf.klantnummer
          ?.toLowerCase()
          .includes(zoekterm) ||
        bedrijf.kvk_nummer
          ?.toLowerCase()
          .includes(zoekterm);

      const pastBijStatus =
        status === "alle" ||
        (status === "actief" &&
          bedrijf.actief) ||
        (status === "gearchiveerd" &&
          !bedrijf.actief);

      const pastBijPlaats =
        plaatsfilter === "" ||
        bedrijf.plaats === plaatsfilter;

      return (
        pastBijZoeken &&
        pastBijStatus &&
        pastBijPlaats
      );
    }),
    sortering
  );

  const filtersActief =
    zoekterm !== "" ||
    status !== "actief" ||
    plaatsfilter !== "" ||
    sortering !== "naam-oplopend";

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
              Bedrijven
            </h1>

            <p className="mt-2 text-slate-600">
              Zoek, filter en beheer klanten en
              huurrelaties.
            </p>
          </div>

          <Link
            href="/bedrijven/nieuw"
            className="rounded-xl bg-emerald-700 px-5 py-3 font-medium text-white hover:bg-emerald-600"
          >
            Nieuw bedrijf
          </Link>
        </div>

        <form className="mb-5 grid gap-3 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_190px_190px_210px_auto]">
          <label>
            <span className="mb-1 block text-sm font-medium">
              Zoeken
            </span>

            <input
              name="zoeken"
              defaultValue={parameters.zoeken ?? ""}
              placeholder="Naam, klantnummer, contactpersoon, plaats of KVK"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium">
              Status
            </span>

            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600"
            >
              <option value="actief">
                Actief
              </option>
              <option value="gearchiveerd">
                Gearchiveerd
              </option>
              <option value="alle">
                Alle bedrijven
              </option>
            </select>
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
              <option value="naam-oplopend">
                Naam A–Z
              </option>
              <option value="naam-aflopend">
                Naam Z–A
              </option>
              <option value="nieuwste">
                Nieuwste eerst
              </option>
              <option value="oudste">
                Oudste eerst
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
                href="/bedrijven"
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
              {bedrijven.length}
            </span>{" "}
            van {alleBedrijven.length} bedrijven
          </p>

          {filtersActief && (
            <p className="text-sm font-medium text-emerald-700">
              Filters actief
            </p>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full min-w-[900px]">
            <thead className="border-b bg-slate-200">
              <tr>
                <th className="p-4 text-left">
                  Naam
                </th>
                <th className="p-4 text-left">
                  Klantnummer
                </th>
                <th className="p-4 text-left">
                  Contactpersoon
                </th>
                <th className="p-4 text-left">
                  Plaats
                </th>
                <th className="p-4 text-left">
                  Status
                </th>
                <th className="p-4 text-right">
                  Acties
                </th>
              </tr>
            </thead>

            <tbody>
              {bedrijven.map((bedrijf) => (
                <tr
                  key={bedrijf.id}
                  className="border-b border-slate-200 last:border-0 hover:bg-slate-50"
                >
                  <td className="p-4 font-semibold">
                    {bedrijf.naam}
                  </td>

                  <td className="p-4">
                    {bedrijf.klantnummer ?? "—"}
                  </td>

                  <td className="p-4">
                    {bedrijf.contactpersoon ?? "—"}
                  </td>

                  <td className="p-4">
                    {bedrijf.plaats ?? "—"}
                  </td>

                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        bedrijf.actief
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {bedrijf.actief
                        ? "Actief"
                        : "Gearchiveerd"}
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-4">
                      <Link
                        href={`/bedrijven/${bedrijf.id}`}
                        className="font-medium text-emerald-700 hover:underline"
                      >
                        Openen
                      </Link>

                      <Link
                        href={`/bedrijven/${bedrijf.id}/bewerken`}
                        className="font-medium text-slate-700 hover:underline"
                      >
                        Bewerken
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {bedrijven.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-10 text-center text-slate-600"
                  >
                    Geen bedrijven gevonden met deze
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
