import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.sku || typeof body.sku !== "string") {
    return NextResponse.json({ error: "sku is required" }, { status: 400 });
  }

  const db = supabaseAdmin();

  let category_id: string | null = null;
  if (body.category_slug) {
    const { data: cat } = await db.from("categories").select("id").eq("slug", body.category_slug).maybeSingle();
    category_id = cat?.id ?? null;
  }

  const { data, error } = await db
    .from("products")
    .insert({
      sku: body.sku,
      name_th: body.name_th ?? "",
      name_en: body.name_en ?? "",
      name_zh: body.name_zh ?? "",
      category_id,
      category_slug: body.category_slug ?? "",
      description_th: body.description_th ?? "",
      description_en: body.description_en ?? "",
      description_zh: body.description_zh ?? "",
      dimensions: body.dimensions ?? "",
      price: body.price ?? null,
      stock_status: body.stock_status ?? "in_stock",
      images: body.images ?? [],
      tags: body.tags ?? [],
      is_featured: body.is_featured ?? false,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ product: data });
}
