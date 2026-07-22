import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request
) {
  const supabase = await createClient();

  const { error } =
    await supabase.auth.signOut();

  if (error) {
    console.warn(
      "[CFME Auth] Uitloggen mislukt",
      {
        message: error.message || null,
        code: error.code || null,
      }
    );
  }

  return NextResponse.redirect(
    new URL("/login", request.url),
    303
  );
}

export async function GET(
  request: Request
) {
  return NextResponse.redirect(
    new URL("/", request.url),
    303
  );
}
