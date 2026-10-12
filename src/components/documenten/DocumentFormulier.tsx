"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  DocumentActieResultaat,
  DocumentUploadVoorbereidingResultaat,
} from "@/app/woningen/[id]/documenten/actions";

type Props = {
  action: (formData: FormData) => Promise<DocumentActieResultaat>;
  uploadVoorbereiden?: (
    formData: FormData,
  ) => Promise<DocumentUploadVoorbereidingResultaat>;
  uploadSleutel?: string;
  bevestiging?: string;
  className?: string;
  children: React.ReactNode;
};

export default function DocumentFormulier({
  action,
  uploadVoorbereiden,
  uploadSleutel,
  bevestiging,
  className,
  children,
}: Props) {
  const router = useRouter();
  const vergrendeld = useRef(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function verstuur(formData: FormData) {
    if (vergrendeld.current) return;
    if (bevestiging && !window.confirm(bevestiging)) return;

    vergrendeld.current = true;
    setBezig(true);
    setFout(null);

    try {
      const bestand = formData.get("bestand");

      if (bestand instanceof File && uploadVoorbereiden) {
        const uploadGegevens = new FormData();
        uploadGegevens.set(
          "upload_sleutel",
          String(formData.get("upload_sleutel") ?? ""),
        );
        uploadGegevens.set("bestandsnaam", bestand.name);
        uploadGegevens.set("bestandsgrootte", String(bestand.size));
        uploadGegevens.set("mime_type", bestand.type);

        const voorbereiding = await uploadVoorbereiden(uploadGegevens);

        if (
          !voorbereiding.gelukt ||
          !voorbereiding.bestandspad ||
          !voorbereiding.token
        ) {
          setFout(
            voorbereiding.fout ?? "De upload kon niet worden voorbereid."
          );
          return;
        }

        const supabase = createClient();
        const { error: uploadFout } = await supabase.storage
          .from("woningdocumenten")
          .uploadToSignedUrl(
            voorbereiding.bestandspad,
            voorbereiding.token,
            bestand,
            {
              contentType: bestand.type,
              cacheControl: "3600",
            },
          );

        if (uploadFout) {
          setFout(`Document uploaden mislukt: ${uploadFout.message}`);
          return;
        }

        formData.delete("bestand");
        formData.set("bestandspad", voorbereiding.bestandspad);
        formData.set("bestandsnaam", bestand.name);
        formData.set("bestandsgrootte", String(bestand.size));
        formData.set("mime_type", bestand.type);
      }

      const resultaat = await action(formData);

      if (!resultaat.gelukt) {
        setFout(resultaat.fout ?? "De handeling is niet gelukt.");
        return;
      }

      if (resultaat.bestemming) {
        router.replace(resultaat.bestemming);
      } else {
        router.refresh();
      }
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "De handeling is niet gelukt. Probeer het opnieuw.",
      );
    } finally {
      vergrendeld.current = false;
      setBezig(false);
    }
  }

  return (
    <form action={verstuur} className={className}>
      {uploadSleutel && (
        <input type="hidden" name="upload_sleutel" value={uploadSleutel} />
      )}

      <fieldset disabled={bezig} className="contents disabled:opacity-60">
        {children}
      </fieldset>

      {bezig && (
        <p className="mt-3 text-sm font-medium text-emerald-800" role="status">
          Bestand wordt verwerkt. Tik niet opnieuw en sluit dit scherm niet.
        </p>
      )}

      {fout && (
        <p className="mt-3 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800" role="alert">
          {fout}
        </p>
      )}
    </form>
  );
}
