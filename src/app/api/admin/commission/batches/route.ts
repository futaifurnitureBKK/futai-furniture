import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity-log";
import { calcCommission, type CommissionBase, type CommissionMode } from "@/lib/commission";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner");

  const db = supabaseAdmin();
  let query = db.from("commission_batches").select("*, commission_splits(*)").order("created_at", { ascending: false });
  if (owner) query = query.eq("owner", owner);
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ batches: data });
}

interface CreateBatchItem {
  // Exactly one of the two must be set — a normal auto-detected order
  // (converted lead) has leadId; one added by hand via the quotation
  // search (no matching lead, or deliberately added regardless of its
  // lead) has sourceQuoteId instead.
  leadId?: number | null;
  sourceQuoteId?: number | null;
  customerName: string;
  closedDate: string;
  baseAmount: number;
  deduction?: number;
  note?: string;
}

// Saves a new draft batch with the items the staff ticked in the preview
// screen. Re-validates against commission_items itself (not just trusting
// what the client sent) so an order already claimed by another batch
// created moments earlier can't be double-paid.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const owner = body.owner as string | undefined;
  const periodFrom = body.periodFrom as string | undefined;
  const periodTo = body.periodTo as string | undefined;
  const mode = (body.mode as CommissionMode) || "cumulative";
  const base = (body.base as CommissionBase) || "ex_vat";
  const items = (body.items || []) as CreateBatchItem[];

  if (!owner || !periodFrom || !periodTo || !items.length) {
    return NextResponse.json({ error: "owner, periodFrom, periodTo, items are required" }, { status: 400 });
  }
  if (items.some((it) => it.leadId == null && it.sourceQuoteId == null)) {
    return NextResponse.json({ error: "แต่ละรายการต้องมี leadId หรือ sourceQuoteId อย่างน้อยหนึ่งอย่าง" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const leadIds = items.map((it) => it.leadId).filter((v): v is number => v != null);
  const quoteIds = items.map((it) => it.sourceQuoteId).filter((v): v is number => v != null);
  const [leadClaims, quoteClaims] = await Promise.all([
    leadIds.length
      ? db.from("commission_items").select("lead_id, commission_batches!inner(status)").in("lead_id", leadIds).neq("commission_batches.status", "cancelled")
      : Promise.resolve({ data: [] as unknown[] }),
    quoteIds.length
      ? db
          .from("commission_items")
          .select("source_quote_id, commission_batches!inner(status)")
          .in("source_quote_id", quoteIds)
          .neq("commission_batches.status", "cancelled")
      : Promise.resolve({ data: [] as unknown[] }),
  ]);
  const claimedCount = (leadClaims.data?.length || 0) + (quoteClaims.data?.length || 0);
  if (claimedCount) {
    return NextResponse.json(
      { error: `ออเดอร์ ${claimedCount} รายการถูกคิดค่าคอมไปแล้วในรอบอื่น กรุณารีเฟรชหน้านี้แล้วลองใหม่` },
      { status: 409 }
    );
  }

  // calcCommission preserves order 1:1 with what's passed in, so `computed`
  // lines up with `items` by array position — no id scheme needed to zip
  // them back together, which matters now that an item might have neither
  // a leadId nor be distinguishable by one alone.
  const net = items.map((it, idx) => ({ id: idx, amount: Math.max(0, it.baseAmount - (it.deduction || 0)) }));
  const computed = calcCommission(net, mode);

  const totalBase = items.reduce((s, it) => s + it.baseAmount, 0);
  const totalCommission = computed.reduce((s, c) => s + c.commission, 0);

  const { data: batch, error: batchErr } = await db
    .from("commission_batches")
    .insert({
      owner,
      period_from: periodFrom,
      period_to: periodTo,
      mode,
      base,
      status: "draft",
      total_base: totalBase,
      total_commission: totalCommission,
      note: body.note || "",
    })
    .select()
    .single();
  if (batchErr) {
    return NextResponse.json({ error: batchErr.message }, { status: 400 });
  }

  const rows = items.map((it, idx) => {
    const c = computed[idx];
    return {
      batch_id: batch.id,
      lead_id: it.leadId ?? null,
      source_quote_id: it.sourceQuoteId ?? null,
      customer_name: it.customerName,
      closed_date: it.closedDate,
      base_amount: it.baseAmount,
      deduction: it.deduction || 0,
      rate: c.rate,
      commission: c.commission,
      note: it.note || "",
    };
  });
  const { error: itemsErr } = await db.from("commission_items").insert(rows);
  if (itemsErr) {
    await db.from("commission_batches").delete().eq("id", batch.id);
    return NextResponse.json({ error: itemsErr.message }, { status: 400 });
  }

  await logActivity(req, {
    action: "create",
    entityType: "commission_batch",
    entityId: batch.id,
    summary: `สร้างรอบคิดค่าคอม ${owner} (${periodFrom} → ${periodTo}) ${items.length} ออเดอร์ รวม ฿${totalCommission.toFixed(2)}`,
  });

  return NextResponse.json({ batch });
}
