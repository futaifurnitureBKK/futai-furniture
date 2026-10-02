import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import type { SavedQuoteItem } from "@/types";

function normalizeSku(sku: string) {
  return sku.trim().toLowerCase();
}

// One-off backfill: a stock product with no photo yet borrows one from a
// saved quotation's line item that shares its SKU, as a stand-in until a
// real product photo is taken. Never overwrites a photo a product already
// has, and prefers the most recently saved quote when a SKU appears in more
// than one.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();

  const { data: quotes, error: quotesErr } = await db
    .from("saved_quotes")
    .select("id, items")
    .order("id", { ascending: false });
  if (quotesErr) {
    return NextResponse.json({ error: quotesErr.message }, { status: 400 });
  }

  const imageBySku = new Map<string, string>();
  for (const q of (quotes ?? []) as { id: number; items: SavedQuoteItem[] }[]) {
    for (const item of q.items ?? []) {
      if (!item.sku || !item.image) continue;
      const key = normalizeSku(item.sku);
      if (!imageBySku.has(key)) imageBySku.set(key, item.image);
    }
  }

  const { data: products, error: productsErr } = await db
    .from("stock_products")
    .select("id, code, image_url")
    .or("image_url.is.null,image_url.eq.");
  if (productsErr) {
    return NextResponse.json({ error: productsErr.message }, { status: 400 });
  }

  const updates = (products ?? [])
    .map((p) => ({ id: p.id as number, image: imageBySku.get(normalizeSku(p.code as string)) }))
    .filter((u): u is { id: number; image: string } => !!u.image);

  for (const u of updates) {
    const { error } = await db.from("stock_products").update({ image_url: u.image }).eq("id", u.id);
    if (error) {
      return NextResponse.json({ error: error.message, updatedSoFar: updates.indexOf(u) }, { status: 400 });
    }
  }

  return NextResponse.json({ updated: updates.length, checked: (products ?? []).length });
}
