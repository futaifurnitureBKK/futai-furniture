import type { Category, Product } from "@/types";
import { SHOPEE_PRODUCTS } from "./shopee-products";

// Real per-SKU images (exact matches from สินค้า/ folder)
const REAL_IMG: Record<string, string> = {
  "YN-01-4":      "/products/YN-01-4.png",
  "YN-05":        "/products/YN-05.png",
  "YN-QC-A1202":  "/products/YN-QC-A1202.png",
  "GS-GT1-WTY-C": "/products/Gs-gt-wty-c-Video.jpg",
  "DHX-301BW":    "/products/DHX-BK-BG.jpg",
  "HJ-211A-LP":   "/products/HJ-211A-LP-G.jpg",
  "HJ-350A":      "/products/HJ-350A.png",
  "GC-P05S-4":    "/products/gc-p05s-4.png",
  "A1267":        "/products/A1267.jpg",
  "A1255":        "/products/A1255.jpg",
  "WG-2482":      "/products/WG-2482.jpg",
};

// Categorised image pools from 产品图片视频_watermarked/
const CATEGORY_IMAGES: Record<string, string[]> = {
  "office-chair":     ["/cat/chair-1.jpg","/cat/chair-2.jpg","/cat/chair-3.jpg","/cat/chair-4.jpg","/cat/chair-5.png"],
  "lounge-chair":     ["/cat/reception-1.png","/products/A1267.jpg","/products/A1255.jpg","/products/a1277c.jpg","/products/a602a-1.jpg"],
  "office-desk":      ["/cat/desk-1.jpg","/cat/desk-2.jpg","/cat/desk-3.jpg","/cat/desk-4.jpg","/cat/desk-5.jpg"],
  "workstation":      ["/cat/case-1.jpg","/cat/case-2.jpg","/cat/desk-3.jpg","/cat/desk-4.jpg","/cat/case-3.jpg"],
  "executive-desk":   ["/cat/desk-5.jpg","/cat/desk-6.jpg","/cat/desk-7.jpg","/cat/desk-2.jpg","/cat/desk-1.jpg"],
  "conference-table": ["/cat/desk-4.jpg","/cat/desk-6.jpg","/cat/case-4.jpg","/cat/desk-3.jpg","/cat/desk-5.jpg"],
  "standing-desk":    ["/cat/desk-1.jpg","/cat/desk-2.jpg","/cat/desk-3.jpg","/cat/desk-4.jpg"],
  "wood-cabinet":     ["/cat/cabinet-1.jpg","/cat/cabinet-2.jpg","/cat/cabinet-3.jpg","/cat/cabinet-4.jpg"],
  "metal-cabinet":    ["/cat/shelf-1.jpg","/cat/shelf-2.jpg","/cat/cabinet-1.jpg","/cat/cabinet-2.jpg","/cat/cabinet-3.jpg"],
  "shelf":            ["/cat/shelf-1.jpg","/cat/shelf-2.jpg"],
  "sofa":             ["/cat/sofa-1.jpg","/cat/sofa-2.jpg","/cat/sofa-3.jpg","/cat/sofa-4.jpg","/cat/sofa2-1.jpg"],
  "tea-table":        ["/cat/tea-1.jpg","/cat/tea-2.png","/cat/tea-3.jpg","/cat/tea-4.png","/cat/coffee-1.jpg"],
  "dining-table":     ["/cat/coffee-1.jpg","/cat/coffee-2.jpg","/cat/tea-1.jpg","/cat/tea-2.png","/cat/tea-3.jpg"],
  "bed-mattress":     ["/cat/bed-1.jpg","/cat/bed-2.jpg","/cat/bed-3.jpg","/cat/bed-4.jpg"],
  "apartment":        ["/cat/case-1.jpg","/cat/case-2.jpg","/cat/case-3.jpg","/cat/case-4.jpg","/cat/case-5.jpg"],
};

export const CATEGORIES: Category[] = [
  { id: "1",  slug: "office-desk",      name_th: "โต๊ะทำงาน",               name_en: "Office Desk",            name_zh: "办公桌",     banner_url: "/cat/desk-banner.png",        description_th: "โต๊ะทำงานสไตล์โมเดิร์น ทนทาน เหมาะสำหรับสำนักงานทุกขนาด", description_en: "Modern, durable office desks for every workspace",          description_zh: "现代耐用的办公桌，适合各种规模的办公室",       sort_order: 1,  product_count: 11 },
  { id: "3",  slug: "executive-desk",   name_th: "โต๊ะผู้บริหาร",           name_en: "Executive Desk",         name_zh: "行政桌",     banner_url: "/cat/desk-6.jpg",             description_th: "โต๊ะผู้บริหารดีไซน์หรู โชว์ความมั่นใจในห้องทำงาน",        description_en: "Premium executive desks that command presence",             description_zh: "高端行政桌设计，彰显工作自信",                 sort_order: 2,  product_count: 8  },
  { id: "2",  slug: "workstation",      name_th: "เวิร์คสเตชั่น",           name_en: "Workstation",            name_zh: "工作站",     banner_url: "/cat/case-banner.jpg",        description_th: "ชุดโต๊ะทำงานรวมพาร์ทิชั่น สำหรับออฟฟิศเปิดโล่ง",          description_en: "Clustered workstations with privacy panels",               description_zh: "带隔断的组合工作站，适合开放式办公室",         sort_order: 3,  product_count: 8  },
  { id: "4",  slug: "wood-cabinet",     name_th: "ตู้เก็บเอกสารไม้",        name_en: "Wood Cabinet",           name_zh: "木质文件柜", banner_url: "/cat/cabinet-banner.jpg",     description_th: "ตู้เก็บเอกสารไม้คุณภาพ ทนทาน สวยงาม",                      description_en: "Solid wood filing cabinets for organized workspaces",      description_zh: "优质耐用美观的木质文件柜",                     sort_order: 4,  product_count: 4  },
  { id: "5",  slug: "conference-table", name_th: "โต๊ะประชุม",               name_en: "Conference Table",       name_zh: "会议桌",     banner_url: "/cat/desk-5.jpg",             description_th: "โต๊ะประชุมทรงต่างๆ รองรับ 4-20 คน เหมาะทุกห้องประชุม",     description_en: "Conference tables seating 4–20, every room covered",       description_zh: "多种造型的会议桌，可容纳4-20人，适合各类会议室", sort_order: 5,  product_count: 8  },
  { id: "6",  slug: "office-chair",     name_th: "เก้าอี้สำนักงาน",         name_en: "Office Chair",           name_zh: "办公椅",     banner_url: "/cat/chair-banner.jpg",       description_th: "เก้าอี้สำนักงานเออร์โกโนมิกส์ นั่งสบายตลอดวัน",           description_en: "Ergonomic office chairs for all-day comfort",              description_zh: "人体工学办公椅，全天舒适久坐",                 sort_order: 6,  product_count: 30 },
  { id: "7",  slug: "lounge-chair",     name_th: "เก้าอี้รับแขก",           name_en: "Lounge Chair",           name_zh: "休闲椅",     banner_url: "/cat/reception-banner.png",   description_th: "เก้าอี้พักผ่อนและรับแขก ดีไซน์สวยงาม",                     description_en: "Stylish lounge and reception seating",                     description_zh: "休闲接待椅，设计精美",                         sort_order: 7,  product_count: 10 },
  { id: "8",  slug: "tea-table",        name_th: "โต๊ะน้ำชา",               name_en: "Tea Table",              name_zh: "茶桌",       banner_url: "/cat/tea-banner.png",         description_th: "โต๊ะชงชาไม้แท้ ศิลปะแบบจีน เหมาะสำหรับห้องรับแขก",        description_en: "Authentic gongfu tea tables for reception and leisure",    description_zh: "实木功夫茶桌，中式艺术，适合接待区",           sort_order: 8,  product_count: 8  },
  { id: "9",  slug: "sofa",             name_th: "โซฟา",                     name_en: "Sofa",                   name_zh: "沙发",       banner_url: "/cat/sofa-banner.jpg",        description_th: "โซฟาหนังและผ้าคุณภาพสูง สำหรับพื้นที่พักผ่อนในออฟฟิศ",    description_en: "Premium leather and fabric sofas for office lounges",      description_zh: "优质皮革布艺沙发，适合办公室休息区",           sort_order: 9,  product_count: 11 },
  { id: "10", slug: "bed-mattress",     name_th: "เตียงและที่นอน",           name_en: "Bed & Mattress",         name_zh: "床与床垫",   banner_url: "/cat/bed-banner.jpg",         description_th: "เตียงและที่นอนคุณภาพสูง สำหรับโครงการอพาร์ตเมนต์",         description_en: "Quality beds and mattresses for apartment projects",       description_zh: "优质床与床垫，适合公寓项目",                   sort_order: 10, product_count: 5  },
  { id: "11", slug: "metal-cabinet",    name_th: "ตู้เหล็ก",                 name_en: "Metal Cabinet",          name_zh: "铁皮柜",     banner_url: "/cat/shelf-banner.jpg",       description_th: "ตู้เหล็กเก็บเอกสาร มาตรฐาน แข็งแรง ทนทาน",                description_en: "Heavy-duty metal filing and storage cabinets",             description_zh: "标准坚固耐用的铁质文件柜",                     sort_order: 11, product_count: 11 },
  { id: "12", slug: "dining-table",     name_th: "โต๊ะอาหารหินอ่อน",        name_en: "Stone Dining Table",     name_zh: "大理石餐桌", banner_url: "/cat/coffee-banner.jpg",      description_th: "โต๊ะอาหารหินอ่อนและหินสังเคราะห์ ดีไซน์พรีเมียม",          description_en: "Marble and engineered stone dining tables",               description_zh: "大理石与人造石餐桌，高端设计",                 sort_order: 12, product_count: 6  },
  { id: "13", slug: "apartment",        name_th: "เฟอร์นิเจอร์อพาร์ตเมนต์", name_en: "Apartment Furniture",    name_zh: "公寓家具",   banner_url: "/cat/case-5.jpg",             description_th: "เฟอร์นิเจอร์ครบชุดสำหรับโครงการอพาร์ตเมนต์และโรงแรม",    description_en: "Complete furniture sets for apartment and hotel projects", description_zh: "公寓和酒店项目的整套家具",                     sort_order: 13, product_count: 9  },
  { id: "14", slug: "standing-desk",    name_th: "โต๊ะปรับระดับไฟฟ้า",      name_en: "Electric Standing Desk", name_zh: "电动升降桌", banner_url: "/cat/desk-4.jpg",             description_th: "โต๊ะปรับระดับได้ด้วยระบบไฟฟ้า ออกแบบเพื่อสุขภาพ",          description_en: "Electric height-adjustable desks for a healthier workday", description_zh: "电动升降办公桌，为健康而设计",                 sort_order: 14, product_count: 4  },
  { id: "15", slug: "shelf",            name_th: "ชั้นวาง",                  name_en: "Shelf",                  name_zh: "置物架",     banner_url: "/cat/shelf-banner.jpg",       description_th: "ชั้นวางสินค้าและเอกสาร หลากหลายขนาด",                      description_en: "Storage shelving in a range of sizes",                     description_zh: "多种尺寸的储物置物架",                         sort_order: 15, product_count: 2  },
];

// Build product list from Shopee Excel exports only
// Image priority: local file (REAL_IMG) > Shopee CDN (lead image) > category fallback
export const PRODUCTS: Product[] = SHOPEE_PRODUCTS.map((p) => {
  const local = REAL_IMG[p.sku];
  return { ...p, is_active: true, name_zh: "", description_zh: "", images: local ? [local] : p.images };
});

// Category fallback for products still without any image
const _catIdx: Record<string, number> = {};
for (const p of PRODUCTS) {
  if (!p.images[0]) {
    const pool = CATEGORY_IMAGES[p.category_slug] ?? ["/cat/chair-1.jpg"];
    const idx = _catIdx[p.category_slug] ?? 0;
    p.images = [pool[idx % pool.length]];
    _catIdx[p.category_slug] = idx + 1;
  }
}

export const FEATURED_PRODUCTS = PRODUCTS.filter((p) => p.is_featured);

export function getProductsByCategory(slug: string): Product[] {
  return PRODUCTS.filter((p) => p.category_slug === slug);
}

export function getProductBySku(sku: string): Product | undefined {
  return PRODUCTS.find((p) => p.sku === sku);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase();
  return PRODUCTS.filter(
    (p) =>
      p.sku.toLowerCase().includes(q) ||
      p.name_th.includes(q) ||
      p.name_en.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
  );
}

