import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSessionName } from "@/lib/admin-session";
import { adjustSharedStockBySets } from "@/lib/shared-stock";
import { logActivity } from "@/lib/activity-log";

const FIELDS = ["available", "reserved", "defective"] as const;
const SESSION_COOKIE = "futai_admin_auth";

// Receive/adjust/reserve/defective for a shared-stock model (YN-01-4,
// QC-A2401, YN-05) — entered in sets (supports .5), applied to the whole
// module pool at once so every size's cached count updates together.
// Never touch a shared-stock variant's available/reserved/defective
// directly through the generic variant PATCH route; this is the only way
// those numbers should change for these models.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const field = body.field as (typeof FIELDS)[number];
  if (!FIELDS.includes(field)) {
    return NextResponse.json({ error: "field must be available, reserved, or defective" }, { status: 400 });
  }
  const sets = Number(body.sets);
  if (!Number.isFinite(sets) || sets === 0) {
    return NextResponse.json({ error: "sets is required" }, { status: 400 });
  }
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  const actor = await getSessionName(req.cookies.get(SESSION_COOKIE)?.value);

  const db = supabaseAdmin();
  const { data: product } = await db
    .from("stock_products")
    .select("id, shared_stock, stock_variants(unit_factor, is_shared_reference)")
    .eq("id", id)
    .single();
  if (!product?.shared_stock) {
    return NextResponse.json({ error: "ไม่ใช่สินค้าสต็อกร่วม" }, { status: 400 });
  }

  const refVariant = product.stock_variants?.find((v) => v.is_shared_reference);
  const unitsPerSet = refVariant?.unit_factor || 2;
  const result = await adjustSharedStockBySets(db, Number(id), field, sets, unitsPerSet, note, actor);
  if (!result.ok) {
    const insufficientStock = result.error !== "sets_must_be_half_increment";
    return NextResponse.json(
      { error: insufficientStock ? "สต็อกเหลือไม่พอ" : `จำนวนต้องเป็นหน่วยละ ${(1 / unitsPerSet).toString()} ตัว` },
      { status: insufficientStock ? 409 : 400 }
    );
  }

  const { data: updated, error } = await db.from("stock_products").select("*, stock_variants(*)").eq("id", id).single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await logActivity(req, {
    action: "adjust",
    entityType: "stock_product",
    entityId: id,
    summary: `ปรับสต็อกร่วม ${updated.code} — ${field} ${sets > 0 ? "+" : ""}${sets} ตัว`,
    detail: { field, sets },
  });
  return NextResponse.json({ product: updated });
}
