import type { SupabaseClient } from "@supabase/supabase-js";

export type StockField = "available" | "reserved";

// Keeps StockDEMO's available/reserved counts in sync with what Daily Sales
// records as sold. Always restores whatever this one row previously
// deducted — from whichever field it actually came from — before applying
// its new amount, so retyping the SKU, changing the quantity, toggling
// "จากของที่จองไว้", or deleting the row never double-counts or leaves a
// stale deduction behind.
// If the sku doesn't match any stock_variants.code (e.g. a made-to-order
// item that was never added to Stock), it's skipped silently — Daily Sales
// must always be able to record a sale, tracked in Stock or not.
export async function syncStockDeduction(
  db: SupabaseClient,
  params: {
    previousVariantId: number | null;
    previousQty: number;
    previousField: StockField;
    newSku: string;
    newQty: number;
    fromReserved: boolean;
  }
): Promise<{ variantId: number | null; deductedQty: number; field: StockField }> {
  const { previousVariantId, previousQty, previousField, newSku, newQty, fromReserved } = params;
  const newField: StockField = fromReserved ? "reserved" : "available";

  if (previousVariantId != null && previousQty) {
    await adjustField(db, previousVariantId, previousField, previousQty);
  }

  const code = newSku.trim();
  if (!code || newQty <= 0) {
    return { variantId: null, deductedQty: 0, field: newField };
  }

  const { data: variant } = await db.from("stock_variants").select("id").eq("code", code).maybeSingle();
  if (!variant) {
    return { variantId: null, deductedQty: 0, field: newField };
  }

  await adjustField(db, variant.id, newField, -newQty);
  return { variantId: variant.id, deductedQty: newQty, field: newField };
}

async function adjustField(db: SupabaseClient, variantId: number, field: StockField, delta: number) {
  const { data } = await db.from("stock_variants").select(field).eq("id", variantId).single();
  const current = (data as Record<StockField, number> | null)?.[field] ?? 0;
  await db.from("stock_variants").update({ [field]: current + delta }).eq("id", variantId);
}
