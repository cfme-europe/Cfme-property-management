
import { NextResponse } from "next/server";
import { verwerkControletermijnEmails } from "@/services/controletermijn-email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isBevoegdeCronAanroep(
  request: Request,
): boolean {
  const geheim = process.env.CRON_SECRET;

  if (!geheim) {
    return false;
  }

  return (
    request.headers.get("authorization") ===
    `Bearer ${geheim}`
  );
}

export async function GET(request: Request) {
  if (!isBevoegdeCronAanroep(request)) {
    return NextResponse.json(
      {
        error: "Niet bevoegd.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const resultaat =
      await verwerkControletermijnEmails();

    return NextResponse.json(resultaat);
  } catch (error) {
    console.error(
      "[CFME Controletermijncron] Verwerking mislukt",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Controletermijnwaarschuwingen verwerken mislukt.",
      },
      {
        status: 500,
      },
    );
  }
}
