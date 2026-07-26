import { notFound, redirect } from "next/navigation";
import ControleurFlow from "@/components/controleur/ControleurFlow";
import { getControleurFlow } from "@/services/controleurflow-server";

export const dynamic = "force-dynamic";

export default async function ControleurFlowPage({
  params,
}: {
  params: Promise<{ sessieId: string }>;
}) {
  const { sessieId } = await params;
  const id = Number(sessieId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  let gegevens;

  try {
    gegevens = await getControleurFlow(id);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Geen geldige gebruikerssessie."
    ) {
      redirect(
        `/login?volgende=/controleur/controle/${id}`,
      );
    }

    throw error;
  }

  if (!gegevens) {
    notFound();
  }

  return <ControleurFlow gegevens={gegevens} />;
}
