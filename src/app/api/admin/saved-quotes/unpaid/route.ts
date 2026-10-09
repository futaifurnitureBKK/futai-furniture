import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { computeGrandTotal } from "@/lib/saved-quote-options";
import type { SavedQuoteItem } from "@/types";

// Quotations with a real balance still outstanding — derived straight from
// the payment slips already logged on each quote (saved_quote_payments),
// not a manually-set flag, so this list can never drift out of sync with
// what's actually been paid. "Outstanding" means at least one payment has
// been logged (a deposit slip was uploaded) but the running total is still
// short of the quote's grand total; a quote with zero payments logged yet
// isn't shown here — that's just "not started", not "ค้างชำระ".
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();

  const { data: quotes, error } = await db
    .from("saved_quotes")
    .select("id, doc_no, customer_name, doc_date, salesperson, discount_pct, vat_pct, items")
    .eq("doc_type", "quotation")
    .eq("archived", false);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!quotes?.length) {
    return NextResponse.json({ quotes: [] });
  }

  const quoteIds = quotes.map((q) => q.id);
  const { data: payments, error: payErr } = await db
    .from("saved_quote_payments")
    .select("quote_id, amount, paid_date")
    .in("quote_id", quoteIds);
  if (payErr) {
    return NextResponse.json({ error: payErr.message }, { status: 400 });
  }

  const paidByQuote = new Map<number, { total: number; lastPaidDate: string | null }>();
  for (const p of payments || []) {
    const cur = paidByQuote.get(p.quote_id) || { total: 0, lastPaidDate: null };
    cur.total += Number(p.amount);
    if (!cur.lastPaidDate || p.paid_date > cur.lastPaidDate) cur.lastPaidDate = p.paid_date;
    paidByQuote.set(p.quote_id, cur);
  }

  const results = quotes
    .map((q) => {
      const items = (q.items || []) as SavedQuoteItem[];
      const total = computeGrandTotal(items, q.discount_pct, q.vat_pct);
      const paid = paidByQuote.get(q.id);
      const totalPaid = paid?.total ?? 0;
      return {
        id: q.id,
        doc_no: q.doc_no,
        customer_name: q.customer_name,
        doc_date: q.doc_date,
        salesperson: q.salesperson,
        total,
        totalPaid,
        remaining: total - totalPaid,
        paidPct: total > 0 ? (totalPaid / total) * 100 : 0,
        lastPaidDate: paid?.lastPaidDate ?? null,
      };
    })
    // Something's been paid but it's short of the full total — a quote with
    // no payments at all isn't "outstanding", just not started yet.
    .filter((r) => r.totalPaid > 0 && r.remaining > 0.5)
    .sort((a, b) => (a.lastPaidDate ?? "").localeCompare(b.lastPaidDate ?? ""));

  return NextResponse.json({ quotes: results });
}
