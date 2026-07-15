import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/admin-session";
import { supabaseAdmin } from "@/lib/supabase/server";

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
  if (!process.env.ADMIN_SECRET || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json({ error: "Admin auth not configured" }, { status: 500 });
  }

  const { password } = await req.json();
  const ip = getClientIp(req);
  const db = supabaseAdmin();

  const { data: attempt } = await db.from("login_attempts").select("*").eq("ip", ip).maybeSingle();
  const now = Date.now();

  if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > now) {
    const waitMin = Math.ceil((new Date(attempt.locked_until).getTime() - now) / 60000);
    return NextResponse.json({ error: `ลองผิดหลายครั้งเกินไป กรุณารออีก ${waitMin} นาที` }, { status: 429 });
  }

  if (password !== process.env.ADMIN_SECRET) {
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

  const token = await createSessionToken(process.env.ADMIN_SESSION_SECRET, MAX_AGE);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: MAX_AGE,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("futai_admin_auth");
  return res;
}
