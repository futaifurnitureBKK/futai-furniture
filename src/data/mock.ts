import type { Category, Product, Order, Customer, QuoteRequest } from "@/types";
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
  { id: "1",  slug: "office-desk",      name_th: "โต๊ะทำงาน",               name_en: "Office Desk",            banner_url: "/cat/desk-banner.png",        description_th: "โต๊ะทำงานสไตล์โมเดิร์น ทนทาน เหมาะสำหรับสำนักงานทุกขนาด", description_en: "Modern, durable office desks for every workspace",          sort_order: 1,  product_count: 11 },
  { id: "3",  slug: "executive-desk",   name_th: "โต๊ะผู้บริหาร",           name_en: "Executive Desk",         banner_url: "/cat/desk-6.jpg",             description_th: "โต๊ะผู้บริหารดีไซน์หรู โชว์ความมั่นใจในห้องทำงาน",        description_en: "Premium executive desks that command presence",             sort_order: 2,  product_count: 8  },
  { id: "2",  slug: "workstation",      name_th: "เวิร์คสเตชั่น",           name_en: "Workstation",            banner_url: "/cat/case-banner.jpg",        description_th: "ชุดโต๊ะทำงานรวมพาร์ทิชั่น สำหรับออฟฟิศเปิดโล่ง",          description_en: "Clustered workstations with privacy panels",               sort_order: 3,  product_count: 8  },
  { id: "4",  slug: "wood-cabinet",     name_th: "ตู้เก็บเอกสารไม้",        name_en: "Wood Cabinet",           banner_url: "/cat/cabinet-banner.jpg",     description_th: "ตู้เก็บเอกสารไม้คุณภาพ ทนทาน สวยงาม",                      description_en: "Solid wood filing cabinets for organized workspaces",      sort_order: 4,  product_count: 4  },
  { id: "5",  slug: "conference-table", name_th: "โต๊ะประชุม",               name_en: "Conference Table",       banner_url: "/cat/desk-5.jpg",             description_th: "โต๊ะประชุมทรงต่างๆ รองรับ 4-20 คน เหมาะทุกห้องประชุม",     description_en: "Conference tables seating 4–20, every room covered",       sort_order: 5,  product_count: 8  },
  { id: "6",  slug: "office-chair",     name_th: "เก้าอี้สำนักงาน",         name_en: "Office Chair",           banner_url: "/cat/chair-banner.jpg",       description_th: "เก้าอี้สำนักงานเออร์โกโนมิกส์ นั่งสบายตลอดวัน",           description_en: "Ergonomic office chairs for all-day comfort",              sort_order: 6,  product_count: 30 },
  { id: "7",  slug: "lounge-chair",     name_th: "เก้าอี้รับแขก",           name_en: "Lounge Chair",           banner_url: "/cat/reception-banner.png",   description_th: "เก้าอี้พักผ่อนและรับแขก ดีไซน์สวยงาม",                     description_en: "Stylish lounge and reception seating",                     sort_order: 7,  product_count: 10 },
  { id: "8",  slug: "tea-table",        name_th: "โต๊ะน้ำชา",               name_en: "Tea Table",              banner_url: "/cat/tea-banner.png",         description_th: "โต๊ะชงชาไม้แท้ ศิลปะแบบจีน เหมาะสำหรับห้องรับแขก",        description_en: "Authentic gongfu tea tables for reception and leisure",    sort_order: 8,  product_count: 8  },
  { id: "9",  slug: "sofa",             name_th: "โซฟา",                     name_en: "Sofa",                   banner_url: "/cat/sofa-banner.jpg",        description_th: "โซฟาหนังและผ้าคุณภาพสูง สำหรับพื้นที่พักผ่อนในออฟฟิศ",    description_en: "Premium leather and fabric sofas for office lounges",      sort_order: 9,  product_count: 11 },
  { id: "10", slug: "bed-mattress",     name_th: "เตียงและที่นอน",           name_en: "Bed & Mattress",         banner_url: "/cat/bed-banner.jpg",         description_th: "เตียงและที่นอนคุณภาพสูง สำหรับโครงการอพาร์ตเมนต์",         description_en: "Quality beds and mattresses for apartment projects",       sort_order: 10, product_count: 5  },
  { id: "11", slug: "metal-cabinet",    name_th: "ตู้เหล็ก",                 name_en: "Metal Cabinet",          banner_url: "/cat/shelf-banner.jpg",       description_th: "ตู้เหล็กเก็บเอกสาร มาตรฐาน แข็งแรง ทนทาน",                description_en: "Heavy-duty metal filing and storage cabinets",             sort_order: 11, product_count: 11 },
  { id: "12", slug: "dining-table",     name_th: "โต๊ะอาหารหินอ่อน",        name_en: "Stone Dining Table",     banner_url: "/cat/coffee-banner.jpg",      description_th: "โต๊ะอาหารหินอ่อนและหินสังเคราะห์ ดีไซน์พรีเมียม",          description_en: "Marble and engineered stone dining tables",               sort_order: 12, product_count: 6  },
  { id: "13", slug: "apartment",        name_th: "เฟอร์นิเจอร์อพาร์ตเมนต์", name_en: "Apartment Furniture",    banner_url: "/cat/case-5.jpg",             description_th: "เฟอร์นิเจอร์ครบชุดสำหรับโครงการอพาร์ตเมนต์และโรงแรม",    description_en: "Complete furniture sets for apartment and hotel projects", sort_order: 13, product_count: 9  },
  { id: "14", slug: "standing-desk",    name_th: "โต๊ะปรับระดับไฟฟ้า",      name_en: "Electric Standing Desk", banner_url: "/cat/desk-4.jpg",             description_th: "โต๊ะปรับระดับได้ด้วยระบบไฟฟ้า ออกแบบเพื่อสุขภาพ",          description_en: "Electric height-adjustable desks for a healthier workday", sort_order: 14, product_count: 4  },
  { id: "15", slug: "shelf",            name_th: "ชั้นวาง",                  name_en: "Shelf",                  banner_url: "/cat/shelf-banner.jpg",       description_th: "ชั้นวางสินค้าและเอกสาร หลากหลายขนาด",                      description_en: "Storage shelving in a range of sizes",                     sort_order: 15, product_count: 2  },
];

// Build product list from Shopee Excel exports only
// Image priority: local file (REAL_IMG) > Shopee CDN (lead image) > category fallback
export const PRODUCTS: Product[] = SHOPEE_PRODUCTS.map((p) => {
  const local = REAL_IMG[p.sku];
  return { ...p, images: local ? [local] : p.images };
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

export const MOCK_ORDERS: Order[] = [
  { id:"o1", order_number:"FT-2024-001", customer_id:"c1", status:"confirmed",  total:null, delivery_method:"delivery", notes:"ต้องการใบกำกับภาษี", created_at:"2024-06-20T10:00:00Z", updated_at:"2024-06-20T12:00:00Z" },
  { id:"o2", order_number:"FT-2024-002", customer_id:"c2", status:"pending",    total:null, delivery_method:"pickup",   notes:"",                     created_at:"2024-06-21T09:00:00Z", updated_at:"2024-06-21T09:00:00Z" },
  { id:"o3", order_number:"FT-2024-003", customer_id:"c3", status:"shipped",    total:null, delivery_method:"delivery", notes:"โทรนัดก่อนส่ง",       created_at:"2024-06-22T14:00:00Z", updated_at:"2024-06-23T10:00:00Z" },
  { id:"o4", order_number:"FT-2024-004", customer_id:"c1", status:"delivered",  total:null, delivery_method:"delivery", notes:"",                     created_at:"2024-06-18T11:00:00Z", updated_at:"2024-06-19T16:00:00Z" },
  { id:"o5", order_number:"FT-2024-005", customer_id:"c4", status:"pending",    total:null, delivery_method:"pickup",   notes:"ขอใบเสนอราคาก่อน",   created_at:"2024-06-26T08:00:00Z", updated_at:"2024-06-26T08:00:00Z" },
];

export const MOCK_CUSTOMERS: Customer[] = [
  { id:"c1", name:"นายสมชาย ใจดี",       company:"ABC Co., Ltd.",    phone:"081-234-5678", email:"somchai@abc.co.th", line_id:"somchai_abc", address:"123 ถ.สุขุมวิท กรุงเทพฯ", created_at:"2024-01-15T00:00:00Z" },
  { id:"c2", name:"นางสาวมาลี รักดี",     company:"XYZ Corporation",  phone:"089-876-5432", email:"malee@xyz.com",     line_id:"malee_xyz",   address:"456 ถ.พระราม 9 กรุงเทพฯ", created_at:"2024-02-20T00:00:00Z" },
  { id:"c3", name:"นายวิชัย สุขสม",       company:"DEF Startup",      phone:"062-345-6789", email:"wichai@def.io",     line_id:"wichai_def",  address:"789 ถ.ลาดพร้าว กรุงเทพฯ", created_at:"2024-03-10T00:00:00Z" },
  { id:"c4", name:"นางมนัสนันท์ ศรีใส",   company:"GHI Holdings",     phone:"095-678-9012", email:"manasnan@ghi.co.th",line_id:"manasnan_ghi",address:"10 ถ.รัชดาภิเษก กรุงเทพฯ",  created_at:"2024-04-05T00:00:00Z" },
];

export const MOCK_QUOTES: QuoteRequest[] = [
  { id:"q1", product_id:"oc-1", customer_info:{ name:"คุณสมชาย ใจดี", company:"ABC Co., Ltd.", phone:"081-234-5678", email:"somchai@abc.co.th", line_id:"somchai_abc" }, quantity:10, message:"ต้องการ 10 ตัวสำหรับออฟฟิศใหม่", status:"pending",   created_at:"2024-06-25T10:00:00Z" },
  { id:"q2", product_id:"ed-1", customer_info:{ name:"คุณมาลี รักดี",   company:"XYZ Corp.",    phone:"089-876-5432", email:"malee@xyz.com",     line_id:"malee_xyz"   }, quantity:2,  message:"ขอดูตัวอย่างก่อน",               status:"quoted",    created_at:"2024-06-24T14:00:00Z" },
  { id:"q3", product_id:"ct-1", customer_info:{ name:"คุณวิชัย สุขสม",   company:"DEF Startup",  phone:"062-345-6789", email:"wichai@def.io",     line_id:"wichai_def"  }, quantity:1,  message:"ห้องประชุม 10 ที่นั่ง",           status:"converted", created_at:"2024-06-23T09:00:00Z" },
];
