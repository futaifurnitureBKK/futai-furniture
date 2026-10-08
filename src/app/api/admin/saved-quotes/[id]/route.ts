import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity-log";

const EDITABLE_FIELDS = [
  "doc_type",
  "doc_no",
  "status",
  "archived",
  "channel",
  "lang_mode",
  "doc_date",
  "customer_name",
  "customer_address",
  "customer_tax_id",
  "shipping_address",
  "shipping_date",
  "contact_person",
  "contact_phone",
  "salesperson",
  "notes",
  "terms_text",
  "discount_pct",
  "vat_pct",
  "deposit_pct",
  "items",
] as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const db = supabaseAdmin();
  const { data, error } = await db.from("saved_quotes").select("*").eq("id", id).single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json({ quote: data });
}

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

  const { data, error } = await db.from("saved_quotes").update(update).eq("id", id).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await logActivity(req, {
    action: "update",
    entityType: "saved_quote",
    entityId: id,
    summary: `แก้ไข${data.doc_type === "quotation" ? "ใบเสนอราคา" : data.doc_type === "delivery_note" ? "ใบส่งของ" : "เอกสาร"} ${data.doc_no} ลูกค้า ${data.customer_name || "-"} (${Object.keys(update).filter((k) => k !== "updated_at").join(", ") || "-"})`,
  });
  return NextResponse.json({ quote: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: before } = await db.from("saved_quotes").select("doc_type, doc_no, customer_name").eq("id", id).single();
  const { error } = await db.from("saved_quotes").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await logActivity(req, {
    action: "delete",
    entityType: "saved_quote",
    entityId: id,
    summary: `ลบ${before?.doc_type === "quotation" ? "ใบเสนอราคา" : before?.doc_type === "delivery_note" ? "ใบส่งของ" : "เอกสาร"} ${before?.doc_no ?? `#${id}`} ลูกค้า ${before?.customer_name || "-"}`,
  });
  return NextResponse.json({ ok: true });
}
