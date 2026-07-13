import { NextRequest, NextResponse } from "next/server";

// Parse Shopee image export: rows with product_id, sku, image1, image2, ...
export async function POST(req: NextRequest) {
  const { rows } = await req.json() as { rows: string[][] };

  if (!rows || rows.length < 2) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  // Auto-detect header row: look for row containing "image" or "รูป"
  const headerIdx = rows.findIndex((r) =>
    r.some((c) => /image|รูป|img/i.test(String(c)))
  );
  const header = headerIdx >= 0 ? rows[headerIdx] : rows[0];
  const dataRows = rows.slice(Math.max(headerIdx + 1, 1));

  const skuCol   = header.findIndex((h) => /sku|parent/i.test(String(h)));
  const imgCols  = header
    .map((h, i) => ({ h: String(h), i }))
    .filter(({ h }) => /image|รูป|img/i.test(h))
    .map(({ i }) => i);

  const results: { sku: string; images: string[] }[] = [];
  for (const row of dataRows) {
    const sku = skuCol >= 0 ? String(row[skuCol] || "").trim() : "";
    const images = imgCols
      .map((c) => String(row[c] || "").trim())
      .filter((u) => u.startsWith("http"));
    if (sku && images.length) results.push({ sku, images });
  }

  return NextResponse.json({ results, count: results.length });
}
