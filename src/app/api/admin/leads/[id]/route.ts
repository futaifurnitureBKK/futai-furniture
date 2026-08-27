import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

const EDITABLE_FIELDS = [
  "lead_date",
  "customer_name",
  "channel",
  "segment",
  "sku",
  "status",
  "contact_method",
  "notes",
  "next_followup_date",
  "deal_value",
  "lost_reason",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const db = supabaseAdmin();

  const update: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field];
  }
  update.updated_at = new Date().toISOString();

  // Stamp the moment a lead first becomes a closed deal — this is what
  // Cycle Time (lead_date -> converted_at) is measured against.
  if (update.status === "converted") {
    const { data: existing } = await db.from("leads").select("converted_at").eq("id", id).single();
    if (!existing?.converted_at) {
      update.converted_at = new Date().toISOString();
    }
  }

  const { data, error } = await db.from("leads").update(update).eq("id", id).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ lead: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const db = supabaseAdmin();

  const { error } = await db.from("leads").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
