export {};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

type NewProduct = {
  sku: string;
  category_slug: string;
  name_th: string;
  name_en: string;
  name_zh: string;
  description_th: string;
  description_en: string;
  description_zh: string;
  dimensions: string;
  images: string[];
  tags: string[];
};

const PRODUCTS: NewProduct[] = [
  {
    sku: "T-903",
    category_slug: "sofa",
    name_th: "เก้าอี้เลานจ์ผ้าลูกฟูก สีชมพูดัสตี้ T-903",
    name_en: "T-903 Corduroy Lounge Chair, Dusty Rose",
    name_zh: "T-903 灯芯绒躺椅 豆沙粉色",
    description_th: "เก้าอี้เลานจ์ทรงเตี้ยไม่มีขา หุ้มผ้าลูกฟูกสีชมพูดัสตี้ ดีไซน์นุ่มสบายสไตล์ Togo เหมาะสำหรับมุมพักผ่อนในบ้านหรือออฟฟิศ",
    description_en: "A legless, low-slung lounge chair upholstered in dusty-rose corduroy, Togo-inspired for a soft, casual seat — ideal for a home or office relaxation corner.",
    description_zh: "无腿低矮款豆沙粉色灯芯绒躺椅，Togo风格设计，柔软舒适，适合家居或办公室休闲角落。",
    dimensions: "เก้าอี้เลานจ์ทรงเตี้ย สีชมพูดัสตี้",
    images: ["/products/T-903-1.png"],
    tags: ["ผ้าลูกฟูก", "เลานจ์", "สีชมพูดัสตี้"],
  },
];

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
  const catRes = await fetch(`${url}/rest/v1/categories?select=id,slug`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const cats = (await catRes.json()) as { id: string; slug: string }[];
  const catIdBySlug = new Map(cats.map((c) => [c.slug, c.id]));

  const rows = PRODUCTS.map((p) => ({
    sku: p.sku,
    name_th: p.name_th,
    name_en: p.name_en,
    name_zh: p.name_zh,
    category_id: catIdBySlug.get(p.category_slug) ?? null,
    category_slug: p.category_slug,
    description_th: p.description_th,
    description_en: p.description_en,
    description_zh: p.description_zh,
    dimensions: p.dimensions,
    price: null,
    stock_status: "in_stock",
    images: p.images,
    tags: p.tags,
    is_featured: false,
    is_active: true,
  }));

  const result = await upsert("products", "sku", rows);
  console.log(`Upserted ${result.length} products:`);
  result.forEach((r: { sku: string; name_th: string }) => console.log(`  ${r.sku} — ${r.name_th}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
