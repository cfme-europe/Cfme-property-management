import { NextResponse } from "next/server";
import {
  codeerEnergieAnoniemeSelectie,
  ENERGIE_ANONIEME_SELECTIE_COOKIE,
  leesEnergieMaandSelectie,
  type EnergieMaandParameters,
} from "@/lib/energie/maand-analyse";
import {
  energieClient,
  getEnergieAnalyseBrondata,
} from "@/services/energieanalyse-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || !URL.canParse(origin) || new URL(origin).host !== host)
    return NextResponse.json(
      { fout: "De presentatie moet vanuit deze ingelogde toepassing worden gestart." },
      { status: 403 },
    );

  try {
    await energieClient();
  } catch {
    return NextResponse.json(
      { fout: "Aanmelden en toegangscontrole zijn vereist." },
      { status: 401 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (cause) {
    return NextResponse.json(
      {
        fout:
          cause instanceof Error
            ? `De selectie kon niet worden gelezen: ${cause.message}`
            : "De selectie kon niet worden gelezen.",
      },
      { status: 400 },
    );
  }

  const parameters: EnergieMaandParameters = {};
  for (const [key, value] of form.entries()) {
    if (typeof value !== "string") continue;
    const current = parameters[key];
    parameters[key] =
      current === undefined
        ? value
        : Array.isArray(current)
          ? [...current, value]
          : [current, value];
  }

  const bron = await getEnergieAnalyseBrondata();
  let parsed: ReturnType<typeof leesEnergieMaandSelectie>;
  try {
    parsed = leesEnergieMaandSelectie(parameters, bron);
    if (parsed.weergave !== "anoniem")
      throw new Error("Selecteer de anonieme presentatie.");
  } catch (cause) {
    return NextResponse.json(
      {
        fout:
          cause instanceof Error
            ? cause.message
            : "De anonieme presentatie kon niet worden voorbereid.",
      },
      { status: 400 },
    );
  }
  const cookieValue = codeerEnergieAnoniemeSelectie(parsed.selectie);
  if (Buffer.byteLength(cookieValue, "utf8") > 3500)
    return NextResponse.json(
      { fout: "De selectie is te groot om veilig in de previewsessie op te slaan." },
      { status: 413 },
    );

  const destination = new URL(
    "/bedrijven/energieanalyse?weergave=anoniem",
    request.url,
  );
  const response = NextResponse.redirect(destination, 303);
  response.cookies.set(ENERGIE_ANONIEME_SELECTIE_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "strict",
    secure: destination.protocol === "https:",
    path: "/bedrijven/energieanalyse",
    maxAge: 15 * 60,
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
