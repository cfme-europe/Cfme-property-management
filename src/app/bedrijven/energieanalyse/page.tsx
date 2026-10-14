import EnergieMaandAnalysePagina from "@/components/energie/EnergieMaandAnalysePagina";

export const dynamic = "force-dynamic";

export default function EnergieanalysePage({
  searchParams,
}: {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
}) {
  return <EnergieMaandAnalysePagina searchParams={searchParams} />;
}
