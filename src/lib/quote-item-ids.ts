import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SavedQuote, SavedQuoteItem } from "@/types";

// Quotes saved before item_id existed on SavedQuoteItem won't have one yet.
// Rather than a one-off SQL backfill of the jsonb column, ids are assigned
// lazily the first time such a quote is read anywhere that needs per-item
// shipment tracking (Daily Export's "pull from quotation"), and persisted
// immediately so every later read is stable.
export async function ensureItemIds(db: SupabaseClient, quote: Pick<SavedQuote, "id" | "items">): Promise<SavedQuoteItem[]> {
  let changed = false;
  const items = quote.items.map((it) => {
    if (it.item_id) return it;
    changed = true;
    return { ...it, item_id: crypto.randomUUID() };
  });
  if (changed) {
    await db.from("saved_quotes").update({ items }).eq("id", quote.id);
  }
  return items;
}
