"use server";
import { revalidatePath } from "next/cache";
import {
  addDocumentVersie,
  archiveDocument,
  createDocument,
} from "@/services/documenten";

export type DocumentActieResultaat = {
  gelukt: boolean;
  fout: string | null;
  bestemming: string | null;
};

function foutmelding(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "De documenthandeling is niet gelukt.";
}

export async function documentAanmaken(
  woningId: number,
  formData: FormData
): Promise<DocumentActieResultaat> {
  try {
    const documentId = await createDocument(woningId, formData);
    revalidatePath(`/woningen/${woningId}`);
    return {
      gelukt: true,
      fout: null,
      bestemming: `/woningen/${woningId}/documenten/${documentId}`,
    };
  } catch (error) {
    return { gelukt: false, fout: foutmelding(error), bestemming: null };
  }
}

export async function documentVersieToevoegen(
  documentId: number,
  woningId: number,
  formData: FormData
): Promise<DocumentActieResultaat> {
  try {
    await addDocumentVersie(documentId, woningId, formData);
    revalidatePath(`/woningen/${woningId}`);
    revalidatePath(`/woningen/${woningId}/documenten/${documentId}`);
    return {
      gelukt: true,
      fout: null,
      bestemming: `/woningen/${woningId}/documenten/${documentId}`,
    };
  } catch (error) {
    return { gelukt: false, fout: foutmelding(error), bestemming: null };
  }
}

export async function documentArchiveren(
  documentId: number,
  woningId: number,
  formData: FormData
): Promise<DocumentActieResultaat> {
  try {
    const reden = String(formData.get("archiefreden") ?? "").trim();
    await archiveDocument(documentId, woningId, reden || null);
    revalidatePath(`/woningen/${woningId}`);
    revalidatePath(`/woningen/${woningId}/documenten/${documentId}`);
    revalidatePath(`/woningen/${woningId}/documenten/archief`);
    return {
      gelukt: true,
      fout: null,
      bestemming: `/woningen/${woningId}#documenten`,
    };
  } catch (error) {
    return { gelukt: false, fout: foutmelding(error), bestemming: null };
  }
}
