import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity-log";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, paymentId } = await params;
  const db = supabaseAdmin();
  const { data: before } = await db.from("saved_quote_payments").select("amount, payment_type, method").eq("id", paymentId).single();
  const { error } = await db.from("saved_quote_payments").delete().eq("id", paymentId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await logActivity(req, {
    action: "delete",
    entityType: "saved_quote_payment",
    entityId: paymentId,
    summary: `ลบรายการรับเงินเอกสาร #${id} ฿${Number(before?.amount ?? 0).toLocaleString("th-TH")} (${before?.payment_type ?? "-"}, ${before?.method ?? "-"})`,
  });
  return NextResponse.json({ ok: true });
}
