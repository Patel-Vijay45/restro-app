import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/session";

// Every staff page needs a login. The full role check happens on each page.
export async function middleware(req: NextRequest) {
  // the public website
  if (req.nextUrl.pathname === "/") return NextResponse.next();
  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = {
  // public: website (/), login, table QR pages (/t/...), order tracking (/track/...), dish photos, sitemap, robots, static files
  matcher: ["/((?!login|t/|track/|photo/|_next/|favicon|icon|manifest|sitemap|robots|.*\\.(?:png|svg|ico|webmanifest|xml|txt)$).*)"],
};
