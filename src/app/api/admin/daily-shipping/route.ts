import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("daily_shipping_rows")
    .select("*")
    .eq("ship_date", date)
    .order("sort_order", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ rows: data });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (!body.ship_date) {
    return NextResponse.json({ error: "ship_date is required" }, { status: 400 });
  }
  const db = supabaseAdmin();

  const { count } = await db
    .from("daily_shipping_rows")
    .select("id", { count: "exact", head: true })
    .eq("ship_date", body.ship_date);

  const { data, error } = await db
    .from("daily_shipping_rows")
    .insert({
      ship_date: body.ship_date,
      sort_order: count ?? 0,
      sku: body.sku || "",
      image_url: body.image_url || null,
      size_text: body.size_text || "",
      qty: body.qty ?? 1,
      remark: body.remark || "",
      customer_name: body.customer_name || "",
      salesperson: body.salesperson || null,
      po_no: body.po_no || "",
      consignee: body.consignee || "",
      phone: body.phone || "",
      source_quote_id: body.source_quote_id ?? null,
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ row: data });
}
