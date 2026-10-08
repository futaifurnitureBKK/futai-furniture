import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { verifyPassword } from "@/lib/password-hash";

// Gated the same way as /api/admin/logins and /api/admin/sessions, behind
// the ADMINJ page's own extra code — this log can reveal who did what
// across the whole site, so it sits behind the same extra wall.
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

  const actor = req.nextUrl.searchParams.get("actor");
  const entityType = req.nextUrl.searchParams.get("entityType");
  const action = req.nextUrl.searchParams.get("action");
  const q = req.nextUrl.searchParams.get("q");
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 200, 500);

  let query = db.from("activity_log").select("*").order("created_at", { ascending: false }).limit(limit);
  if (actor) query = query.eq("actor", actor);
  if (entityType) query = query.eq("entity_type", entityType);
  if (action) query = query.eq("action", action);
  if (q) query = query.ilike("summary", `%${q}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ entries: data });
}
