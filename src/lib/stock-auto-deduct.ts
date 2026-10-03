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
    newSizeText: string;
    fromReserved: boolean;
  }
): Promise<{ variantId: number | null; deductedQty: number; field: StockField }> {
  const { previousVariantId, previousQty, previousField, newSku, newQty, newSizeText, fromReserved } = params;
  const newField: StockField = fromReserved ? "reserved" : "available";

  if (previousVariantId != null && previousQty) {
    await adjustField(db, previousVariantId, previousField, previousQty);
  }

  const code = newSku.trim();
  if (!code || newQty <= 0) {
    return { variantId: null, deductedQty: 0, field: newField };
  }

  // Several products reuse the same code across every size (the price
  // catalog this sku is typed from does too — e.g. one sku spans 6 widths),
  // so more than one stock_variants row can share a code. Narrow those down
  // by comparing the sold item's size text against each candidate's —
  // falls back to "not found" (no auto-deduct) rather than ever guessing
  // and decrementing the wrong size.
  const { data: candidates } = await db.from("stock_variants").select("id, size_text").eq("code", code);
  const variant =
    !candidates || candidates.length === 0
      ? null
      : candidates.length === 1
        ? candidates[0]
        : candidates.find((c) => sizeMatches(c.size_text ?? "", newSizeText)) ?? null;

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

function dims(text: string): number[] {
  return [...text.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}

// True if every dimension on the shorter side also appears on the other —
// handles a catalog size cell that crams more than one width into one
// entry (e.g. "W2000/2200*D1600*H750" against a single-width "2200*1600*750").
function sizeMatches(a: string, b: string): boolean {
  const da = dims(a);
  const db_ = dims(b);
  if (!da.length || !db_.length) return false;
  const [shorter, longer] = da.length <= db_.length ? [da, db_] : [db_, da];
  return shorter.every((n) => longer.includes(n));
}
