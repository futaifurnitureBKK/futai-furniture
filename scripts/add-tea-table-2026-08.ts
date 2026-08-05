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

// From "Brown Minimalist Furniture Catalog Promotion Presentation.pdf" in
// public/Tea table/ — shown as the real catalog page image, same convention
// as the Sofa Station catalog-sheet products.
const PRODUCTS: NewProduct[] = [
  {
    sku: "JHY-JX",
    category_slug: "tea-table",
    name_th: "ชุดโต๊ะน้ำชา Serenity ไม้วอลนัทแท้ (โต๊ะ + เก้าอี้ 5 ตัว) JHY-JX",
    name_en: "Serenity Tea Room Collection — Rich Walnut (Table + 5 Chairs) JHY-JX",
    name_zh: "Serenity 茶室套装 胡桃木色（茶桌+5把椅子）JHY-JX",
    description_th: "ชุดโต๊ะน้ำชาสไตล์จีนคลาสสิก โทนสีวอลนัทเข้ม โต๊ะแกะสลักลวดลายประณีต พร้อมเก้าอี้เข้าชุด 5 ตัว โครงไม้เนื้อแข็งทั้งชุด จำหน่ายเป็นชุดหรือแยกชิ้นได้ เหมาะสำหรับห้องรับแขกหรือมุมชงชาที่ต้องการความหรูหราแบบตะวันออก",
    description_en: "A classic Chinese-style tea room collection in rich walnut, featuring an intricately carved grand table with 5 matching chairs, all in solid hardwood. Available as a complete set or individual pieces — suited to a reception room or a tea corner with an Eastern, refined feel.",
    description_zh: "中式古典茶室套装，深胡桃木色，茶桌雕工精致，配5把同款椅子，全套实木框架。可整套或单件购买，适合会客厅或需要东方雅致氛围的茶室角落。",
    dimensions: "5 ที่นั่ง (กว้าง×ลึก×สูง) 1800 × 800 × 760 มม. — โครงไม้เนื้อแข็ง (Hardwood)",
    images: ["/products/JHY-JX-1.jpg"],
    tags: ["ไม้วอลนัท", "5 ที่นั่ง", "สไตล์จีน", "โครงไม้เนื้อแข็ง"],
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
    color_variants: [],
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
