import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

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
  let query = db.from("daily_export_rows").select("*");
  if (from && to) {
    query = query
      .gte("export_date", from)
      .lte("export_date", to)
      .order("export_date", { ascending: true })
      .order("sort_order", { ascending: true });
  } else {
    query = query.eq("export_date", date as string).order("sort_order", { ascending: true });
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ rows: data });
}

// A row always arrives already pointing at one exact stock_variants row (the
// picker requires one to be chosen first) — so the deduction happens right
// here at creation, unlike Daily Sales/Shipping which start blank.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { export_date, stock_variant_id, sku, size_text, image_url } = body;
  if (!export_date || !stock_variant_id) {
    return NextResponse.json({ error: "export_date and stock_variant_id are required" }, { status: 400 });
  }
  const qty = Number(body.qty) || 1;

  const db = supabaseAdmin();

  const { data: variant } = await db.from("stock_variants").select("available").eq("id", stock_variant_id).single();
  if (!variant) {
    return NextResponse.json({ error: "ไม่พบสินค้านี้ในสต็อก" }, { status: 404 });
  }
  await db.from("stock_variants").update({ available: variant.available - qty }).eq("id", stock_variant_id);

  const { count } = await db
    .from("daily_export_rows")
    .select("id", { count: "exact", head: true })
    .eq("export_date", export_date);

  const { data, error } = await db
    .from("daily_export_rows")
    .insert({
      export_date,
      sort_order: count ?? 0,
      stock_variant_id,
      sku: sku || "",
      size_text: size_text || "",
      image_url: image_url || null,
      qty,
      remark: "",
      customer_name: "",
      salesperson: null,
      po_no: "",
      stock_deducted_qty: qty,
    })
    .select()
    .single();
  if (error) {
    // Roll back the deduction so a failed insert never leaves stock short.
    await db.from("stock_variants").update({ available: variant.available }).eq("id", stock_variant_id);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ row: data });
}
