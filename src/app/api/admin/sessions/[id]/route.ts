import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity-log";

// Force-logs-out one active session ("kick").
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();

  const { id } = await params;
  const { data: before } = await db.from("admin_sessions").select("name, ip").eq("id", id).single();
  const { error } = await db.from("admin_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await logActivity(req, {
    action: "other",
    entityType: "admin_session",
    entityId: id,
    summary: `บังคับออกจากระบบ ${before?.name || "-"} (IP ${before?.ip || "-"})`,
  });
  return NextResponse.json({ ok: true });
}
