import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { ensureItemIds } from "@/lib/quote-item-ids";
import { computeFulfillment } from "@/lib/quote-fulfillment";
import { computeGrandTotal } from "@/lib/saved-quote-options";
import type { SavedQuote } from "@/types";

// Quotations that still have something left to ship — Daily Export's
// customer field searches this (alongside plain Customers) so a round of
// shipping can be pulled straight from the quote instead of retyped.
// Only doc_type "quotation" is in scope, and a quote drops out of this list
// entirely once every line has shipped in full.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  const db = supabaseAdmin();

  const { data: quotes, error } = await db
    .from("saved_quotes")
    .select("id, doc_no, customer_name, doc_date, discount_pct, vat_pct, items")
    .eq("doc_type", "quotation")
    .eq("archived", false)
    .order("doc_date", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!quotes?.length) {
    return NextResponse.json({ quotes: [] });
  }

  const quoteIds = quotes.map((qt) => qt.id);
  const { data: exportRows } = await db
    .from("daily_export_rows")
    .select("quotation_id, quotation_item_id, qty")
    .in("quotation_id", quoteIds);

  const shippedByQuote = new Map<number, Map<string, number>>();
  for (const row of exportRows || []) {
    if (!row.quotation_item_id || row.quotation_id == null) continue;
    if (!shippedByQuote.has(row.quotation_id)) shippedByQuote.set(row.quotation_id, new Map());
    const m = shippedByQuote.get(row.quotation_id)!;
    m.set(row.quotation_item_id, (m.get(row.quotation_item_id) || 0) + Number(row.qty));
  }

  const results: {
    id: number;
    doc_no: string;
    customer_name: string;
    doc_date: string;
    total: number;
    orderedUnits: number;
    shippedUnits: number;
    status: "not_shipped" | "partial";
  }[] = [];

  for (const quote of quotes as Pick<SavedQuote, "id" | "doc_no" | "customer_name" | "doc_date" | "discount_pct" | "vat_pct" | "items">[]) {
    const items = await ensureItemIds(db, quote);
    const { orderedUnits, shippedUnits, status } = computeFulfillment(items, shippedByQuote.get(quote.id) || new Map());
    if (status === "complete") continue;
    if (q && !`${quote.doc_no} ${quote.customer_name}`.toLowerCase().includes(q)) continue;

    results.push({
      id: quote.id,
      doc_no: quote.doc_no,
      customer_name: quote.customer_name,
      doc_date: quote.doc_date,
      total: computeGrandTotal(items, quote.discount_pct, quote.vat_pct),
      orderedUnits,
      shippedUnits,
      status,
    });
    if (results.length >= 20) break;
  }

  return NextResponse.json({ quotes: results });
}
