import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("saved_quote_payments")
    .select("*")
    .eq("quote_id", id)
    .order("paid_date", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ payments: data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();

  if (!body.paid_date) {
    return NextResponse.json({ error: "paid_date is required" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("saved_quote_payments")
    .insert({
      quote_id: Number(id),
      paid_date: body.paid_date,
      amount: body.amount ?? 0,
      percent: body.percent ?? null,
      payment_type: body.payment_type || "deposit",
      method: body.method || "transfer",
      slip_url: body.slip_url || null,
      note: body.note || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ payment: data });
}
