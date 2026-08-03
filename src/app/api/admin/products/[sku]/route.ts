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

  // Re-translate Thai name/description into English/Chinese whenever they change.
  try {
    if ("name_th" in update) {
      const { en, zh } = await translateToEnZh(update.name_th as string, false);
      update.name_en = en;
      update.name_zh = zh;
    }
    if ("description_th" in update) {
      const { en, zh } = await translateToEnZh(update.description_th as string, true);
      update.description_en = en;
      update.description_zh = zh;
    }
    if ("color_variants" in body) {
      const colorVariantsIn: { label_th: string; hex: string; images: string[] }[] = body.color_variants ?? [];
      const labels = await Promise.all(colorVariantsIn.map((v) => translateToEnZh(v.label_th, false)));
      update.color_variants = colorVariantsIn.map((v, i) => ({
        label_th: v.label_th,
        label_en: labels[i].en,
        label_zh: labels[i].zh,
        hex: v.hex,
        images: v.images,
      }));
    }
  } catch (err) {
    return NextResponse.json({ error: `Translation failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 502 });
  }

  const { data, error } = await db.from("products").update(update).eq("sku", sku).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ product: data });
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
