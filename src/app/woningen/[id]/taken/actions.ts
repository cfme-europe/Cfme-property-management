"use server";

import {
  createTaak,
  updateTaak,
  updateTaakStatus,
} from "@/services/taken";
import type {
  Taak,
  TaakInvoer,
  TaakStatus,
} from "@/types/taak";

export async function taakOpslaan(
  taakId: number | null,
  invoer: TaakInvoer
): Promise<Taak> {
  if (taakId === null) {
    return createTaak(invoer);
  }

  return updateTaak(taakId, invoer);
}

export async function taakStatusWijzigen(
  taakId: number,
  status: TaakStatus
): Promise<Taak> {
  return updateTaakStatus(taakId, status);
}
