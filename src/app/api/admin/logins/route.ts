import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { verifyPassword } from "@/lib/password-hash";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();

  // A code changed from the "ตั้งค่าความปลอดภัย" screen lives in the DB as a
  // hash; until one is set, SECURITY_LOG_CODE keeps working as a fallback.
  const { data: cred } = await db.from("admin_credentials").select("password_hash").eq("id", "security_code").maybeSingle();
  const envSecret = process.env.SECURITY_LOG_CODE;
  const code = req.headers.get("x-security-code") || "";
  const codeOk = cred?.password_hash ? await verifyPassword(code, cred.password_hash) : !envSecret || code === envSecret;
  if (!codeOk) {
    return NextResponse.json({ error: "รหัสไม่ถูกต้อง" }, { status: 403 });
  }

  const [{ data: logins, error: loginsErr }, { data: attempts, error: attemptsErr }] = await Promise.all([
    db.from("admin_logins").select("*").order("created_at", { ascending: false }).limit(200),
    db.from("login_attempts").select("*").order("first_attempt_at", { ascending: false }),
  ]);

  if (loginsErr || attemptsErr) {
    return NextResponse.json({ error: loginsErr?.message ?? attemptsErr?.message }, { status: 400 });
  }
  return NextResponse.json({ logins, attempts });
}
