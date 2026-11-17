import EnergieMaandAnalysePagina from "@/components/energie/EnergieMaandAnalysePagina";
import EnergieTijdlijnPagina from "@/components/energie/EnergieTijdlijnPagina";

export const dynamic = "force-dynamic";

export default async function EnergieanalysePage({
  searchParams,
}: {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
}) {
  const parameters = await searchParams;
  // Bestaande selectie- en exportlinks blijven de maandtabel openen.
  if (parameters.weergave === "maanden" || parameters.maand || parameters.maanden_ingediend) {
    return <EnergieMaandAnalysePagina searchParams={Promise.resolve(parameters)} />;
  }
  return <EnergieTijdlijnPagina parameters={parameters} />;
}
