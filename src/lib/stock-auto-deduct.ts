import type { SupabaseClient } from "@supabase/supabase-js";

// Keeps StockDEMO's "available" count in sync with what Daily Sales records
// as sold. Always restores whatever this one row previously deducted before
// applying its new amount — so retyping the SKU, changing the quantity, or
// deleting the row never double-counts or leaves a stale deduction behind.
// If the sku doesn't match any stock_variants.code (e.g. a made-to-order
// item that was never added to Stock), it's skipped silently — Daily Sales
// must always be able to record a sale, tracked in Stock or not.
export async function syncStockDeduction(
  db: SupabaseClient,
  params: { previousVariantId: number | null; previousQty: number; newSku: string; newQty: number }
): Promise<{ variantId: number | null; deductedQty: number }> {
  const { previousVariantId, previousQty, newSku, newQty } = params;

  if (previousVariantId != null && previousQty) {
    await adjustAvailable(db, previousVariantId, previousQty);
  }

  const code = newSku.trim();
  if (!code || newQty <= 0) {
    return { variantId: null, deductedQty: 0 };
  }

  const { data: variant } = await db.from("stock_variants").select("id").eq("code", code).maybeSingle();
  if (!variant) {
    return { variantId: null, deductedQty: 0 };
  }

  await adjustAvailable(db, variant.id, -newQty);
  return { variantId: variant.id, deductedQty: newQty };
}

async function adjustAvailable(db: SupabaseClient, variantId: number, delta: number) {
  const { data } = await db.from("stock_variants").select("available").eq("id", variantId).single();
  const current = data?.available ?? 0;
  await db.from("stock_variants").update({ available: current + delta }).eq("id", variantId);
}
