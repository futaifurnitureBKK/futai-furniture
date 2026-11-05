import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { computeGrandTotal } from "@/lib/saved-quote-options";
import type { SavedQuoteItem } from "@/types";

export interface QuoteSearchResult {
  quoteId: number;
  docNo: string;
  customerName: string;
  closedDate: string;
  channel: string;
  baseAmount: number;
  alreadyClaimed: boolean;
  reason: string | null;
}

// Lets staff pull ANY saved quotation/invoice into a commission batch —
// regardless of whether it has a matching "converted" lead, or which
// salesperson the lead (if any) is filed under — for the case where the
// automatic "eligible orders" list (built from leads) misses something
// that should still count. Matches by doc_no or customer_name.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const base = searchParams.get("base") === "inc_vat" ? "inc_vat" : "ex_vat";
  if (q.length < 2) {
    return NextResponse.json({ results: [] satisfies QuoteSearchResult[] });
  }

  const db = supabaseAdmin();
  const { data: quotes, error } = await db
    .from("saved_quotes")
    .select("id, doc_no, doc_date, customer_name, channel, items, discount_pct, vat_pct")
    .eq("archived", false)
    .in("doc_type", ["quotation", "invoice"])
    .or(`doc_no.ilike.%${q}%,customer_name.ilike.%${q}%`)
    .order("doc_date", { ascending: false })
    .limit(20);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!quotes?.length) {
    return NextResponse.json({ results: [] satisfies QuoteSearchResult[] });
  }

  const quoteIds = quotes.map((q) => q.id);

  // A quote already sitting in an active batch — whether added here
  // (source_quote_id) or through its lead (lead_id, via the lead's own
  // source_quote_id) — must not be offered again, or the same sale could
  // get paid out twice.
  const { data: directClaims } = await db
    .from("commission_items")
    .select("source_quote_id, batch_id, commission_batches!inner(status)")
    .in("source_quote_id", quoteIds)
    .neq("commission_batches.status", "cancelled");
  const claimedQuoteIds = new Map<number, number>();
  for (const row of (directClaims || []) as { source_quote_id: number | null; batch_id: number }[]) {
    if (row.source_quote_id != null) claimedQuoteIds.set(row.source_quote_id, row.batch_id);
  }

  const { data: linkedLeads } = await db.from("leads").select("id, source_quote_id").in("source_quote_id", quoteIds);
  const leadIdByQuote = new Map<number, number>();
  for (const l of linkedLeads || []) if (l.source_quote_id != null) leadIdByQuote.set(l.source_quote_id, l.id);
  const leadIds = [...leadIdByQuote.values()];
  const indirectClaimByLead = new Map<number, number>();
  if (leadIds.length) {
    const { data: indirectClaims } = await db
      .from("commission_items")
      .select("lead_id, batch_id, commission_batches!inner(status)")
      .in("lead_id", leadIds)
      .neq("commission_batches.status", "cancelled");
    for (const row of (indirectClaims || []) as { lead_id: number | null; batch_id: number }[]) {
      if (row.lead_id != null) indirectClaimByLead.set(row.lead_id, row.batch_id);
    }
  }

  const results: QuoteSearchResult[] = quotes.map((quote) => {
    const items = quote.items as SavedQuoteItem[];
    const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
    const afterDiscount = subtotal - subtotal * (quote.discount_pct / 100);
    const baseAmount = base === "ex_vat" ? afterDiscount : computeGrandTotal(items, quote.discount_pct, quote.vat_pct);

    let alreadyClaimed = false;
    let reason: string | null = null;
    const directBatch = claimedQuoteIds.get(quote.id);
    const leadId = leadIdByQuote.get(quote.id);
    const indirectBatch = leadId != null ? indirectClaimByLead.get(leadId) : undefined;
    if (directBatch != null) {
      alreadyClaimed = true;
      reason = `คิดไปแล้วในรอบ #${directBatch}`;
    } else if (indirectBatch != null) {
      alreadyClaimed = true;
      reason = `คิดไปแล้วผ่านลีดที่ลิงก์ไว้ ในรอบ #${indirectBatch}`;
    }

    return {
      quoteId: quote.id,
      docNo: quote.doc_no,
      customerName: quote.customer_name,
      closedDate: quote.doc_date,
      channel: quote.channel,
      baseAmount: Math.round(baseAmount * 100) / 100,
      alreadyClaimed,
      reason,
    };
  });

  return NextResponse.json({ results });
}
