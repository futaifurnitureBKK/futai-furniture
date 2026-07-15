import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const product_sku = typeof body.product_sku === "string" ? body.product_sku.trim() : "";

  if (!name || !phone || !email || !product_sku) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Look up the real product name server-side rather than trusting the client.
  const { data: product } = await db.from("products").select("name_th").eq("sku", product_sku).maybeSingle();
  if (!product) {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }

  const { data, error } = await db
    .from("quotes")
    .insert({
      product_sku,
      product_name_snapshot: product.name_th,
      name,
      company: body.company ?? "",
      phone,
      email,
      line_id: body.line_id ?? "",
      quantity: Number.isInteger(Number(body.quantity)) && Number(body.quantity) > 0 ? Number(body.quantity) : 1,
      message: body.message ?? "",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ quote: data });
}
