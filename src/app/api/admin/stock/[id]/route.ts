import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { PRODUCT_FIELDS, pick } from "@/lib/stock-fields";
import { logActivity } from "@/lib/activity-log";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const update = { ...pick(body, PRODUCT_FIELDS), updated_at: new Date().toISOString() };

  const db = supabaseAdmin();
  const { data, error } = await db.from("stock_products").update(update).eq("id", id).select("*, stock_variants(*)").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await logActivity(req, {
    action: "update",
    entityType: "stock_product",
    entityId: id,
    summary: `แก้ไขสินค้าสต็อก ${data.code} (${Object.keys(update).filter((k) => k !== "updated_at").join(", ") || "-"})`,
    detail: update,
  });
  return NextResponse.json({ product: data });
}
