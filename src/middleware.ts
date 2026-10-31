import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/session";

// Every staff page needs a login. The full role check happens on each page.
export async function middleware(req: NextRequest) {
  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = {
  // public: login page, customer table pages (/t/...), static files
  matcher: ["/((?!login|t/|_next/|favicon|icon|manifest|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
