import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

interface CartItemInput {
  sku: string;
  quantity: number;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const itemsInput: CartItemInput[] = Array.isArray(body.items) ? body.items : [];

  if (!name || !phone || !email || itemsInput.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Never trust price/name from the client — look up the authoritative
  // values server-side by SKU so a tampered request can't fake pricing.
  const skus = itemsInput.map((i) => i.sku);
  const { data: products, error: productsError } = await db
    .from("products")
    .select("sku, name_th, price")
    .in("sku", skus);

  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 400 });
  }

  const productBySku = new Map((products ?? []).map((p) => [p.sku, p]));
  const items = itemsInput
    .filter((i) => productBySku.has(i.sku) && Number.isInteger(i.quantity) && i.quantity > 0)
    .map((i) => {
      const p = productBySku.get(i.sku)!;
      return { sku: i.sku, name_snapshot: p.name_th, quantity: i.quantity, price_snapshot: p.price };
    });

  if (items.length === 0) {
    return NextResponse.json({ error: "No valid items" }, { status: 400 });
  }

  const { data: customer, error: customerError } = await db
    .from("customers")
    .insert({
      name,
      company: body.company ?? "",
      phone,
      email,
      line_id: body.line_id ?? "",
      address: body.address ?? "",
    })
    .select()
    .single();

  if (customerError) {
    return NextResponse.json({ error: customerError.message }, { status: 400 });
  }

  const hasUnpriced = items.some((i) => i.price_snapshot == null);
  const total = hasUnpriced ? null : items.reduce((sum, i) => sum + (i.price_snapshot ?? 0) * i.quantity, 0);
  const order_number = `FT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      order_number,
      customer_id: customer.id,
      total,
      delivery_method: body.delivery_method === "pickup" ? "pickup" : "delivery",
      notes: body.notes ?? "",
    })
    .select()
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 400 });
  }

  const { error: itemsError } = await db.from("order_items").insert(
    items.map((i) => ({
      order_id: order.id,
      sku: i.sku,
      name_snapshot: i.name_snapshot,
      quantity: i.quantity,
      price_snapshot: i.price_snapshot,
    }))
  );

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  return NextResponse.json({ order });
}
