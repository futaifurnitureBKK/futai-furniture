// Dry run only — reports how many line items across all saved quotations/
// invoices/delivery notes could be matched to a Main Stock variant by
// sku+size (the same logic Daily Export already uses to *suggest* a match).
// Nothing is written to the database. Run with: npx tsx scripts/match-old-quote-items-to-stock-2026-10.ts
import { sizeMatches } from "../src/lib/stock-auto-deduct";
import type { SavedQuoteItem } from "../src/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function fetchAll<T>(path: string): Promise<T[]> {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const quotes = await fetchAll<{ id: number; doc_no: string; doc_type: string; items: SavedQuoteItem[] }>(
    "saved_quotes?select=id,doc_no,doc_type,items"
  );
  const variants = await fetchAll<{ id: number; code: string; size_text: string }>(
    "stock_variants?select=id,code,size_text"
  );
  const byCode = new Map<string, { id: number; code: string; size_text: string }[]>();
  for (const v of variants) {
    const list = byCode.get(v.code) || [];
    list.push(v);
    byCode.set(v.code, list);
  }

  let totalItems = 0;
  let alreadyLinked = 0;
  let matchedByCodeAndSize = 0;
  let matchedByCodeAlone = 0;
  let codeFoundSizeAmbiguous = 0;
  let codeNotFound = 0;
  const unmatchedSamples: { doc_no: string; sku: string; size: string }[] = [];

  for (const quote of quotes) {
    for (const item of quote.items || []) {
      totalItems++;
      if (item.stock_variant_id) {
        alreadyLinked++;
        continue;
      }
      const sku = (item.sku || "").trim();
      if (!sku) {
        codeNotFound++;
        unmatchedSamples.push({ doc_no: quote.doc_no, sku: "(blank)", size: item.size });
        continue;
      }
      const pool = byCode.get(sku);
      if (!pool || !pool.length) {
        codeNotFound++;
        if (unmatchedSamples.length < 30) unmatchedSamples.push({ doc_no: quote.doc_no, sku, size: item.size });
        continue;
      }
      if (pool.length === 1) {
        matchedByCodeAlone++;
        continue;
      }
      const sizeMatch = pool.find((v) => sizeMatches(v.size_text || "", item.size));
      if (sizeMatch) {
        matchedByCodeAndSize++;
      } else {
        codeFoundSizeAmbiguous++;
        if (unmatchedSamples.length < 30) unmatchedSamples.push({ doc_no: quote.doc_no, sku, size: item.size });
      }
    }
  }

  console.log(`Quotes/invoices/delivery notes scanned: ${quotes.length}`);
  console.log(`Total line items: ${totalItems}`);
  console.log(`Already linked (stock_variant_id set): ${alreadyLinked}`);
  console.log(`Matched — unique code: ${matchedByCodeAlone}`);
  console.log(`Matched — code + size: ${matchedByCodeAndSize}`);
  console.log(`Code found but size ambiguous/no match: ${codeFoundSizeAmbiguous}`);
  console.log(`Code not found in Stock at all: ${codeNotFound}`);
  console.log(`\nSample unmatched (up to 30):`);
  for (const s of unmatchedSamples) console.log(`  ${s.doc_no} — sku="${s.sku}" size="${s.size}"`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
