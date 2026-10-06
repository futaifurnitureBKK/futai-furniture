import type { SupabaseClient } from "@supabase/supabase-js";

// A handful of models (YN-01-4, QC-A2401, YN-05) sell in several widths
// that all draw from ONE physical pool instead of each having its own
// independent count. The pool is tracked in whole "modules" — a module is
// one 2-seat unit, so nothing here ever needs a fraction: 1200mm = 1
// module (0.5 of a 4-seat "set"), 2400mm = 2 modules (1 set), 3600mm = 3
// modules (1.5 sets). See scripts/add-shared-stock-2026-10.sql for the
// schema and the adjust_shared_stock_modules() function this calls into.

export type StockField = "available" | "reserved" | "defective";

// ── Pure math — no DB, exported so it's directly unit-testable ──────────

// 1 set = 2 modules. Staff enter quantities in sets (supports .5); anything
// that isn't a whole number of modules is rejected rather than rounded
// silently, since modules must always stay a whole number.
export function setsToModules(sets: number): number | null {
  const modules = Math.round(sets * 2);
  if (Math.abs(modules - sets * 2) > 1e-9) return null;
  return modules;
}
export function modulesToSets(modules: number): number {
  return modules / 2;
}

// What a module pool becomes after a delta — never lets it go negative.
export function computeNewModules(currentModules: number, moduleDelta: number): { ok: boolean; newModules: number } {
  const newModules = currentModules + moduleDelta;
  if (newModules < 0) return { ok: false, newModules: currentModules };
  return { ok: true, newModules };
}

// What one size's cached "sellable" count becomes for a given pool size —
// this is the same floor() the SQL function performs; mirrored here so the
// UI can preview it and tests can assert it without hitting the database.
export function computeVariantAvailable(modules: number, unitFactor: number): number {
  if (unitFactor <= 0) return 0;
  return Math.floor(modules / unitFactor);
}

// One line of a draft (not-yet-confirmed, or already-saved-this-session)
// selection — enough to know how many modules of a shared-stock product's
// pool it accounts for.
export interface DraftLine {
  productId: number;
  unitFactor: number;
  qty: number;
}

// The single source of truth for "how many of this exact size can still be
// picked right now," used by every surface that shows a shared-stock
// product's per-size count (Daily Export's picker and table, the pull-from-
// quotation dialog, Quote Builder, the Stock page). For a shared-stock
// product it subtracts every draft line that belongs to the SAME model
// (across all its sizes) from the product's current module pool before
// flooring by this size's own factor, so every sibling size agrees with
// what's actually left; a normal product is untouched (just its own cached
// count). Pass `excludeIndex` to add a row's own consumption back when
// computing the max *that row itself* can be raised to.
export function getAvailable(
  variant: {
    sharedStock: boolean;
    rawAvailable: number;
    productId: number;
    sharedAvailableModules: number;
    unitFactor: number;
  },
  draftRows: DraftLine[] = [],
  excludeIndex?: number
): number {
  if (!variant.sharedStock) return variant.rawAvailable;
  let consumed = 0;
  draftRows.forEach((r, i) => {
    if (i === excludeIndex || r.productId !== variant.productId) return;
    consumed += r.qty * r.unitFactor;
  });
  return computeVariantAvailable(variant.sharedAvailableModules - consumed, variant.unitFactor);
}

// ── DB-aware — the single entry point every deduct/restore call in the
// app should go through, so shared-stock products are handled correctly
// everywhere without every call site needing to know about them ──────────

export interface VariantStockMeta {
  productId: number;
  sharedStock: boolean;
  unitFactor: number;
}

export async function getVariantStockMeta(db: SupabaseClient, variantId: number): Promise<VariantStockMeta | null> {
  const { data } = await db
    .from("stock_variants")
    .select("product_id, unit_factor, stock_products(shared_stock)")
    .eq("id", variantId)
    .single();
  if (!data) return null;
  const product = (data as unknown as { stock_products: { shared_stock: boolean } | null }).stock_products;
  return {
    productId: (data as { product_id: number }).product_id,
    sharedStock: !!product?.shared_stock,
    unitFactor: (data as { unit_factor: number }).unit_factor || 1,
  };
}

// Adjusts one variant's field by pieceDelta (positive = add back, negative
// = deduct). Shared-stock variants route through the atomic module-pool
// function (converting pieces to modules via unit_factor) so every sibling
// size updates together; everything else behaves exactly as it always has.
export async function adjustVariantField(
  db: SupabaseClient,
  variantId: number,
  field: StockField,
  pieceDelta: number
): Promise<{ ok: boolean; error?: string }> {
  if (pieceDelta === 0) return { ok: true };
  const meta = await getVariantStockMeta(db, variantId);
  if (!meta) return { ok: false, error: "variant_not_found" };

  if (meta.sharedStock) {
    const moduleDelta = pieceDelta * meta.unitFactor;
    const { error } = await db.rpc("adjust_shared_stock_modules", {
      p_product_id: meta.productId,
      p_field: field,
      p_module_delta: moduleDelta,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  if (field === "available") {
    const { error } = await db.rpc("adjust_stock_variant_available", { p_variant_id: variantId, p_delta: pieceDelta });
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  // reserved/defective on a non-shared variant — no atomic RPC exists for
  // these (only "available" ever had one), so this keeps the same
  // read-then-write every call site already used before this change.
  const { data } = await db.from("stock_variants").select(field).eq("id", variantId).single();
  const current = (data as Record<string, number> | null)?.[field] ?? 0;
  const next = current + pieceDelta;
  if (next < 0) return { ok: false, error: "insufficient_stock" };
  await db.from("stock_variants").update({ [field]: next }).eq("id", variantId);
  return { ok: true };
}

// Product-level entry point for StockDEMO's receive/reserve/defective
// actions on a shared-stock model — the input is already in sets (no
// specific variant/size involved), so this calls the module-pool RPC
// directly instead of going through adjustVariantField.
export async function adjustSharedStockBySets(
  db: SupabaseClient,
  productId: number,
  field: StockField,
  sets: number
): Promise<{ ok: boolean; error?: string }> {
  const modules = setsToModules(sets);
  if (modules == null) return { ok: false, error: "sets_must_be_half_increment" };
  if (modules === 0) return { ok: true };
  const { error } = await db.rpc("adjust_shared_stock_modules", { p_product_id: productId, p_field: field, p_module_delta: modules });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// The "restore what this row previously deducted, then apply its new
// amount" pattern used by Daily Export and Daily Sales/Shipping — same
// shape whether the variant is shared-stock or not, and whether the old
// and new variant are the same row or different ones.
export async function restoreThenApply(
  db: SupabaseClient,
  params: { oldVariantId: number | null; oldQty: number; newVariantId: number; newQty: number; field?: StockField }
): Promise<{ ok: boolean; error?: string }> {
  const field = params.field ?? "available";
  if (params.oldVariantId == null || params.oldQty === 0) {
    return adjustVariantField(db, params.newVariantId, field, -params.newQty);
  }
  if (params.oldVariantId === params.newVariantId) {
    // One atomic-equivalent step covers both an increase and a decrease.
    return adjustVariantField(db, params.oldVariantId, field, params.oldQty - params.newQty);
  }
  // Different variant — restore the old one in full (always valid), then
  // deduct the new one; undo the restore if the new one doesn't have enough.
  await adjustVariantField(db, params.oldVariantId, field, params.oldQty);
  const applied = await adjustVariantField(db, params.newVariantId, field, -params.newQty);
  if (!applied.ok) {
    await adjustVariantField(db, params.oldVariantId, field, -params.oldQty);
  }
  return applied;
}
