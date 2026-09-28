import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { verifyPassword } from "@/lib/password-hash";

// Force-logs-out one active session ("kick") — gated the same way as
// /api/admin/logins, behind this page's own extra code.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  const { error } = await db.from("admin_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
