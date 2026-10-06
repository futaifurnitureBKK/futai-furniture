import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { adjustVariantField } from "@/lib/shared-stock";
import type { SavedQuoteItem } from "@/types";

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
  const unitPrice = Number(body.unit_price) || 0;
  const quotationId: number | null = body.quotation_id ? Number(body.quotation_id) : null;
  const quotationItemId: string | null = body.quotation_item_id || null;

  const db = supabaseAdmin();

  // Pulled from a quotation line — never let this exceed what's still
  // outstanding on that exact line, no matter what qty the client sends.
  if (quotationId && quotationItemId) {
    const { data: quote } = await db.from("saved_quotes").select("items").eq("id", quotationId).single();
    const item = (quote?.items as SavedQuoteItem[] | undefined)?.find((it) => it.item_id === quotationItemId);
    if (!item) {
      return NextResponse.json({ error: "ไม่พบรายการนี้ในใบเสนอราคา" }, { status: 404 });
    }
    const { data: shippedRows } = await db
      .from("daily_export_rows")
      .select("qty")
      .eq("quotation_id", quotationId)
      .eq("quotation_item_id", quotationItemId);
    const alreadyShipped = (shippedRows || []).reduce((sum, r) => sum + Number(r.qty), 0);
    if (alreadyShipped + qty > item.qty) {
      return NextResponse.json({ error: "จำนวนเกินยอดค้างส่งของรายการนี้ในใบเสนอราคา" }, { status: 400 });
    }
  }

  // Atomic (see adjust_stock_variant_available / adjust_shared_stock_modules)
  // so two staff picking the last unit at the same instant can't both get
  // through — and, for a shared-stock product, deducts the whole module
  // pool so every sibling size's cached count updates together.
  const deduct = await adjustVariantField(db, stock_variant_id, "available", -qty);
  if (!deduct.ok) {
    return NextResponse.json({ error: `สต็อก ${sku || ""} ${size_text || ""} เหลือไม่พอ`.trim() }, { status: 409 });
  }

  // Picking a size that's already a row for this date just tops up that
  // row's qty instead of creating a duplicate — but only within the same
  // origin (two plain picks merge; a quotation line only merges with an
  // earlier pick of that exact same line), so each quotation item's
  // shipped/remaining stays attributable to that item alone.
  let mergeQuery = db.from("daily_export_rows").select("*").eq("export_date", export_date).eq("stock_variant_id", stock_variant_id);
  mergeQuery = quotationItemId ? mergeQuery.eq("quotation_item_id", quotationItemId) : mergeQuery.is("quotation_item_id", null);
  const { data: existing } = await mergeQuery.maybeSingle();

  if (existing) {
    const { data, error } = await db
      .from("daily_export_rows")
      .update({
        qty: existing.qty + qty,
        stock_deducted_qty: existing.stock_deducted_qty + qty,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) {
      await adjustVariantField(db, stock_variant_id, "available", qty);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ row: data });
  }

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
      unit_price: unitPrice,
      discount_pct: Number(body.discount_pct) || 0,
      // Rows pulled from a quotation default to B2B/project unless the
      // caller says otherwise — that's overwhelmingly what a quotation is.
      channel: body.channel || (quotationId ? "b2b" : null),
      remark: body.remark || "",
      customer_name: body.customer_name || "",
      salesperson: body.salesperson || null,
      po_no: body.po_no || "",
      quotation_id: quotationId,
      quotation_item_id: quotationItemId,
      stock_deducted_qty: qty,
    })
    .select()
    .single();
  if (error) {
    // Roll back the deduction so a failed insert never leaves stock short.
    await adjustVariantField(db, stock_variant_id, "available", qty);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ row: data });
}
