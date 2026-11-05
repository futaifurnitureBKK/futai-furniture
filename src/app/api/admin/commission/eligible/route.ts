import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { computeGrandTotal } from "@/lib/saved-quote-options";
import type { Lead, SavedQuoteItem } from "@/types";

const NO_OWNER = "__none";

export interface EligibleOrder {
  leadId: number;
  customerName: string;
  closedDate: string;
  channel: string;
  dealValue: number;
  baseAmount: number;
  baseIsEstimate: boolean;
  eligible: boolean;
  reason: string | null;
  sourceQuoteId: number | null;
}

// Converted leads for one owner + date range, each priced at the base the
// caller asked for (ex/inc VAT) and flagged with whether it can actually be
// put into a new batch — already-paid-out and still-unpaid orders are
// surfaced but pre-unchecked, with the reason shown, instead of silently
// left out (so a confused "why is this missing" never happens).
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner") || "all";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const base = searchParams.get("base") === "inc_vat" ? "inc_vat" : "ex_vat";

  const db = supabaseAdmin();
  const { data: leadsData, error } = await db.from("leads").select("*").eq("status", "converted");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Filtered by lead_date, not converted_at — matches Sales Detail's own
  // filter exactly (src/app/admin/(dashboard)/AdminFutai/sales-detail/page.tsx),
  // which is the page this batch's numbers have to reconcile with. Using
  // converted_at here (as this route originally did) pulled in leads whose
  // conversion date fell in range but lead_date didn't, producing a bigger
  // "eligible" total than what Sales Detail showed for the same owner/range.
  const leads = (leadsData as Lead[])
    .filter((l) => !from || !to || (l.lead_date >= from && l.lead_date <= to))
    .filter((l) => owner === "all" || (owner === NO_OWNER ? !l.owner : l.owner === owner));

  if (!leads.length) {
    return NextResponse.json({ orders: [] satisfies EligibleOrder[] });
  }

  const quoteIds = leads.map((l) => l.source_quote_id).filter((id): id is number => id != null);
  const quotesById = new Map<number, { discount_pct: number; vat_pct: number; items: SavedQuoteItem[] }>();
  const paidByQuote = new Map<number, number>();
  if (quoteIds.length) {
    const { data: quotes } = await db
      .from("saved_quotes")
      .select("id, discount_pct, vat_pct, items")
      .in("id", quoteIds);
    for (const q of quotes || []) quotesById.set(q.id, q);

    const { data: payments } = await db.from("saved_quote_payments").select("quote_id, amount").in("quote_id", quoteIds);
    for (const p of payments || []) paidByQuote.set(p.quote_id, (paidByQuote.get(p.quote_id) ?? 0) + Number(p.amount));
  }

  const leadIds = leads.map((l) => l.id);
  const { data: existingItems } = await db
    .from("commission_items")
    .select("lead_id, batch_id, commission_batches!inner(id, status, period_from, period_to)")
    .in("lead_id", leadIds)
    .neq("commission_batches.status", "cancelled");
  const claimedByLead = new Map<number, { batchId: number; periodFrom: string; periodTo: string }>();
  for (const row of (existingItems || []) as unknown as {
    lead_id: number;
    batch_id: number;
    commission_batches: { period_from: string; period_to: string } | { period_from: string; period_to: string }[];
  }[]) {
    const batch = Array.isArray(row.commission_batches) ? row.commission_batches[0] : row.commission_batches;
    if (batch) claimedByLead.set(row.lead_id, { batchId: row.batch_id, periodFrom: batch.period_from, periodTo: batch.period_to });
  }

  // A lead's underlying quotation can also have been pulled into a batch
  // directly (by quote-search, source_quote_id — see quote-search/route.ts),
  // bypassing lead_id entirely. Without this check that same sale could be
  // claimed a second time here through its lead.
  const claimedByQuoteBatch = new Map<number, number>();
  if (quoteIds.length) {
    const { data: quoteClaims } = await db
      .from("commission_items")
      .select("source_quote_id, batch_id, commission_batches!inner(status)")
      .in("source_quote_id", quoteIds)
      .neq("commission_batches.status", "cancelled");
    for (const row of (quoteClaims || []) as { source_quote_id: number | null; batch_id: number }[]) {
      if (row.source_quote_id != null) claimedByQuoteBatch.set(row.source_quote_id, row.batch_id);
    }
  }

  const orders: EligibleOrder[] = leads.map((l) => {
    const quote = l.source_quote_id != null ? quotesById.get(l.source_quote_id) : undefined;
    const dealValue = l.deal_value ?? 0;

    let baseAmount = dealValue;
    let baseIsEstimate = true;
    if (quote) {
      const subtotal = quote.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
      const afterDiscount = subtotal - subtotal * (quote.discount_pct / 100);
      baseAmount = base === "ex_vat" ? afterDiscount : computeGrandTotal(quote.items, quote.discount_pct, quote.vat_pct);
      baseIsEstimate = false;
    } else if (base === "ex_vat") {
      // No linked quotation to read a real VAT % from — approximate at 7%
      // rather than quietly use the full deal value as the base.
      baseAmount = dealValue / 1.07;
    }

    let eligible = true;
    let reason: string | null = null;

    const claim = claimedByLead.get(l.id);
    const quoteClaimBatch = l.source_quote_id != null ? claimedByQuoteBatch.get(l.source_quote_id) : undefined;
    if (claim) {
      eligible = false;
      reason = `คิดไปแล้วในรอบ ${claim.periodFrom} → ${claim.periodTo} (#${claim.batchId})`;
    } else if (quoteClaimBatch != null) {
      eligible = false;
      reason = `ใบเสนอราคานี้ถูกเพิ่มเข้ารอบอื่นแล้ว (#${quoteClaimBatch})`;
    } else if (quote) {
      const total = computeGrandTotal(quote.items, quote.discount_pct, quote.vat_pct);
      const paid = paidByQuote.get(l.source_quote_id as number) ?? 0;
      if (total - paid > 0.5) {
        eligible = false;
        reason = "ยังค้างชำระ";
      }
    } else if (l.paid_pct != null && l.paid_pct < 100) {
      eligible = false;
      reason = "ยังค้างชำระ";
    }

    return {
      leadId: l.id,
      customerName: l.customer_name,
      closedDate: (l.converted_at || l.lead_date).slice(0, 10),
      channel: l.channel,
      dealValue,
      baseAmount: Math.round(baseAmount * 100) / 100,
      baseIsEstimate,
      eligible,
      reason,
      sourceQuoteId: l.source_quote_id,
    };
  });

  orders.sort((a, b) => a.closedDate.localeCompare(b.closedDate));
  return NextResponse.json({ orders });
}
