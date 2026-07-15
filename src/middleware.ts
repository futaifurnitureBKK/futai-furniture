import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/admin-session";

const COOKIE = "futai_admin_auth";

// Admin pages must never be served from the browser's back/forward cache —
// otherwise logging out and hitting "back" can show a stale authenticated
// page straight from memory, with no request ever reaching this middleware.
function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /admin routes (not /admin/login itself)
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const auth = req.cookies.get(COOKIE);
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret && (await verifySessionToken(auth?.value, secret))) {
    return noStore(NextResponse.next());
  }

  const login = req.nextUrl.clone();
  login.pathname = "/admin/login";
  login.searchParams.set("from", pathname);
  return noStore(NextResponse.redirect(login));
}

export const config = {
  matcher: ["/admin/:path*"],
};
