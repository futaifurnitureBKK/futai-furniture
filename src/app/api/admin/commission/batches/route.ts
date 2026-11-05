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
  leadId: number;
  customerName: string;
  closedDate: string;
  baseAmount: number;
  deduction?: number;
  note?: string;
}

// Saves a new draft batch with the items the staff ticked in the preview
// screen. Re-validates against commission_items itself (not just trusting
// what the client sent) so a lead already claimed by another batch created
// moments earlier can't be double-paid.
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

  const db = supabaseAdmin();

  const leadIds = items.map((it) => it.leadId);
  const { data: alreadyClaimed } = await db
    .from("commission_items")
    .select("lead_id, batch_id, commission_batches!inner(status)")
    .in("lead_id", leadIds)
    .neq("commission_batches.status", "cancelled");
  if (alreadyClaimed?.length) {
    return NextResponse.json(
      { error: `ออเดอร์ ${alreadyClaimed.length} รายการถูกคิดค่าคอมไปแล้วในรอบอื่น กรุณารีเฟรชหน้านี้แล้วลองใหม่` },
      { status: 409 }
    );
  }

  const net = items.map((it) => ({ id: it.leadId, amount: Math.max(0, it.baseAmount - (it.deduction || 0)) }));
  const computed = calcCommission(net, mode);
  const commissionByLead = new Map(computed.map((c) => [c.id, c]));

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

  const rows = items.map((it) => {
    const c = commissionByLead.get(it.leadId)!;
    return {
      batch_id: batch.id,
      lead_id: it.leadId,
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
