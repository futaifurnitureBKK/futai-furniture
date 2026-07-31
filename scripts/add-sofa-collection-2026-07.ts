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

// Remaining pieces from the "Sofa Station" collection — completes the 11-product
// sofa lineup alongside BJ-6344, BJ-6427, T-007, T-802, T-836 (already live).
const PRODUCTS: NewProduct[] = [
  {
    sku: "B0954",
    category_slug: "sofa",
    name_th: "โซฟาผ้าเชนิล 3 ที่นั่ง + เก้าอี้เดี่ยว 2 ตัว (ชุด 5 ที่นั่ง) B0954",
    name_en: "B0954 Chenille Sofa Set — 3-Seater + 2 Armchairs (5-Seat Set)",
    name_zh: "B0954 雪尼尔布艺沙发套装 三人位+双扶手椅（五人位套装）",
    description_th: "ชุดโซฟาผ้าเชนิลโทนสีอินดิโก้ โครงไม้จริงเสริมสปริงพ็อกเก็ต นั่งสบาย ดีไซน์ร่วมสมัย จำหน่ายเป็นชุดหรือแยกชิ้นได้ เหมาะสำหรับห้องรับแขกหรือโซนพักผ่อนที่ต้องการความหรูหรา",
    description_en: "An indigo chenille sofa set with a solid wood frame and pocket-spring cushioning for a contemporary, comfortable seat. Available as a complete 5-seat set or as individual pieces — well suited to living rooms and premium lounge areas.",
    description_zh: "靛蓝色雪尼尔布艺沙发套装，实木框架配独立袋装弹簧，坐感舒适，设计现代。可整套或单件购买，适合客厅及高端休息区。",
    dimensions: "โซฟาผ้าเชนิล 3 ที่นั่ง + เก้าอี้เดี่ยว 2 ตัว (ชุด 5 ที่นั่ง)",
    images: ["/products/B0954-1.png"],
    tags: ["ผ้าเชนิล", "5 ที่นั่ง", "รับแขก"],
  },
  {
    sku: "F720",
    category_slug: "sofa",
    name_th: "โซฟา Corner โมดูลาร์ ผ้าหลากสี F720",
    name_en: "F720 Modular Corner Sectional — Multicolour",
    name_zh: "F720 模块化转角沙发 拼色布艺",
    description_th: "โซฟาโมดูลาร์ทรงมุม โครงไม้อัดเสริมฟองน้ำความหนาแน่นสูง หุ้มผ้าทอ ปรับผังที่นั่งได้ตามพื้นที่ใช้งาน เหมาะสำหรับเลานจ์ โซนต้อนรับ หรือพื้นที่ทำงานร่วมกัน",
    description_en: "A modular corner sectional with a plywood and high-density foam frame, finished in woven fabric. Configure the layout to suit your space — ideal for lounges, reception areas, and collaborative spaces.",
    description_zh: "模块化转角沙发，夹板与高密度海绵框架，机织面料，可根据空间自由配置布局，适合休闲区、接待区及协作空间。",
    dimensions: "โซฟา Corner โมดูลาร์ ปรับผังได้ตามพื้นที่ (รวม 3782×2550×730 มม.)",
    images: ["/products/F720-1.png"],
    tags: ["โมดูลาร์", "Corner", "ผ้าทอ"],
  },
  {
    sku: "F611-T11",
    category_slug: "sofa",
    name_th: "ม้านั่งโมดูลาร์ พนักพิงทรงแคปซูล มีชั้นเก็บของ F611-T11",
    name_en: "F611-T11 LoungeBench Module with Capsule Backrest & Storage",
    name_zh: "F611-T11 胶囊靠背模块化长凳 带收纳格",
    description_th: "ม้านั่งโมดูลาร์ โครงไม้อัดโค้งมน พนักพิงทรงแคปซูลถอดแยกได้ ใต้เบาะมีชั้นเปิดสำหรับเก็บของ เหมาะสำหรับพื้นที่ทำงานร่วมกัน ล็อบบี้ หรืออพาร์ตเมนต์",
    description_en: "A modular lounge bench with a curved plywood frame and a detachable capsule-shaped backrest, plus open storage beneath the seat — designed for collaborative workspaces, lobbies, and apartments.",
    description_zh: "模块化长凳，弧形夹板框架，可拆卸胶囊形靠背，坐垫下方设开放式收纳格，适合协作办公区、大堂及公寓。",
    dimensions: "ม้านั่งโมดูลาร์ 1320×600×430/650 มม.",
    images: ["/products/F611-T11-1.png"],
    tags: ["โมดูลาร์", "มีที่เก็บของ", "เข้าชุดได้"],
  },
  {
    sku: "F611-T12",
    category_slug: "sofa",
    name_th: "ม้านั่งโมดูลาร์ พร้อมโต๊ะข้างในตัว F611-T12",
    name_en: "F611-T12 LoungeBench Module with Integrated Side Table",
    name_zh: "F611-T12 带内置边几模块化长凳",
    description_th: "ม้านั่งโมดูลาร์ โครงไม้อัดโค้งมน มาพร้อมโต๊ะข้างในตัวสำหรับวางแล็ปท็อปหรือเครื่องดื่ม ใต้เบาะมีชั้นเปิดสำหรับเก็บของ เข้าชุดกับรุ่น F611-T11 และ F611-T7-air ได้",
    description_en: "A modular lounge bench with a curved plywood frame and a built-in side table for a laptop or drink, plus open under-seat storage — pairs with the F611-T11 bench and F611-T7-air module.",
    description_zh: "模块化长凳，弧形夹板框架，内置边几可放置笔记本电脑或饮品，坐垫下方设开放式收纳格，可与F611-T11长凳及F611-T7-air模块搭配组合。",
    dimensions: "ม้านั่งโมดูลาร์ พร้อมโต๊ะข้างในตัว 1300×640×690 มม.",
    images: ["/products/F611-T12-1.png"],
    tags: ["โมดูลาร์", "มีโต๊ะในตัว", "เข้าชุดได้"],
  },
  {
    sku: "F611-T7-air",
    category_slug: "sofa",
    name_th: "พัฟโมดูลาร์ มีชั้นเก็บของ F611-T7-air",
    name_en: "F611-T7-air Accent Module Ottoman with Storage",
    name_zh: "F611-T7-air 模块化脚凳 带收纳格",
    description_th: "พัฟโมดูลาร์ทรงสี่เหลี่ยม โครงไม้อัดโค้งมน ใต้เบาะมีชั้นเปิดสำหรับเก็บของ ใช้เป็นที่นั่งเดี่ยวหรือเข้าชุดกับม้านั่ง F611-T11 และ F611-T12 เพื่อจัดผังเลานจ์ตามต้องการ",
    description_en: "A square modular accent ottoman with a curved plywood frame and open under-seat storage. Use it as standalone seating or combine it with the F611-T11 and F611-T12 benches to build out a custom lounge layout.",
    description_zh: "方形模块化脚凳，弧形夹板框架，坐垫下方设开放式收纳格。可单独使用，也可与F611-T11、F611-T12长凳组合，自由搭配休闲区布局。",
    dimensions: "พัฟโมดูลาร์ 680×565×420 มม.",
    images: ["/products/F611-T7-air-1.png"],
    tags: ["โมดูลาร์", "มีที่เก็บของ", "เข้าชุดได้"],
  },
  {
    sku: "T-205",
    category_slug: "sofa",
    name_th: "เก้าอี้เดี่ยวผ้าชนิล ทรงนั่งสบาย T-205",
    name_en: "T-205 Compact Chenille Lounge Armchair",
    name_zh: "T-205 雪尼尔布艺单人休闲椅",
    description_th: "เก้าอี้เดี่ยวผ้าชนิลทรงนั่งสบาย ไม่มีโครงขาไม้หรือเหล็กให้เกะกะ วางได้อิสระ เหมาะสำหรับมุมพักผ่อน ห้องนั่งเล่น หรือพื้นที่อ่านหนังสือ",
    description_en: "A compact chenille lounge armchair with a low-slung, legless silhouette that places freely anywhere — great for a reading nook, living room corner, or relaxation space.",
    description_zh: "紧凑型雪尼尔布艺休闲椅，无腿式造型可自由摆放，适合阅读角、客厅一角或休闲空间。",
    dimensions: "เก้าอี้เดี่ยว Compact Armchair 880×1000×710 มม.",
    images: ["/products/T-205-1.png"],
    tags: ["ผ้าชนิล", "เดี่ยว", "เลานจ์"],
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
