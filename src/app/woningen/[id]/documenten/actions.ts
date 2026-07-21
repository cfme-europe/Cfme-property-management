"use server";

import { redirect } from "next/navigation";
import {
  addDocumentVersie,
  archiveDocument,
  createDocument,
} from "@/services/documenten";

export async function documentAanmaken(
  woningId: number,
  formData: FormData
): Promise<void> {
  const documentId = await createDocument(
    woningId,
    formData
  );

  redirect(
    `/woningen/${woningId}/documenten/${documentId}`
  );
}

export async function documentVersieToevoegen(
  documentId: number,
  woningId: number,
  formData: FormData
): Promise<void> {
  await addDocumentVersie(
    documentId,
    woningId,
    formData
  );

  redirect(
    `/woningen/${woningId}/documenten/${documentId}`
  );
}

export async function documentArchiveren(
  documentId: number,
  woningId: number,
  formData: FormData
): Promise<void> {
  const reden = String(
    formData.get("archiefreden") ?? ""
  ).trim();

  await archiveDocument(
    documentId,
    woningId,
    reden || null
  );

  redirect(`/woningen/${woningId}`);
}
