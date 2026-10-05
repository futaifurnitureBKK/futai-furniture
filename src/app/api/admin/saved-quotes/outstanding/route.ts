import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { ensureItemIds } from "@/lib/quote-item-ids";
import { computeFulfillment } from "@/lib/quote-fulfillment";
import { computeGrandTotal } from "@/lib/saved-quote-options";
import type { SavedQuote } from "@/types";

// Quotations that still have something left to ship. Daily Export's
// top-level "pull from quotation" button searches this with no `sku`
// (any outstanding quote, up to 20). Each row's own customer field instead
// passes `sku`, which narrows this to quotes that still owe that exact
// item — and reports shipped/remaining for that line alone, not the whole
// quote, since a row can only ever bind to one line.
// Only doc_type "quotation" is in scope, and a quote drops out of this list
// entirely once every line (or every matching line, with `sku`) has shipped
// in full.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  const sku = (req.nextUrl.searchParams.get("sku") || "").trim();
  const limit = sku ? 8 : 20;
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
    discount_pct: number;
    orderedUnits: number;
    shippedUnits: number;
    status: "not_shipped" | "partial";
    matchingItems?: { item_id: string; size: string; qty: number; shipped: number; remaining: number; unitPrice: number }[];
  }[] = [];

  for (const quote of quotes as Pick<SavedQuote, "id" | "doc_no" | "customer_name" | "doc_date" | "discount_pct" | "vat_pct" | "items">[]) {
    const items = await ensureItemIds(db, quote);
    const shippedByItemId = shippedByQuote.get(quote.id) || new Map();

    if (sku) {
      const skuItems = items.filter((it) => (it.sku || "").trim() === sku);
      if (!skuItems.length) continue;
      const { perItem } = computeFulfillment(skuItems, shippedByItemId);
      const matchingItems = perItem
        .map((p) => {
          const it = skuItems.find((i) => i.item_id === p.item_id)!;
          return { item_id: p.item_id, size: it.size, qty: it.qty, shipped: p.shipped, remaining: p.remaining, unitPrice: it.unitPrice };
        })
        .filter((m) => m.remaining > 0);
      if (!matchingItems.length) continue;
      if (q && !`${quote.doc_no} ${quote.customer_name}`.toLowerCase().includes(q)) continue;

      results.push({
        id: quote.id,
        doc_no: quote.doc_no,
        customer_name: quote.customer_name,
        doc_date: quote.doc_date,
        total: computeGrandTotal(items, quote.discount_pct, quote.vat_pct),
        discount_pct: quote.discount_pct,
        orderedUnits: 0,
        shippedUnits: 0,
        status: "partial",
        matchingItems,
      });
    } else {
      const { orderedUnits, shippedUnits, status } = computeFulfillment(items, shippedByItemId);
      if (status === "complete") continue;
      if (q && !`${quote.doc_no} ${quote.customer_name}`.toLowerCase().includes(q)) continue;

      results.push({
        id: quote.id,
        doc_no: quote.doc_no,
        customer_name: quote.customer_name,
        doc_date: quote.doc_date,
        total: computeGrandTotal(items, quote.discount_pct, quote.vat_pct),
        discount_pct: quote.discount_pct,
        orderedUnits,
        shippedUnits,
        status,
      });
    }
    if (results.length >= limit) break;
  }

  return NextResponse.json({ quotes: results });
}
