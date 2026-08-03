import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { translateToEnZh } from "@/lib/translate";

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

  const name_th: string = body.name_th ?? "";
  const description_th: string = body.description_th ?? "";
  const colorVariantsIn: { label_th: string; hex: string; images: string[] }[] = body.color_variants ?? [];

  let name_en = "";
  let name_zh = "";
  let description_en = "";
  let description_zh = "";
  let color_variants: Array<{ label_th: string; label_en: string; label_zh: string; hex: string; images: string[] }> = [];
  try {
    const [nameT, descT, variantLabels] = await Promise.all([
      translateToEnZh(name_th, false),
      translateToEnZh(description_th, true),
      Promise.all(colorVariantsIn.map((v) => translateToEnZh(v.label_th, false))),
    ]);
    name_en = nameT.en;
    name_zh = nameT.zh;
    description_en = descT.en;
    description_zh = descT.zh;
    color_variants = colorVariantsIn.map((v, i) => ({
      label_th: v.label_th,
      label_en: variantLabels[i].en,
      label_zh: variantLabels[i].zh,
      hex: v.hex,
      images: v.images,
    }));
  } catch (err) {
    return NextResponse.json({ error: `Translation failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 502 });
  }

  const { data, error } = await db
    .from("products")
    .insert({
      sku: body.sku,
      name_th,
      name_en,
      name_zh,
      category_id,
      category_slug: body.category_slug ?? "",
      description_th,
      description_en,
      description_zh,
      dimensions: body.dimensions ?? "",
      price: body.price ?? null,
      stock_status: body.stock_status ?? "in_stock",
      images: body.images ?? [],
      tags: body.tags ?? [],
      color_variants,
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
