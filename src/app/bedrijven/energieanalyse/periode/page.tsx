import EnergiePeriodeAnalysePagina from "@/components/energie/EnergiePeriodeAnalysePagina";

export const dynamic = "force-dynamic";

export default function EnergiePeriodePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <EnergiePeriodeAnalysePagina searchParams={searchParams} />;
}
