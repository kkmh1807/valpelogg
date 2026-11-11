import { NextRequest, NextResponse } from "next/server";
import { getMonthActivity } from "@/lib/db";


export async function GET(request: NextRequest) {
  const year = Number(request.nextUrl.searchParams.get("year"));
  const month = Number(request.nextUrl.searchParams.get("month"));

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    year < 2000 ||
    year > 2100
  ) {
    return NextResponse.json(
      { error: "Ugyldig år eller måned." },
      { status: 400 },
    );
  }

  try {
    const days = await getMonthActivity(year, month);
    return NextResponse.json({ year, month, days });
  } catch (error) {
    console.error("getMonthActivity failed", error);
    return NextResponse.json(
      { error: "Kunne ikke hente kalender." },
      { status: 500 },
    );
  }
}
