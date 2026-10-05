import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { ensureItemIds } from "@/lib/quote-item-ids";
import { computeFulfillment } from "@/lib/quote-fulfillment";
import { sizeMatches } from "@/lib/stock-auto-deduct";

// Per-line shipped/remaining for one quotation, plus its full export
// history — backs both Daily Export's "pull from quotation" dialog and the
// read-only shipment history shown on the quote itself.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: quote, error } = await db
    .from("saved_quotes")
    .select("id, doc_no, customer_name, customer_address, discount_pct, vat_pct, items")
    .eq("id", id)
    .single();
  if (error || !quote) {
    return NextResponse.json({ error: error?.message ?? "Quote not found" }, { status: 404 });
  }

  const items = await ensureItemIds(db, quote);

  const { data: exportRows } = await db
    .from("daily_export_rows")
    .select("id, export_date, sku, size_text, qty, salesperson, quotation_item_id, created_at")
    .eq("quotation_id", id)
    .order("export_date", { ascending: true })
    .order("created_at", { ascending: true });

  const shippedByItemId = new Map<string, number>();
  for (const row of exportRows || []) {
    if (!row.quotation_item_id) continue;
    shippedByItemId.set(row.quotation_item_id, (shippedByItemId.get(row.quotation_item_id) || 0) + Number(row.qty));
  }
  const { perItem } = computeFulfillment(items, shippedByItemId);
  const perItemMap = new Map(perItem.map((p) => [p.item_id, p]));

  // Quote lines are free-text (sku/size typed by hand, not tied to Stock),
  // so Daily Export — which never deducts from a typed SKU — can only
  // *suggest* a matching stock_variants row here; staff still confirm or
  // correct it before anything is actually deducted. A sku staff have
  // already resolved by hand before (quotation_sku_mappings) wins over a
  // fresh code/size guess.
  const skus = [...new Set(items.map((it) => it.sku?.trim()).filter(Boolean))] as string[];
  const { data: candidates } = skus.length
    ? await db.from("stock_variants").select("id, code, size_text, available, image_urls").in("code", skus)
    : { data: [] as { id: number; code: string; size_text: string; available: number; image_urls: string[] | null }[] };

  const { data: mappings } = skus.length
    ? await db.from("quotation_sku_mappings").select("quote_sku, stock_variant_id").in("quote_sku", skus)
    : { data: [] as { quote_sku: string; stock_variant_id: number }[] };
  const mappedVariantIds = (mappings || []).map((m) => m.stock_variant_id).filter((id) => !(candidates || []).some((c) => c.id === id));
  const { data: mappedVariants } = mappedVariantIds.length
    ? await db.from("stock_variants").select("id, code, size_text, available, image_urls").in("id", mappedVariantIds)
    : { data: [] as { id: number; code: string; size_text: string; available: number; image_urls: string[] | null }[] };
  const allVariants = [...(candidates || []), ...(mappedVariants || [])];
  const mappingBySku = new Map((mappings || []).map((m) => [m.quote_sku, m.stock_variant_id]));

  function suggestVariant(sku: string, size: string) {
    const mappedId = mappingBySku.get(sku);
    if (mappedId) {
      const mapped = allVariants.find((c) => c.id === mappedId);
      if (mapped) return mapped;
    }
    const pool = allVariants.filter((c) => c.code === sku);
    if (!pool.length) return null;
    if (pool.length === 1) return pool[0];
    return pool.find((c) => sizeMatches(c.size_text ?? "", size)) ?? null;
  }

  return NextResponse.json({
    quote: {
      id: quote.id,
      doc_no: quote.doc_no,
      customer_name: quote.customer_name,
      customer_address: quote.customer_address,
      discount_pct: quote.discount_pct,
      total: items.reduce((sum, it) => {
        const afterDiscount = it.qty * it.unitPrice * (1 - quote.discount_pct / 100);
        return sum + afterDiscount * (1 + quote.vat_pct / 100);
      }, 0),
    },
    items: items.map((it) => {
      const sku = it.sku?.trim() || "";
      const suggestion = sku ? suggestVariant(sku, it.size) : null;
      const candidatesForSku = allVariants
        .filter((c) => c.code === sku)
        .map((c) => ({ variantId: c.id, size_text: c.size_text, available: c.available, image_url: c.image_urls?.[0] ?? null }));
      return {
        ...it,
        shipped: perItemMap.get(it.item_id as string)?.shipped ?? 0,
        remaining: perItemMap.get(it.item_id as string)?.remaining ?? it.qty,
        suggestedVariantId: suggestion?.id ?? null,
        candidates: candidatesForSku,
      };
    }),
    history: exportRows || [],
  });
}
