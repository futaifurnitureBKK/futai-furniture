import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

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
    "name_en",
    "name_zh",
    "category_slug",
    "description_th",
    "description_en",
    "description_zh",
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
