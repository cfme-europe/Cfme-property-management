import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oorsprong = url.origin;

  if (!code) {
    return NextResponse.redirect(
      `${oorsprong}/wachtwoord-vergeten?fout=ongeldige-link`
    );
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.warn(
      "[CFME Auth] Herstelcode verwerken mislukt",
      {
        message: error.message || null,
        code: error.code || null,
      }
    );

    return NextResponse.redirect(
      `${oorsprong}/wachtwoord-vergeten?fout=verlopen-link`
    );
  }

  return NextResponse.redirect(
    `${oorsprong}/wachtwoord-herstellen`
  );
}
