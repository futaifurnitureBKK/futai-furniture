import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const archived = req.nextUrl.searchParams.get("archived") === "true";
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("saved_quotes")
    .select(
      "id, doc_type, doc_no, customer_name, doc_date, status, archived, channel, shipping_date, shipping_address, contact_person, contact_phone, salesperson, notes, items, discount_pct, vat_pct, deposit_pct, updated_at, saved_quote_payments(id, paid_date, amount, percent, payment_type, method, slip_url)"
    )
    .eq("archived", archived)
    .order("updated_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ quotes: data });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();

  if (!body.doc_type || !body.doc_no) {
    return NextResponse.json({ error: "doc_type and doc_no are required" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("saved_quotes")
    .insert({
      doc_type: body.doc_type,
      doc_no: body.doc_no,
      channel: body.channel || "other",
      lang_mode: body.lang_mode || "th-en-zh",
      doc_date: body.doc_date,
      customer_name: body.customer_name || "",
      customer_address: body.customer_address || "",
      customer_tax_id: body.customer_tax_id || "",
      shipping_address: body.shipping_address || "",
      shipping_date: body.shipping_date || null,
      contact_person: body.contact_person || "",
      contact_phone: body.contact_phone || "",
      salesperson: body.salesperson || null,
      notes: body.notes || "",
      terms_text: body.terms_text || null,
      discount_pct: body.discount_pct ?? 0,
      vat_pct: body.vat_pct ?? 7,
      deposit_pct: body.deposit_pct ?? 50,
      items: body.items || [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ quote: data });
}
