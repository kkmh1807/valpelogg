import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  getSitePassword,
  isValidSession,
} from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const password = getSitePassword();
  if (!password) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/login") return NextResponse.next();

  const ok = await isValidSession(
    request.cookies.get(SESSION_COOKIE)?.value,
    password,
  );
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
