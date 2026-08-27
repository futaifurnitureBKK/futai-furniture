import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db.from("leads").select("*").order("lead_date", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ leads: data });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();

  if (!body.customer_name || !body.channel) {
    return NextResponse.json({ error: "customer_name and channel are required" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("leads")
    .insert({
      lead_date: body.lead_date || new Date().toISOString().slice(0, 10),
      customer_name: body.customer_name,
      channel: body.channel,
      segment: body.segment || "b2c",
      sku: body.sku || null,
      status: body.status || "new",
      contact_method: body.contact_method || null,
      notes: body.notes || "",
      next_followup_date: body.next_followup_date || null,
      deal_value: body.deal_value ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ lead: data });
}
