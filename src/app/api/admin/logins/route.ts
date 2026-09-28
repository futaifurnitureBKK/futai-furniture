import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.SECURITY_LOG_CODE;
  const code = req.headers.get("x-security-code") || "";
  if (secret && code !== secret) {
    return NextResponse.json({ error: "รหัสไม่ถูกต้อง" }, { status: 403 });
  }

  const db = supabaseAdmin();

  const [{ data: logins, error: loginsErr }, { data: attempts, error: attemptsErr }] = await Promise.all([
    db.from("admin_logins").select("*").order("created_at", { ascending: false }).limit(200),
    db.from("login_attempts").select("*").order("first_attempt_at", { ascending: false }),
  ]);

  if (loginsErr || attemptsErr) {
    return NextResponse.json({ error: loginsErr?.message ?? attemptsErr?.message }, { status: 400 });
  }
  return NextResponse.json({ logins, attempts });
}
