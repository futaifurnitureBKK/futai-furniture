import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { paymentId } = await params;
  const db = supabaseAdmin();
  const { error } = await db.from("saved_quote_payments").delete().eq("id", paymentId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
