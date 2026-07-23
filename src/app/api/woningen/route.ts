import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { valideerNieuweWoning } from "@/lib/woningen/validatie";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("woningen")
    .select(
      "id, created_at, dossiernummer, adres, postcode, plaats"
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return NextResponse.json(
      {
        error:
          "Woningen ophalen mislukt.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(
  request: Request
) {
  try {
    const invoer =
      valideerNieuweWoning(
        await request.json()
      );

    const supabase =
      await createClient();

    const {
      data: { user },
      error: gebruikerFout,
    } = await supabase.auth.getUser();

    if (gebruikerFout || !user) {
      return NextResponse.json(
        {
          error:
            "Je sessie is verlopen. Log opnieuw in.",
        },
        {
          status: 401,
        }
      );
    }

    const { data, error } =
      await supabase
        .from("woningen")
        .insert(invoer)
        .select(
          "id, created_at, dossiernummer, adres, postcode, plaats"
        )
        .single();

    if (error) {
      console.warn(
        "[CFME Woningen] Opslaan mislukt",
        {
          message:
            error.message || null,
          code:
            error.code || null,
        }
      );

      return NextResponse.json(
        {
          error:
            "Woning opslaan mislukt. Controleer je rechten en invoer.",
        },
        {
          status: 403,
        }
      );
    }

    return NextResponse.json(
      data,
      {
        status: 201,
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ongeldige invoer.",
      },
      {
        status: 400,
      }
    );
  }
}
