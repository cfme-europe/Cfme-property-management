import { NextResponse } from "next/server";
import {
  EnergieSelectieValidatieFout,
  type Parameters,
} from "@/lib/energie/selectie";
import {
  bouwEnergiePeriodeAnalyse,
  maakEnergiePeriodeCsv,
} from "@/lib/energie/periode-analyse";
import {
  getEnergieAnalyseBrondata,
  getEnergieUitbreiding,
} from "@/services/energieanalyse-server";

function leesParameters(search: URLSearchParams): Parameters {
  const parameters: Parameters = {};
  search.forEach((value, key) => {
    const current = parameters[key];
    parameters[key] =
      current === undefined
        ? value
        : Array.isArray(current)
          ? [...current, value]
          : [current, value];
  });
  return parameters;
}

export async function GET(request: Request) {
  const [bron, uitbreiding] = await Promise.all([
    getEnergieAnalyseBrondata(),
    getEnergieUitbreiding(),
  ]);
  bron.meterconfiguraties = uitbreiding.configuraties;

  let csv: string;
  try {
    const { analyse } = bouwEnergiePeriodeAnalyse(
      bron,
      leesParameters(new URL(request.url).searchParams),
    );
    csv = maakEnergiePeriodeCsv(analyse);
  } catch (cause) {
    const message =
      cause instanceof EnergieSelectieValidatieFout
        ? cause.message
        : cause instanceof Error
          ? cause.message
          : "De CSV-export kon niet worden opgebouwd.";
    return NextResponse.json({ fout: message }, { status: 400 });
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cfme-energieperiode.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
