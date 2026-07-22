import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { InspectieFoto } from "@/types/inspectiefoto";

const BUCKET = "inspectiefotos";

export async function getInspectieFotos(
  inspectieId: number
): Promise<InspectieFoto[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inspectie_fotos")
    .select("*")
    .eq("inspectie_id", inspectieId)
    .order("volgorde", {
      ascending: true,
    })
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Inspectiefoto's ophalen mislukt: ${error.message}`
    );
  }

  const fotos =
    (data ?? []) as InspectieFoto[];

  return Promise.all(
    fotos.map(async (foto) => {
      const {
        data: urlData,
        error: urlFout,
      } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(
          foto.bestandspad,
          3600
        );

      return {
        ...foto,
        tijdelijke_url:
          urlFout
            ? null
            : urlData.signedUrl,
      };
    })
  );
}
