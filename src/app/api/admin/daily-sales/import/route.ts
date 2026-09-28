import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
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

  const { data, error } = await db
    .from("daily_sales_rows")
    .insert(
      quote.items.map((it, i) => ({
        sale_date,
        sort_order: startOrder + i,
        sku: it.sku || "",
        image_url: it.image || null,
        size_text: it.size || "",
        unit_price: it.unitPrice ?? 0,
        qty: it.qty ?? 1,
        remark: quote.notes || "",
        customer_name: quote.customer_name || "",
        customer_phone: quote.contact_phone || "",
        salesperson: quote.salesperson || null,
        po_no: quote.doc_no || "",
        source_quote_id: quote.id,
      }))
    )
    .select();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ rows: data });
}
