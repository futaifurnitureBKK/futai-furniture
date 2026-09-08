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
  const seatVariantsIn: { seats: number; images: string[] }[] = Array.isArray(body.seat_variants) ? body.seat_variants : [];
  const seat_variants = seatVariantsIn.filter((v) => Number.isFinite(v.seats) && v.seats > 0);

  // The translation API (MyMemory) occasionally times out or rate-limits —
  // that shouldn't block saving the product. Fall back to the Thai text
  // (admin can fix it up manually, or just re-save later to retry) instead
  // of failing the whole request.
  let translationFailed = false;
  async function translateOrFallback(text: string, isHtml: boolean): Promise<{ en: string; zh: string }> {
    try {
      return await translateToEnZh(text, isHtml);
    } catch (err) {
      translationFailed = true;
      console.warn("Translation failed, falling back to Thai text:", err);
      return { en: text, zh: text };
    }
  }

  const [nameT, descT, variantLabels] = await Promise.all([
    translateOrFallback(name_th, false),
    translateOrFallback(description_th, true),
    Promise.all(colorVariantsIn.map((v) => translateOrFallback(v.label_th, false))),
  ]);
  const name_en = nameT.en;
  const name_zh = nameT.zh;
  const description_en = descT.en;
  const description_zh = descT.zh;
  const color_variants = colorVariantsIn.map((v, i) => ({
    label_th: v.label_th,
    label_en: variantLabels[i].en,
    label_zh: variantLabels[i].zh,
    hex: v.hex,
    images: v.images,
  }));

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
      seat_variants,
      is_featured: body.is_featured ?? false,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ product: data, translationFailed });
}
