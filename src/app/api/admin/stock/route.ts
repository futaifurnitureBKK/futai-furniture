import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { PRODUCT_FIELDS, VARIANT_FIELDS, pick } from "@/lib/stock-fields";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const archived = req.nextUrl.searchParams.get("archived") === "true";
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("stock_products")
    .select("*, stock_variants(*)")
    .eq("archived", archived)
    .order("id", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ products: data });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (!body.code || !String(body.code).trim()) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: product, error } = await db
    .from("stock_products")
    .insert({ ...pick(body, PRODUCT_FIELDS), code: String(body.code).trim() })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const variants: Record<string, unknown>[] = Array.isArray(body.variants) ? body.variants : [];
  if (variants.length) {
    const { error: vErr } = await db.from("stock_variants").insert(
      variants.map((v, i) => ({
        ...pick(v, VARIANT_FIELDS),
        product_id: product.id,
        sort_order: i,
        code: (v.code as string) || product.code,
      }))
    );
    if (vErr) {
      return NextResponse.json({ error: vErr.message }, { status: 400 });
    }
  }

  const { data: full } = await db.from("stock_products").select("*, stock_variants(*)").eq("id", product.id).single();
  return NextResponse.json({ product: full });
}
