import { NextRequest, NextResponse } from "next/server";
import { createAdminSession, revokeAdminSession } from "@/lib/admin-session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyPassword } from "@/lib/password-hash";

const COOKIE = "futai_admin_auth";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0].trim() || "unknown";
}

export async function POST(req: NextRequest) {
  if (!process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Admin auth not configured" }, { status: 500 });
  }

  const { password, name } = await req.json();
  const ip = getClientIp(req);
  const db = supabaseAdmin();

  const { data: attempt } = await db.from("login_attempts").select("*").eq("ip", ip).maybeSingle();
  const now = Date.now();

  if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > now) {
    const waitMin = Math.ceil((new Date(attempt.locked_until).getTime() - now) / 60000);
    return NextResponse.json({ error: `ลองผิดหลายครั้งเกินไป กรุณารออีก ${waitMin} นาที` }, { status: 429 });
  }

  // A password changed from the "ตั้งค่าความปลอดภัย" screen lives in the DB
  // as a hash; until one is set, ADMIN_SECRET keeps working as a fallback.
  const { data: cred } = await db.from("admin_credentials").select("password_hash").eq("id", "main").maybeSingle();
  const passwordOk = cred?.password_hash
    ? await verifyPassword(password, cred.password_hash)
    : password === process.env.ADMIN_SECRET;

  if (!passwordOk) {
    const windowExpired = attempt ? now - new Date(attempt.first_attempt_at).getTime() > WINDOW_MS : true;
    const attempts = windowExpired ? 1 : (attempt?.attempts ?? 0) + 1;
    const locked_until = attempts >= MAX_ATTEMPTS ? new Date(now + LOCKOUT_MS).toISOString() : null;

    await db.from("login_attempts").upsert({
      ip,
      attempts,
      first_attempt_at: windowExpired ? new Date(now).toISOString() : attempt!.first_attempt_at,
      locked_until,
    });

    return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  if (attempt) await db.from("login_attempts").delete().eq("ip", ip);
  const trimmedName = String(name || "").trim();
  const userAgent = req.headers.get("user-agent") || "";
  await db.from("admin_logins").insert({ ip, name: trimmedName, user_agent: userAgent });

  const sessionId = await createAdminSession({ ip, name: trimmedName, userAgent, maxAgeSeconds: MAX_AGE });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: MAX_AGE,
    path: "/",
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (token) await revokeAdminSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}
