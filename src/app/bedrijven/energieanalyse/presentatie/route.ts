import { NextResponse } from "next/server";
import {
  codeerEnergieAnoniemeSelectie,
  ENERGIE_ANONIEME_SELECTIE_COOKIE,
  leesEnergieMaandSelectie,
  herstelEnergieSelectieNaValidatiefout,
  type EnergieMaandParameters,
} from "@/lib/energie/maand-analyse";
import {
  energieClient,
  getEnergieAnalyseBrondata,
} from "@/services/energieanalyse-server";

export const dynamic = "force-dynamic";

function terugNaarSelectie(
  request: Request,
  parameters: EnergieMaandParameters,
  code: string,
  cause?: unknown,
) {
  const destination = new URL("/bedrijven/energieanalyse", request.url);
  const restored = herstelEnergieSelectieNaValidatiefout(
    parameters,
    code,
    cause,
  );
  for (const [key, value] of Object.entries(restored)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value])
      destination.searchParams.append(key, item);
  }
  return NextResponse.redirect(destination, 303);
}

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
  } catch {
    return terugNaarSelectie(request, {}, "ongeldige-selectie");
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
    return terugNaarSelectie(
      request,
      parameters,
      cause instanceof Error && /Selecteer minimaal één pand/.test(cause.message)
        ? "geen-panden"
        : "ongeldige-selectie",
      cause,
    );
  }
  const cookieValue = codeerEnergieAnoniemeSelectie(parsed.selectie);
  if (Buffer.byteLength(cookieValue, "utf8") > 3500)
    return terugNaarSelectie(request, parameters, "ongeldige-selectie");

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
