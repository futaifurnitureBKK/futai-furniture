import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { hashPassword, verifyPassword } from "@/lib/password-hash";
import { logActivity } from "@/lib/activity-log";

const TARGETS = ["main", "security_code"] as const;
type Target = (typeof TARGETS)[number];

function envFallbackFor(target: Target): string | undefined {
  return target === "main" ? process.env.ADMIN_SECRET : process.env.SECURITY_LOG_CODE;
}

// Changes the main /admin login password, or the extra code on
// /admin/security — the new value is stored hashed in admin_credentials,
// replacing whichever Vercel env var was acting as the fallback until now.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { target, currentPassword, newPassword } = body as { target?: string; currentPassword?: string; newPassword?: string };

  if (!target || !TARGETS.includes(target as Target)) {
    return NextResponse.json({ error: "target is required" }, { status: 400 });
  }
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: cred } = await db.from("admin_credentials").select("password_hash").eq("id", target).maybeSingle();
  const envFallback = envFallbackFor(target as Target);

  const currentOk = cred?.password_hash
    ? await verifyPassword(currentPassword || "", cred.password_hash)
    : envFallback
      ? currentPassword === envFallback
      : true; // nothing configured yet at all — first-time setup, nothing to confirm against

  if (!currentOk) {
    return NextResponse.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 403 });
  }

  const password_hash = await hashPassword(newPassword);
  const { error } = await db
    .from("admin_credentials")
    .upsert({ id: target, password_hash, updated_at: new Date().toISOString() });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await logActivity(req, {
    action: "update",
    entityType: "admin_credentials",
    entityId: target,
    summary: `เปลี่ยน${target === "main" ? "รหัสผ่านล็อกอินแอดมิน" : "รหัสเข้าหน้าความปลอดภัย"}`,
  });
  return NextResponse.json({ ok: true });
}
