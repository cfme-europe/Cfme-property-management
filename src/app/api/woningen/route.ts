import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
export async function GET() {
  const { data, error } = await supabase
    .from("woningen")
    .select("id, created_at, adres, postcode, plaats")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
export async function POST(request: Request) {
  const { adres, postcode, plaats } = await request.json();

  const { data, error } = await supabase
    .from("woningen")
    .insert([
      {
        adres,
        postcode,
        plaats,
      },
    ]);

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}

