import { NextRequest, NextResponse } from "next/server";
import { isValidDayKey } from "@/lib/dates";
import { getDayLog } from "@/lib/db";


export async function GET(request: NextRequest) {
  const day = request.nextUrl.searchParams.get("day");
  if (!day || !isValidDayKey(day)) {
    return NextResponse.json(
      { error: "Ugyldig dag. Bruk YYYY-MM-DD." },
      { status: 400 },
    );
  }

  try {
    const log = await getDayLog(day);
    return NextResponse.json(log);
  } catch (error) {
    console.error("getDayLog failed", error);
    return NextResponse.json(
      { error: "Kunne ikke hente dagen." },
      { status: 500 },
    );
  }
}
