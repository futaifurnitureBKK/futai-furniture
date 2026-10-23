import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity-log";

const EDITABLE_FIELDS = [
  "sku",
  "image_url",
  "size_text",
  "unit_price",
  "qty",
  "remark",
  "customer_name",
  "customer_phone",
  "salesperson",
  "po_no",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const update: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field];
  }
  update.updated_at = new Date().toISOString();

  const db = supabaseAdmin();

  // Daily Sales doesn't touch Stock — deducting is Daily Export's job only.
  const { data, error } = await db.from("daily_sales_rows").update(update).eq("id", id).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await logActivity(req, {
    action: "update",
    entityType: "daily_sales_row",
    entityId: id,
    summary: `แก้ไขยอดขาย ${data.sale_date} SKU ${data.sku || "-"} (${Object.keys(update).filter((k) => k !== "updated_at").join(", ") || "-"})`,
    detail: update,
  });
  return NextResponse.json({ row: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: existing } = await db
    .from("daily_sales_rows")
    .select("sale_date, sku, qty, unit_price, customer_name")
    .eq("id", id)
    .single();

  const { error } = await db.from("daily_sales_rows").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await logActivity(req, {
    action: "delete",
    entityType: "daily_sales_row",
    entityId: id,
    summary: `ลบยอดขาย ${existing?.sale_date ?? ""} SKU ${existing?.sku || "-"} x${existing?.qty ?? "-"} ฿${Number((existing?.unit_price ?? 0) * (existing?.qty ?? 0)).toLocaleString("th-TH")} ลูกค้า ${existing?.customer_name || "-"}`,
  });
  return NextResponse.json({ ok: true });
}
