import { NextRequest, NextResponse } from "next/server";
import { isValidDayKey, toDayKey } from "@/lib/dates";
import {
  getAccidentSeries,
  getIndoorAccidentCounts,
  setIndoorAccident,
} from "@/lib/db";
import type { AccidentKind } from "@/lib/types";

function isKind(value: unknown): value is AccidentKind {
  return value === "pee" || value === "poop";
}

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
    const series = await getAccidentSeries(days, end);
    return NextResponse.json({ days, end, series });
  } catch (error) {
    console.error("accidents GET failed", error);
    return NextResponse.json(
      { error: "Kunne ikke hente uhell." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  let body: {
    day?: string;
    kind?: string;
    count?: number;
    delta?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON." }, { status: 400 });
  }

  if (!isKind(body.kind)) {
    return NextResponse.json(
      { error: "Oppgi kind: pee eller poop." },
      { status: 400 },
    );
  }

  const day = body.day && isValidDayKey(body.day) ? body.day : toDayKey();
  const kind = body.kind;

  try {
    let next: number;
    if (typeof body.count === "number") {
      next = body.count;
    } else if (typeof body.delta === "number") {
      const current = await getIndoorAccidentCounts(day);
      next = current[kind] + body.delta;
    } else {
      return NextResponse.json(
        { error: "Oppgi count eller delta." },
        { status: 400 },
      );
    }

    const counts = await setIndoorAccident(day, kind, next);
    return NextResponse.json({ day, ...counts });
  } catch (error) {
    console.error("accidents PATCH failed", error);
    return NextResponse.json(
      { error: "Kunne ikke lagre uhell." },
      { status: 500 },
    );
  }
}
