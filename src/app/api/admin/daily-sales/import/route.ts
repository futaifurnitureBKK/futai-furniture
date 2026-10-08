import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { syncStockDeduction } from "@/lib/stock-auto-deduct";
import { logActivity } from "@/lib/activity-log";
import type { SavedQuote } from "@/types";

// Pulls every line item of a saved quotation into the daily sales log for a
// given date — the whole point being nobody has to retype what's already in
// the quote.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { sale_date, quote_id } = body;
  if (!sale_date || !quote_id) {
    return NextResponse.json({ error: "sale_date and quote_id are required" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: quote, error: qErr } = await db
    .from("saved_quotes")
    .select("*")
    .eq("id", quote_id)
    .single<SavedQuote>();
  if (qErr || !quote) {
    return NextResponse.json({ error: qErr?.message ?? "Quote not found" }, { status: 404 });
  }
  if (!quote.items.length) {
    return NextResponse.json({ error: "ใบเสนอราคานี้ไม่มีรายการสินค้า" }, { status: 400 });
  }

  const { count } = await db
    .from("daily_sales_rows")
    .select("id", { count: "exact", head: true })
    .eq("sale_date", sale_date);
  const startOrder = count ?? 0;

  // Each imported row deducts from StockDEMO the same way a manually-typed
  // one does — see syncStockDeduction.
  const rows = await Promise.all(
    quote.items.map(async (it, i) => {
      const sku = it.sku || "";
      const qty = it.qty ?? 1;
      const { variantId, deductedQty, field } = await syncStockDeduction(db, {
        previousVariantId: null,
        previousQty: 0,
        previousField: "available",
        newSku: sku,
        newQty: qty,
        newSizeText: it.size || "",
        fromReserved: false,
      });
      return {
        sale_date,
        sort_order: startOrder + i,
        sku,
        image_url: it.image || null,
        size_text: it.size || "",
        unit_price: it.unitPrice ?? 0,
        qty,
        remark: quote.notes || "",
        customer_name: quote.customer_name || "",
        customer_phone: quote.contact_phone || "",
        salesperson: quote.salesperson || null,
        po_no: quote.doc_no || "",
        source_quote_id: quote.id,
        stock_variant_id: variantId,
        stock_deducted_qty: deductedQty,
        stock_deducted_field: field,
      };
    })
  );

  const { data, error } = await db.from("daily_sales_rows").insert(rows).select();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await logActivity(req, {
    action: "create",
    entityType: "daily_sales_row",
    entityId: quote_id,
    summary: `ดึงใบเสนอราคา ${quote.doc_no} เข้ายอดขายวันที่ ${sale_date} (${rows.length} รายการ)`,
  });
  return NextResponse.json({ rows: data });
}
