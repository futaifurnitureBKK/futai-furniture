import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { buildPlan, parseDims, type DbProductLite, type SyncRow } from "@/lib/stock-sync";
import syncData from "@/data/stock-sync.json";

const rows = (syncData as unknown as { rows: SyncRow[] }).rows;
const label = (syncData as unknown as { label: string }).label;

async function loadProducts() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("stock_products")
    .select("id, code, category, stock_variants(id, product_id, code, size_text, available, reserved, stock_note, archived, sort_order)")
    .eq("archived", false);
  return { db, data: data as unknown as DbProductLite[] | null, error };
}

// Preview: what would change if the newer stock sheet were applied.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await loadProducts();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Load failed" }, { status: 400 });
  }
  return NextResponse.json({ label, plan: buildPlan(data, rows) });
}

// Apply the plan. Stock changes are logged in stock_movements like manual edits.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { db, data, error } = await loadProducts();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Load failed" }, { status: 400 });
  }
  const plan = buildPlan(data, rows);
  const now = new Date().toISOString();

  for (const u of plan.updates) {
    const { error: uErr } = await db
      .from("stock_variants")
      .update({ available: u.after.available, reserved: u.after.reserved, stock_note: u.after.note, tracked: true, updated_at: now })
      .eq("id", u.variantId);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });

    const moves = (["available", "reserved"] as const)
      .filter((f) => u.before[f] !== u.after[f])
      .map((f) => ({ variant_id: u.variantId, field: f, old_value: u.before[f], new_value: u.after[f] }));
    if (moves.length) await db.from("stock_movements").insert(moves);
  }

  // new sizes under existing products
  const nextSort = new Map<number, number>();
  data.forEach((p) => nextSort.set(p.id, p.stock_variants.length));
  for (const nv of plan.newVariants) {
    const sort = nextSort.get(nv.productId) ?? 0;
    nextSort.set(nv.productId, sort + 1);
    const { error: vErr } = await db.from("stock_variants").insert({
      product_id: nv.productId,
      code: nv.code,
      size_text: nv.size,
      ...parseDims(nv.size),
      from_stock: true,
      sort_order: sort,
      available: nv.values.available,
      reserved: nv.values.reserved,
      stock_note: nv.values.note,
      tracked: true,
    });
    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 400 });
  }

  // brand-new models
  for (const np of plan.newProducts) {
    const { data: prod, error: pErr } = await db
      .from("stock_products")
      .insert({ code: np.code, category: np.category, from_stock: true })
      .select("id")
      .single();
    if (pErr || !prod) return NextResponse.json({ error: pErr?.message ?? "Insert failed" }, { status: 400 });
    const { error: vErr } = await db.from("stock_variants").insert(
      np.variants.map((v, i) => ({
        product_id: prod.id,
        code: v.code,
        label: v.option,
        size_text: v.size,
        ...parseDims(v.size),
        note: v.option,
        from_stock: true,
        sort_order: i,
        available: v.values.available,
        reserved: v.values.reserved,
        stock_note: v.values.note,
        tracked: true,
      }))
    );
    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 400 });
  }

  return NextResponse.json({
    updated: plan.updates.length,
    newVariants: plan.newVariants.length,
    newProducts: plan.newProducts.length,
    unchanged: plan.unchanged,
  });
}
