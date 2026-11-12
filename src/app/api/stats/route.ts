import { NextRequest, NextResponse } from "next/server";
import { isValidDayKey, toDayKey } from "@/lib/dates";
import { getCareSeries } from "@/lib/db";

export async function GET(request: NextRequest) {
  const daysParam = Number(request.nextUrl.searchParams.get("days") ?? "14");
  const end = request.nextUrl.searchParams.get("end") ?? toDayKey();
  const days = Number.isFinite(daysParam)
    ? Math.min(90, Math.max(7, Math.floor(daysParam)))
    : 14;

  if (!isValidDayKey(end)) {
    return NextResponse.json({ error: "Ugyldig sluttdato." }, { status: 400 });
  }

  try {
    const series = await getCareSeries(days, end);
    return NextResponse.json({ days, end, series });
  } catch (error) {
    console.error("stats GET failed", error);
    return NextResponse.json(
      { error: "Kunne ikke hente statistikk." },
      { status: 500 },
    );
  }
}
