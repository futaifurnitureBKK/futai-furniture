import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { PRODUCT_FIELDS, pick } from "@/lib/stock-fields";
import { logActivity } from "@/lib/activity-log";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const update: Record<string, unknown> = { ...pick(body, PRODUCT_FIELDS), updated_at: new Date().toISOString() };

  const db = supabaseAdmin();

  // Toggling "สต็อกร่วม" has to reconcile the per-variant cache with the
  // pool in both directions, or the two end up disagreeing about how much
  // stock actually exists:
  //  - turning ON: seed the pool from the variants' current numbers (the
  //    same sum-by-unit_factor every past shared-stock migration has used)
  //    instead of leaving it at 0, which would fail every deduction until
  //    someone happened to run a manual "receive" first; also flags a
  //    reference variant if none is set yet, so StockDEMO's display and
  //    /shared-adjust don't silently misbehave the way HJ-111B's did.
  //  - turning OFF: every sibling variant has been displaying a COPY of
  //    the same pool value, not an independent count — leaving them all
  //    at that number would make the rest of the app believe N times the
  //    real stock exists (N = how many sizes this model has). Keep only
  //    the reference variant's number and zero every sibling, and clear
  //    the pool so turning it back on later doesn't resurrect stale modules.
  if (typeof update.shared_stock === "boolean") {
    const { data: before } = await db
      .from("stock_products")
      .select("shared_stock, stock_variants(id, unit_factor, available, reserved, defective, is_shared_reference, archived)")
      .eq("id", id)
      .single();
    const variants = (before?.stock_variants ?? []) as {
      id: number; unit_factor: number; available: number; reserved: number; defective: number; is_shared_reference: boolean; archived: boolean;
    }[];

    if (update.shared_stock === true && !before?.shared_stock) {
      const sumModules = (f: "available" | "reserved" | "defective") =>
        Math.round(variants.filter((v) => !v.archived).reduce((s, v) => s + v[f] * (v.unit_factor || 1), 0));
      update.shared_available_modules = sumModules("available");
      update.shared_reserved_modules = sumModules("reserved");
      update.shared_defective_modules = sumModules("defective");
      if (variants.length && !variants.some((v) => v.is_shared_reference)) {
        await db.from("stock_variants").update({ is_shared_reference: true }).eq("id", variants[0].id);
      }
    } else if (update.shared_stock === false && before?.shared_stock) {
      update.shared_available_modules = 0;
      update.shared_reserved_modules = 0;
      update.shared_defective_modules = 0;
      const refId = variants.find((v) => v.is_shared_reference)?.id ?? variants[0]?.id;
      for (const v of variants) {
        if (v.id === refId) continue;
        if (v.available === 0 && v.reserved === 0 && v.defective === 0) continue;
        await db.from("stock_variants").update({ available: 0, reserved: 0, defective: 0 }).eq("id", v.id);
        await db.from("stock_movements").insert(
          (["available", "reserved", "defective"] as const)
            .filter((f) => v[f] !== 0)
            .map((f) => ({ variant_id: v.id, field: f, old_value: v[f], new_value: 0 }))
        );
      }
    }
  }

  const { data, error } = await db.from("stock_products").update(update).eq("id", id).select("*, stock_variants(*)").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await logActivity(req, {
    action: "update",
    entityType: "stock_product",
    entityId: id,
    summary: `แก้ไขสินค้าสต็อก ${data.code} (${Object.keys(update).filter((k) => k !== "updated_at").join(", ") || "-"})`,
    detail: update,
  });
  return NextResponse.json({ product: data });
}
