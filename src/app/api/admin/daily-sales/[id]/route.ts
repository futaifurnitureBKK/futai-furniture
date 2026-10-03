import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { syncStockDeduction } from "@/lib/stock-auto-deduct";

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
  "from_reserved",
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

  // Keep StockDEMO's available/reserved counts in sync whenever the item,
  // quantity, or the "จากของที่จองไว้" checkbox changes — see
  // syncStockDeduction for why this restores-then-applies instead of just
  // subtracting the new quantity.
  if ("sku" in body || "qty" in body || "size_text" in body || "from_reserved" in body) {
    const { data: existing } = await db
      .from("daily_sales_rows")
      .select("sku, qty, size_text, from_reserved, stock_variant_id, stock_deducted_qty, stock_deducted_field")
      .eq("id", id)
      .single();
    if (existing) {
      const newSku = "sku" in body ? String(body.sku ?? "") : existing.sku;
      const newQty = "qty" in body ? Number(body.qty) || 0 : existing.qty;
      const newSizeText = "size_text" in body ? String(body.size_text ?? "") : existing.size_text;
      const fromReserved = "from_reserved" in body ? !!body.from_reserved : existing.from_reserved;
      const result = await syncStockDeduction(db, {
        previousVariantId: existing.stock_variant_id,
        previousQty: existing.stock_deducted_qty,
        previousField: existing.stock_deducted_field,
        newSku,
        newQty,
        newSizeText,
        fromReserved,
      });
      update.stock_variant_id = result.variantId;
      update.stock_deducted_qty = result.deductedQty;
      update.stock_deducted_field = result.field;
    }
  }

  const { data, error } = await db.from("daily_sales_rows").update(update).eq("id", id).select().single();
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
    .from("daily_sales_rows")
    .select("stock_variant_id, stock_deducted_qty, stock_deducted_field")
    .eq("id", id)
    .single();
  if (existing?.stock_variant_id && existing.stock_deducted_qty) {
    await syncStockDeduction(db, {
      previousVariantId: existing.stock_variant_id,
      previousQty: existing.stock_deducted_qty,
      previousField: existing.stock_deducted_field,
      newSku: "",
      newQty: 0,
      newSizeText: "",
      fromReserved: false,
    });
  }

  const { error } = await db.from("daily_sales_rows").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
