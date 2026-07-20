"use server";

import {
  createCertificering,
  updateCertificering,
} from "@/services/certificeringen";
import type {
  Certificering,
  CertificeringInvoer,
} from "@/types/certificering";

export async function certificeringOpslaan(
  certificeringId: number | null,
  invoer: CertificeringInvoer
): Promise<Certificering> {
  if (certificeringId === null) {
    return createCertificering(invoer);
  }

  return updateCertificering(
    certificeringId,
    invoer
  );
}
