import { CATEGORIES, PRODUCTS } from "../src/data/mock";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

async function upsert(table: string, onConflict: string, rows: unknown[]) {
  const res = await fetch(`${url}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    throw new Error(`${table} upsert failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  const catRows = await upsert(
    "categories",
    "slug",
    CATEGORIES.map((c) => ({
      slug: c.slug,
      name_th: c.name_th,
      name_en: c.name_en,
      banner_url: c.banner_url,
      description_th: c.description_th,
      description_en: c.description_en,
      sort_order: c.sort_order,
    }))
  );
  console.log(`Seeded ${catRows.length} categories`);

  const catIdBySlug = new Map(catRows.map((c: { id: string; slug: string }) => [c.slug, c.id]));

  const prodRows = await upsert(
    "products",
    "sku",
    PRODUCTS.map((p) => ({
      sku: p.sku,
      name_th: p.name_th,
      name_en: p.name_en,
      category_id: catIdBySlug.get(p.category_slug) ?? null,
      category_slug: p.category_slug,
      description_th: p.description_th,
      description_en: p.description_en,
      dimensions: p.dimensions,
      price: p.price,
      stock_status: p.stock_status,
      images: p.images,
      tags: p.tags,
      is_featured: p.is_featured,
      view_count: p.view_count,
    }))
  );
  console.log(`Seeded ${prodRows.length} products`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
