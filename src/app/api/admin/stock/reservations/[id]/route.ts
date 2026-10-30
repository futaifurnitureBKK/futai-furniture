import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity-log";

// Partial release: lowers this entry's qty, leaving the rest open. Full
// release uses DELETE instead. Either way, the caller is responsible for
// reducing stock_variants.reserved / shared_reserved_modules by the same
// amount first (through the existing adjust-reserved routes) — this route
// only ever edits the ledger row itself.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const qty = Number(body.qty);
  if (!Number.isFinite(qty) || qty <= 0) {
    return NextResponse.json({ error: "a positive qty is required" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db.from("stock_reservations").update({ qty }).eq("id", id).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ reservation: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: existing } = await db.from("stock_reservations").select("product_id, qty, note").eq("id", id).single();
  const { error } = await db.from("stock_reservations").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (existing) {
    await logActivity(req, {
      action: "delete",
      entityType: "stock_reservation",
      entityId: id,
      summary: `ปล่อยคืนรายการจอง #${existing.product_id} x${existing.qty}${existing.note ? ` — ${existing.note}` : ""}`,
    });
  }
  return NextResponse.json({ ok: true });
}
