export type NieuweWoningInvoer = {
  adres: string;
  postcode: string;
  plaats: string;
};

export function valideerNieuweWoning(
  waarde: unknown
): NieuweWoningInvoer {
  if (
    typeof waarde !== "object" ||
    waarde === null
  ) {
    throw new Error("Ongeldige invoer.");
  }

  const invoer = waarde as Record<string, unknown>;

  const adres =
    typeof invoer.adres === "string"
      ? invoer.adres.trim()
      : "";

  const postcode =
    typeof invoer.postcode === "string"
      ? invoer.postcode.trim()
      : "";

  const plaats =
    typeof invoer.plaats === "string"
      ? invoer.plaats.trim()
      : "";

  if (adres.length < 3) {
    throw new Error(
      "Adres moet minimaal 3 tekens bevatten."
    );
  }

  if (postcode.length < 4) {
    throw new Error(
      "Postcode moet minimaal 4 tekens bevatten."
    );
  }

  if (plaats.length < 2) {
    throw new Error(
      "Plaats moet minimaal 2 tekens bevatten."
    );
  }

  return {
    adres,
    postcode,
    plaats,
  };
}
