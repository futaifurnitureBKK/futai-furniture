import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { verifyPassword } from "@/lib/password-hash";

const COOKIE = "futai_admin_auth";

// Lists currently-active admin sessions (not revoked, not expired) — gated
// the same way as /api/admin/logins, behind this page's own extra code.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();

  const { data: cred } = await db.from("admin_credentials").select("password_hash").eq("id", "security_code").maybeSingle();
  const envSecret = process.env.SECURITY_LOG_CODE;
  const code = req.headers.get("x-security-code") || "";
  const codeOk = cred?.password_hash ? await verifyPassword(code, cred.password_hash) : !envSecret || code === envSecret;
  if (!codeOk) {
    return NextResponse.json({ error: "รหัสไม่ถูกต้อง" }, { status: 403 });
  }

  const { data: sessions, error } = await db
    .from("admin_sessions")
    .select("id, ip, name, user_agent, created_at, expires_at")
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const currentSessionId = req.cookies.get(COOKIE)?.value || null;
  return NextResponse.json({ sessions, currentSessionId });
}
