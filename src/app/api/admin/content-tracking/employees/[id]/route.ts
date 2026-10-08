import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity-log";

// Soft-delete only (archived = true) — a hard delete would cascade-remove
// this employee's whole posting history via content_tracking_posts'
// foreign key, which "ลบพนักงาน" should never silently do.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.role === "string") update.role = body.role.trim();
  if (typeof body.archived === "boolean") update.archived = body.archived;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("content_tracking_employees")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await logActivity(req, {
    action: update.archived === true ? "delete" : "update",
    entityType: "content_tracking_employee",
    entityId: id,
    summary: update.archived === true
      ? `ลบพนักงานติดตามโพสต์ ${data.name}`
      : `แก้ไขพนักงานติดตามโพสต์ ${data.name} (${Object.keys(update).join(", ")})`,
  });
  return NextResponse.json({ employee: data });
}
