"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DocumentActieResultaat } from "@/app/woningen/[id]/documenten/actions";

type Props = {
  action: (formData: FormData) => Promise<DocumentActieResultaat>;
  uploadSleutel?: string;
  bevestiging?: string;
  className?: string;
  children: React.ReactNode;
};

export default function DocumentFormulier({
  action,
  uploadSleutel,
  bevestiging,
  className,
  children,
}: Props) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function verstuur(formData: FormData) {
    if (bezig) return;
    if (bevestiging && !window.confirm(bevestiging)) return;

    setBezig(true);
    setFout(null);

    try {
      const resultaat = await action(formData);

      if (!resultaat.gelukt) {
        setFout(resultaat.fout ?? "De handeling is niet gelukt.");
        return;
      }

      if (resultaat.bestemming) {
        router.push(resultaat.bestemming);
      }
      router.refresh();
    } catch (error) {
      setFout(
        error instanceof Error
          ? error.message
          : "De handeling is niet gelukt. Probeer het opnieuw.",
      );
    } finally {
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
