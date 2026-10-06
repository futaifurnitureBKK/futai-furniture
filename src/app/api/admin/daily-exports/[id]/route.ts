import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { restoreThenApply, adjustVariantField } from "@/lib/shared-stock";
import type { SavedQuoteItem } from "@/types";

const EDITABLE_FIELDS = [
  "remark", "customer_name", "salesperson", "po_no", "unit_price", "discount_pct", "channel", "quotation_id", "quotation_item_id",
] as const;

// qty and stock_variant_id are edited through this same route but handled
// separately below (not in EDITABLE_FIELDS) because changing either one has
// to restore the old deduction and apply the new one, never just overwrite.
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

  // Binding this row to a quotation line (from the per-row customer field)
  // — never let the row's qty exceed what's still outstanding on that line.
  if (body.quotation_id && body.quotation_item_id) {
    const { data: quote } = await db.from("saved_quotes").select("items").eq("id", body.quotation_id).single();
    const item = (quote?.items as SavedQuoteItem[] | undefined)?.find((it) => it.item_id === body.quotation_item_id);
    if (!item) {
      return NextResponse.json({ error: "ไม่พบรายการนี้ในใบเสนอราคา" }, { status: 404 });
    }
    const { data: shippedRows } = await db
      .from("daily_export_rows")
      .select("id, qty")
      .eq("quotation_id", body.quotation_id)
      .eq("quotation_item_id", body.quotation_item_id)
      .neq("id", id);
    const alreadyShipped = (shippedRows || []).reduce((sum, r) => sum + Number(r.qty), 0);
    const requestedQty = "qty" in body ? Number(body.qty) || 0 : undefined;
    if (requestedQty != null && alreadyShipped + requestedQty > item.qty) {
      return NextResponse.json({ error: "จำนวนเกินยอดค้างส่งของรายการนี้ในใบเสนอราคา" }, { status: 400 });
    }
  }

  if ("qty" in body || "stock_variant_id" in body) {
    const { data: existing } = await db
      .from("daily_export_rows")
      .select("stock_variant_id, stock_deducted_qty")
      .eq("id", id)
      .single();
    if (existing) {
      const newVariantId = "stock_variant_id" in body ? Number(body.stock_variant_id) : existing.stock_variant_id;
      const newQty = "qty" in body ? Number(body.qty) || 0 : existing.stock_deducted_qty;

      const result = await restoreThenApply(db, {
        oldVariantId: existing.stock_variant_id,
        oldQty: existing.stock_deducted_qty,
        newVariantId,
        newQty,
      });
      if (!result.ok) {
        return NextResponse.json({ error: "สต็อกเหลือไม่พอสำหรับจำนวนนี้" }, { status: 409 });
      }

      update.stock_variant_id = newVariantId;
      update.stock_deducted_qty = newQty;
      if ("qty" in body) update.qty = newQty;
      if ("sku" in body) update.sku = body.sku;
      if ("size_text" in body) update.size_text = body.size_text;
      if ("image_url" in body) update.image_url = body.image_url;
    }
  }

  const { data, error } = await db.from("daily_export_rows").update(update).eq("id", id).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ row: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: existing } = await db
    .from("daily_export_rows")
    .select("stock_variant_id, stock_deducted_qty")
    .eq("id", id)
    .single();
  if (existing?.stock_deducted_qty) {
    await adjustVariantField(db, existing.stock_variant_id, "available", existing.stock_deducted_qty);
  }

  const { error } = await db.from("daily_export_rows").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
