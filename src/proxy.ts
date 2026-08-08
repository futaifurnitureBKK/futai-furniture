import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

// Counts storefront pageviews into Supabase for the admin dashboard.
// Excluded by matcher: /admin, /api, static assets, Next internals.
// Excluded here: any non-production run (npm run dev), so local dev never inflates the count.

const VISITOR_COOKIE = "futai_visitor_id";

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const existingVisitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = existingVisitorId ?? crypto.randomUUID();
  const response = NextResponse.next();

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

export const config = {
  matcher: [
    "/((?!admin|api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
