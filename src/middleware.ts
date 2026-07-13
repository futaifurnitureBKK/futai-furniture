import { NextRequest, NextResponse } from "next/server";

const COOKIE = "futai_admin_auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /admin routes (not /admin/login itself)
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const auth = req.cookies.get(COOKIE);
  if (auth?.value === process.env.ADMIN_SECRET) {
    return NextResponse.next();
  }

  const login = req.nextUrl.clone();
  login.pathname = "/admin/login";
  login.searchParams.set("from", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*"],
};
