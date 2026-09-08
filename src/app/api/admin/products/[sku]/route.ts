import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { translateToEnZh } from "@/lib/translate";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ sku: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sku } = await params;
  const body = await req.json();
  const db = supabaseAdmin();

  const update: Record<string, unknown> = {};
  for (const key of [
    "name_th",
    "category_slug",
    "description_th",
    "dimensions",
    "price",
    "stock_status",
    "images",
    "tags",
    "is_featured",
    "is_active",
  ]) {
    if (key in body) update[key] = body[key];
  }

  if ("category_slug" in update) {
    const { data: cat } = await db
      .from("categories")
      .select("id")
      .eq("slug", update.category_slug as string)
      .maybeSingle();
    update.category_id = cat?.id ?? null;
  }

  // Re-translate Thai name/description into English/Chinese whenever they
  // change. The translation API (MyMemory) occasionally times out or
  // rate-limits — that shouldn't block saving the rest of the edit. On
  // failure, leave the existing en/zh translation untouched (better than
  // overwriting a good translation with a fallback) and report it back so
  // the admin can re-save later to retry.
  let translationFailed = false;

  if ("name_th" in update) {
    try {
      const { en, zh } = await translateToEnZh(update.name_th as string, false);
      update.name_en = en;
      update.name_zh = zh;
    } catch (err) {
      translationFailed = true;
      console.warn("Translation failed for name_th, keeping existing translation:", err);
    }
  }
  if ("description_th" in update) {
    try {
      const { en, zh } = await translateToEnZh(update.description_th as string, true);
      update.description_en = en;
      update.description_zh = zh;
    } catch (err) {
      translationFailed = true;
      console.warn("Translation failed for description_th, keeping existing translation:", err);
    }
  }
  if ("color_variants" in body) {
    const colorVariantsIn: { label_th: string; hex: string; images: string[] }[] = body.color_variants ?? [];
    const labels = await Promise.all(
      colorVariantsIn.map(async (v) => {
        try {
          return await translateToEnZh(v.label_th, false);
        } catch (err) {
          translationFailed = true;
          console.warn("Translation failed for color label, falling back to Thai text:", err);
          return { en: v.label_th, zh: v.label_th };
        }
      })
    );
    update.color_variants = colorVariantsIn.map((v, i) => ({
      label_th: v.label_th,
      label_en: labels[i].en,
      label_zh: labels[i].zh,
      hex: v.hex,
      images: v.images,
    }));
  }
  if ("seat_variants" in body) {
    const seatVariantsIn: { seats: number; size: string; images: string[] }[] = Array.isArray(body.seat_variants) ? body.seat_variants : [];
    update.seat_variants = seatVariantsIn.filter((v) => Number.isFinite(v.seats) && v.seats > 0);
  }

  const { data, error } = await db.from("products").update(update).eq("sku", sku).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ product: data, translationFailed });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ sku: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sku } = await params;
  const db = supabaseAdmin();

  const { error } = await db.from("products").delete().eq("sku", sku);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
