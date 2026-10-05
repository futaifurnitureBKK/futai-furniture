import type { SavedQuoteItem } from "@/types";

// "Shipped so far" is always computed from real Daily Export rows (never
// stored as its own number), so deleting or editing an export row updates
// this automatically with no extra bookkeeping anywhere.
export type QuoteShipStatus = "not_shipped" | "partial" | "complete";

export interface ItemFulfillment {
  item_id: string;
  shipped: number;
  remaining: number;
}

export function computeFulfillment(items: SavedQuoteItem[], shippedByItemId: Map<string, number>) {
  const perItem: ItemFulfillment[] = items.map((it) => {
    const item_id = it.item_id as string;
    const shipped = Math.min(it.qty, shippedByItemId.get(item_id) || 0);
    return { item_id, shipped, remaining: it.qty - shipped };
  });
  const orderedUnits = items.reduce((sum, it) => sum + it.qty, 0);
  const shippedUnits = perItem.reduce((sum, it) => sum + it.shipped, 0);
  let status: QuoteShipStatus = "not_shipped";
  if (shippedUnits > 0) status = perItem.every((it) => it.remaining <= 0) ? "complete" : "partial";
  return { perItem, orderedUnits, shippedUnits, status };
}
