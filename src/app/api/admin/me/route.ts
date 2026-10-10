import { NextRequest, NextResponse } from "next/server";
import { getSessionName } from "@/lib/admin-session";

const COOKIE = "futai_admin_auth";

// Lightweight "who am I" — lets a form auto-fill the logged-in person's name
// (e.g. Daily Export's staff field) without needing the full session list
// AdminFutai uses (which is gated by the extra security code).
export async function GET(req: NextRequest) {
  const name = await getSessionName(req.cookies.get(COOKIE)?.value);
  if (!name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ name });
}
