import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/admin-session";

// Protects /admin routes with a signed session cookie, and counts storefront
// pageviews into Supabase for the admin dashboard.
// Visitor tracking is excluded here for any non-production run (npm run dev),
// so local dev never inflates the count.

const ADMIN_COOKIE = "futai_admin_auth";
const VISITOR_COOKIE = "futai_visitor_id";

// Admin pages must never be served from the browser's back/forward cache —
// otherwise logging out and hitting "back" can show a stale authenticated
// page straight from memory, with no request ever reaching this proxy.
function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}

async function handleAdmin(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const auth = request.cookies.get(ADMIN_COOKIE);
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret && (await verifySessionToken(auth?.value, secret))) {
    return noStore(NextResponse.next());
  }

  const login = request.nextUrl.clone();
  login.pathname = "/admin/login";
  login.searchParams.set("from", pathname);
  return noStore(NextResponse.redirect(login));
}

function trackVisit(request: NextRequest, event: NextFetchEvent): NextResponse {
  const response = NextResponse.next();

  if (process.env.NODE_ENV !== "production") {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const existingVisitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = existingVisitorId ?? crypto.randomUUID();

  if (!existingVisitorId) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
  }

  if (supabaseUrl && serviceKey) {
    event.waitUntil(
      fetch(`${supabaseUrl}/rest/v1/site_visits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          path: request.nextUrl.pathname,
          visitor_id: visitorId,
        }),
      }).catch(() => {})
    );
  }

  return response;
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    return handleAdmin(request);
  }

  return trackVisit(request, event);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/((?!admin|api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};