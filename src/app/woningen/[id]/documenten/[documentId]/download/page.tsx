import { redirect } from "next/navigation";
import { createDocumentDownloadUrl } from "@/services/documenten";

type Props = {
  params: Promise<{
    id: string;
    documentId: string;
  }>;
  searchParams: Promise<{
    versie?: string;
  }>;
};

export default async function DocumentDownloadPage({
  params,
  searchParams,
}: Props) {
  const { id, documentId } = await params;
  const { versie } = await searchParams;

  const woningId = Number(id);
  const documentNummer = Number(documentId);
  const versieId = Number(versie);

  const signedUrl =
    await createDocumentDownloadUrl(
      documentNummer,
      versieId,
      woningId
    );

  redirect(signedUrl);
}
