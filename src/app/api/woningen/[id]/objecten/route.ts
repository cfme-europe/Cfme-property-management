import { NextResponse } from "next/server";
import { getComplianceObjectOpties } from "@/services/compliance";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: Context
) {
  try {
    const { id } = await context.params;
    const woningId = Number(id);
    const objecten =
      await getComplianceObjectOpties(woningId);

    return NextResponse.json(objecten);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Objecten ophalen mislukt.",
      },
      { status: 400 }
    );
  }
}
