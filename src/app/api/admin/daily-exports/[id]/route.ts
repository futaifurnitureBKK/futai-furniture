import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

const EDITABLE_FIELDS = ["remark", "customer_name", "salesperson", "po_no"] as const;

// qty and stock_variant_id are edited through this same route but handled
// separately below (not in EDITABLE_FIELDS) because changing either one has
// to restore the old deduction and apply the new one, never just overwrite.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const update: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field];
  }
  update.updated_at = new Date().toISOString();

  const db = supabaseAdmin();

  if ("qty" in body || "stock_variant_id" in body) {
    const { data: existing } = await db
      .from("daily_export_rows")
      .select("stock_variant_id, stock_deducted_qty")
      .eq("id", id)
      .single();
    if (existing) {
      const newVariantId = "stock_variant_id" in body ? Number(body.stock_variant_id) : existing.stock_variant_id;
      const newQty = "qty" in body ? Number(body.qty) || 0 : existing.stock_deducted_qty;

      // Restore whatever this row previously deducted.
      const { data: oldVariant } = await db
        .from("stock_variants")
        .select("available")
        .eq("id", existing.stock_variant_id)
        .single();
      if (oldVariant) {
        await db
          .from("stock_variants")
          .update({ available: oldVariant.available + existing.stock_deducted_qty })
          .eq("id", existing.stock_variant_id);
      }

      // Apply the new amount against the (possibly different) variant.
      const { data: newVariant } = await db.from("stock_variants").select("available").eq("id", newVariantId).single();
      if (newVariant) {
        await db.from("stock_variants").update({ available: newVariant.available - newQty }).eq("id", newVariantId);
      }

      update.stock_variant_id = newVariantId;
      update.stock_deducted_qty = newQty;
      if ("qty" in body) update.qty = newQty;
      if ("sku" in body) update.sku = body.sku;
      if ("size_text" in body) update.size_text = body.size_text;
      if ("image_url" in body) update.image_url = body.image_url;
    }
  }

  const { data, error } = await db.from("daily_export_rows").update(update).eq("id", id).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ row: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: existing } = await db
    .from("daily_export_rows")
    .select("stock_variant_id, stock_deducted_qty")
    .eq("id", id)
    .single();
  if (existing?.stock_deducted_qty) {
    const { data: variant } = await db.from("stock_variants").select("available").eq("id", existing.stock_variant_id).single();
    if (variant) {
      await db
        .from("stock_variants")
        .update({ available: variant.available + existing.stock_deducted_qty })
        .eq("id", existing.stock_variant_id);
    }
  }

  const { error } = await db.from("daily_export_rows").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
