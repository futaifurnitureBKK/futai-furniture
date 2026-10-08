import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { syncStockDeduction } from "@/lib/stock-auto-deduct";
import { logActivity } from "@/lib/activity-log";
import type { DailySalesRow } from "@/types";

// Pulls every row already logged in Daily Sales for a given date into the
// shipping log — the usual flow is "record the sale, then ship it", so this
// is normally the fastest way to fill this page (no need to re-find the
// quotation). Remark carries straight over since both sheets track it, and
// the customer's phone number is used as a starting point for Tel. — but
// "consignee" isn't tracked in Daily Sales, so that one's left blank for the
// shipper to fill in by hand (it's often a different person than the buyer).
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { ship_date } = body;
  if (!ship_date) {
    return NextResponse.json({ error: "ship_date is required" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: salesRows, error: sErr } = await db
    .from("daily_sales_rows")
    .select("*")
    .eq("sale_date", ship_date)
    .order("sort_order", { ascending: true })
    .returns<DailySalesRow[]>();
  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 400 });
  }
  if (!salesRows.length) {
    return NextResponse.json({ error: "ยังไม่มีรายการยอดขายของวันนี้ใน Daily Sales" }, { status: 400 });
  }

  const { count } = await db
    .from("daily_shipping_rows")
    .select("id", { count: "exact", head: true })
    .eq("ship_date", ship_date);
  const startOrder = count ?? 0;

  // Each imported row deducts from StockDEMO independently of whatever
  // Daily Sales already deducted — recording the sale and it actually
  // shipping are tracked as two separate events on purpose.
  const rows = await Promise.all(
    salesRows.map(async (r, i) => {
      const { variantId, deductedQty, field } = await syncStockDeduction(db, {
        previousVariantId: null,
        previousQty: 0,
        previousField: "available",
        newSku: r.sku,
        newQty: r.qty,
        newSizeText: r.size_text,
        fromReserved: false,
      });
      return {
        ship_date,
        sort_order: startOrder + i,
        sku: r.sku,
        image_url: r.image_url,
        size_text: r.size_text,
        qty: r.qty,
        remark: r.remark,
        customer_name: r.customer_name,
        salesperson: r.salesperson,
        po_no: r.po_no,
        consignee: "",
        phone: r.customer_phone,
        source_quote_id: r.source_quote_id,
        stock_variant_id: variantId,
        stock_deducted_qty: deductedQty,
        stock_deducted_field: field,
      };
    })
  );

  const { data, error } = await db.from("daily_shipping_rows").insert(rows).select();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await logActivity(req, {
    action: "create",
    entityType: "daily_shipping_row",
    summary: `ดึงยอดขายวันที่ ${ship_date} เข้ารายการส่งของ (${rows.length} รายการ)`,
  });
  return NextResponse.json({ rows: data });
}
