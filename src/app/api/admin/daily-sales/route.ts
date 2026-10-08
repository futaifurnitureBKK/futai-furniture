import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity-log";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const date = req.nextUrl.searchParams.get("date");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!date && !(from && to)) {
    return NextResponse.json({ error: "date or from/to is required" }, { status: 400 });
  }
  const db = supabaseAdmin();
  let query = db.from("daily_sales_rows").select("*");
  if (from && to) {
    query = query
      .gte("sale_date", from)
      .lte("sale_date", to)
      .order("sale_date", { ascending: true })
      .order("sort_order", { ascending: true });
  } else {
    query = query.eq("sale_date", date as string).order("sort_order", { ascending: true });
  }
  const { data, error } = await query;
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
  if (!body.sale_date) {
    return NextResponse.json({ error: "sale_date is required" }, { status: 400 });
  }
  const db = supabaseAdmin();

  const { count } = await db
    .from("daily_sales_rows")
    .select("id", { count: "exact", head: true })
    .eq("sale_date", body.sale_date);

  const { data, error } = await db
    .from("daily_sales_rows")
    .insert({
      sale_date: body.sale_date,
      sort_order: count ?? 0,
      sku: body.sku || "",
      image_url: body.image_url || null,
      size_text: body.size_text || "",
      unit_price: body.unit_price ?? 0,
      qty: body.qty ?? 1,
      remark: body.remark || "",
      customer_name: body.customer_name || "",
      customer_phone: body.customer_phone || "",
      salesperson: body.salesperson || null,
      po_no: body.po_no || "",
      source_quote_id: body.source_quote_id ?? null,
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await logActivity(req, {
    action: "create",
    entityType: "daily_sales_row",
    entityId: data.id,
    summary: `เพิ่มยอดขาย ${data.sale_date} SKU ${data.sku || "-"} x${data.qty} ฿${Number(data.unit_price * data.qty).toLocaleString("th-TH")} ลูกค้า ${data.customer_name || "-"}`,
  });
  return NextResponse.json({ row: data });
}
