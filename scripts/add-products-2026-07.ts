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
    sku: "GC-poss4",
    category_slug: "workstation",
    name_th: "โต๊ะทำงานพาร์ทิชั่น ปรับระดับไฟฟ้า พร้อมไฟ LED 3 สี",
    name_en: "Electric Height-Adjustable Partition Workstation with 3-Color LED Light",
    name_zh: "电动升降隔断工作站 带三色LED灯",
    description_th: "โต๊ะทำงานแบบพาร์ทิชั่นคู่ ปรับความสูงด้วยระบบไฟฟ้า 3 ระดับ พร้อมฉากกั้นความเป็นส่วนตัวและไฟ LED ปรับได้ 3 สีติดตั้งเหนือโต๊ะ ช่วยถนอมสายตา เหมาะสำหรับออฟฟิศที่ต้องการจัดพื้นที่ทำงานเป็นสัดส่วน",
    description_en: "Dual-desk partition workstation with electric 3-level height adjustment, a privacy divider screen, and a 3-color adjustable LED task light mounted overhead — ideal for offices that need defined, comfortable individual workspaces.",
    description_zh: "双人隔断工作站，配备电动三段升降、隐私隔断屏风及可调三色LED台灯，适合需要划分独立工作区域的办公室。",
    dimensions: "โต๊ะคู่ 2 ที่นั่ง ปรับความสูงไฟฟ้า 3 ระดับ พร้อมฉากกั้น",
    images: ["/products/GC-poss4-1.png", "/products/GC-poss4-2.jpg"],
    tags: ["ปรับระดับไฟฟ้า", "มีฉากกั้น", "ไฟ LED 3 สี"],
  },
  {
    sku: "BJ-6344",
    category_slug: "sofa",
    name_th: "โซฟาหนังเดี่ยว 1 ที่นั่ง BJ-6344",
    name_en: "BJ-6344 Single-Seat Leather Armchair",
    name_zh: "BJ-6344 单人真皮沙发椅",
    description_th: "โซฟาหนังเดี่ยวทรงโมเดิร์น พนักพิงหนา นั่งสบาย โครงขาเหล็กสีดำ เหมาะสำหรับมุมพักผ่อนหรือโซนต้อนรับแขก",
    description_en: "A modern single-seat leather armchair with plush cushioning and black metal legs — great for a lounge corner or reception area.",
    description_zh: "现代单人真皮沙发椅，坐垫厚实舒适，黑色金属脚架，适合休息角或接待区。",
    dimensions: "เก้าอี้เดี่ยว 1 ที่นั่ง",
    images: ["/products/BJ-6344-1.png", "/products/BJ-6344-2.png"],
    tags: ["หนัง", "เดี่ยว", "รับแขก"],
  },
  {
    sku: "BJ-6427",
    category_slug: "sofa",
    name_th: "โซฟาหนัง 3 ที่นั่ง BJ-6427",
    name_en: "BJ-6427 3-Seater Leather Sofa",
    name_zh: "BJ-6427 三人真皮沙发",
    description_th: "โซฟาหนัง 3 ที่นั่ง ดีไซน์เรียบหรู โทนสีเทาเข้ม โครงขาเหล็กบาง เหมาะสำหรับห้องรับรอง ล็อบบี้ หรือโซนรอพบลูกค้า",
    description_en: "A sleek 3-seater leather sofa in dark gray with slim metal legs — well suited to reception areas, lobbies, or client waiting zones.",
    description_zh: "深灰色三人真皮沙发，设计简约大方，细金属脚架，适合会客室、大堂或客户等候区。",
    dimensions: "โซฟา 3 ที่นั่ง",
    images: ["/products/BJ-6427-1.png", "/products/BJ-6427-2.png"],
    tags: ["หนัง", "3 ที่นั่ง", "รับแขก"],
  },
  {
    sku: "T-007",
    category_slug: "sofa",
    name_th: "โซฟาเบดผ้าคอร์ดูรอย ปรับนอนได้ T-007",
    name_en: "T-007 Corduroy Sofa Bed, Foldable",
    name_zh: "T-007 灯芯绒沙发床 可折叠",
    description_th: "โซฟาผ้าคอร์ดูรอยที่ปรับกางเป็นเตียงนอนได้ เหมาะสำหรับพื้นที่อเนกประสงค์ ห้องนั่งเล่น หรือห้องพักรับรอง",
    description_en: "A corduroy sofa that folds out into a bed — ideal for multi-purpose rooms, living areas, or guest spaces.",
    description_zh: "灯芯绒沙发床，可折叠展开为床铺，适合多功能房间、客厅或客房。",
    dimensions: "โซฟาเบด ปรับกางเป็นเตียงนอนได้",
    images: ["/products/T-007-1.png", "/products/T-007-2.png"],
    tags: ["โซฟาเบด", "ผ้าคอร์ดูรอย", "ปรับนอนได้"],
  },
  {
    sku: "T-802",
    category_slug: "sofa",
    name_th: "โซฟาเบดผ้าคอร์ดูรอย ขนาดกะทัดรัด T-802",
    name_en: "T-802 Compact Corduroy Sofa Bed",
    name_zh: "T-802 紧凑型灯芯绒沙发床",
    description_th: "โซฟาเบดผ้าคอร์ดูรอยโทนสีเทา ขนาดกะทัดรัด เข้ากับพื้นที่จำกัดได้ดี เหมาะสำหรับห้องนั่งเล่น มุมอ่านหนังสือ หรือคอนโด",
    description_en: "A compact gray corduroy sofa bed that fits well in tight spaces — great for living rooms, reading corners, or condos.",
    description_zh: "灰色灯芯绒紧凑型沙发床，适合空间有限的客厅、阅读角或公寓。",
    dimensions: "โซฟาเบดขนาดกะทัดรัด",
    images: ["/products/T-802-1.png", "/products/T-802-2.png"],
    tags: ["โซฟาเบด", "ผ้าคอร์ดูรอย", "ขนาดกะทัดรัด"],
  },
  {
    sku: "T-836",
    category_slug: "sofa",
    name_th: "โซฟาผ้า 2 ที่นั่ง หมอนอิงในตัว T-836",
    name_en: "T-836 2-Seater Fabric Sofa with Tufted Cushioning",
    name_zh: "T-836 二人布艺沙发",
    description_th: "โซฟาผ้า 2 ที่นั่ง โทนสีเทาอ่อน เบาะนั่งหนานุ่มแบบทัฟติ้ง ดีไซน์เรียบง่ายเข้าได้กับทุกสไตล์ห้อง",
    description_en: "A light gray 2-seater fabric sofa with soft tufted cushioning — a simple, versatile design that fits most room styles.",
    description_zh: "浅灰色二人布艺沙发，坐垫厚实柔软，设计简约百搭。",
    dimensions: "โซฟาผ้า 2 ที่นั่ง",
    images: ["/products/T-836-1.png", "/products/T-836-2.png"],
    tags: ["ผ้า", "2 ที่นั่ง"],
  },
  {
    sku: "AFT-034",
    category_slug: "metal-cabinet",
    name_th: "ตู้เหล็กเก็บเอกสาร แบบลิ้นชัก มีระบบล็อกกุญแจ AFT-034",
    name_en: "AFT-034 Steel Filing Cabinet with Lock",
    name_zh: "AFT-034 带锁钢制文件柜",
    description_th: "ตู้เหล็กเก็บเอกสารแบบลิ้นชัก มีระบบล็อกกุญแจทุกช่อง มีช่องป้ายระบุหมวดหมู่ ช่วยจัดเก็บเอกสารเป็นระเบียบและปลอดภัย เหมาะสำหรับสำนักงานทุกขนาด",
    description_en: "A steel filing cabinet with lockable drawers and label slots for each compartment — keeps documents organized and secure, suitable for offices of any size.",
    description_zh: "钢制文件柜，每个抽屉均可上锁，配有标签插槽，帮助文件井然有序、安全存放，适合各类办公室。",
    dimensions: "ตู้เหล็กลิ้นชัก มีระบบล็อกกุญแจ",
    images: ["/products/AFT-034-1.png", "/products/AFT-034-2.jpg"],
    tags: ["เหล็ก", "มีกุญแจล็อก", "ลิ้นชัก"],
  },
  {
    sku: "AFT-093",
    category_slug: "metal-cabinet",
    name_th: "ตู้เอกสารเหล็กบานกระจก AFT-093",
    name_en: "AFT-093 Steel Glass-Door Document Cabinet",
    name_zh: "AFT-093 钢制玻璃门文件柜",
    description_th: "ตู้เอกสารเหล็กบานกระจกใส มองเห็นเอกสารภายในได้ง่าย มีชั้นวางปรับระดับได้ 4 ชั้น ระบบกุญแจล็อก 2 จุด โครงสร้างเหล็กคุณภาพสูง รับประกันโครงสร้าง 2 ปี",
    description_en: "A steel document cabinet with clear glass doors for easy visibility, 4 adjustable shelves, a 2-point locking system, and high-quality steel construction — 2-year structural warranty.",
    description_zh: "钢制玻璃门文件柜，可清晰看到内部文件，4层可调节层板，双点锁系统，优质钢材结构，结构保修2年。",
    dimensions: "85 x 39 x 180 ซม.",
    images: ["/products/AFT-093-1.png", "/products/AFT-093-2.png"],
    tags: ["เหล็ก", "บานกระจก", "รับประกัน 2 ปี"],
  },
  {
    sku: "AFT-112",
    category_slug: "metal-cabinet",
    name_th: "ตู้ล็อกเกอร์เหล็ก 12 ช่อง AFT-112",
    name_en: "AFT-112 12-Compartment Steel Locker",
    name_zh: "AFT-112 12门钢制更衣柜",
    description_th: "ตู้ล็อกเกอร์เหล็ก 12 ช่อง แต่ละช่องมีระบบกุญแจล็อกแยกอิสระ มีช่องระบายอากาศลดความอับชื้น โครงสร้างเหล็กหนาแข็งแรง เหมาะสำหรับสำนักงาน โรงเรียน หรือพื้นที่ส่วนกลาง รับประกัน 2 ปี",
    description_en: "A 12-compartment steel locker with an independent lock for each door and ventilation slots to reduce moisture buildup — sturdy steel construction, ideal for offices, schools, or shared facilities. 2-year warranty.",
    description_zh: "12门钢制更衣柜，每个储物格独立上锁，配有通风口防潮，钢材厚实耐用，适合办公室、学校或公共场所，保修2年。",
    dimensions: "90 x 35 x 180 ซม.",
    images: ["/products/AFT-112-1.png", "/products/AFT-112-2.png"],
    tags: ["เหล็ก", "ล็อกเกอร์", "12 ช่อง", "รับประกัน 2 ปี"],
  },
  {
    sku: "DM-W045",
    category_slug: "metal-cabinet",
    name_th: "ตู้เหล็กอเนกประสงค์ บานกระจก 2 ลิ้นชัก DM-W045",
    name_en: "DM-W045 Multi-Purpose Steel Cabinet with Glass Doors & Drawers",
    name_zh: "DM-W045 多功能钢制玻璃门文件柜（带抽屉）",
    description_th: "ตู้เหล็กอเนกประสงค์ ผสมผสานบานกระจกด้านบนสำหรับเก็บเอกสาร ลิ้นชัก 2 ช่องตรงกลาง และบานเปิดทึบด้านล่างสำหรับเก็บของ โครงสร้างเหล็กคุณภาพดี พื้นผิวทำความสะอาดง่าย",
    description_en: "A multi-purpose steel cabinet combining upper glass doors for document display, two center drawers, and lower solid-door storage — good-quality steel with an easy-to-clean surface.",
    description_zh: "多功能钢制柜，上层玻璃门展示文件，中间两个抽屉，下层实心门储物，钢材优质，表面易清洁。",
    dimensions: "ตู้เหล็กบานกระจก 2 ลิ้นชัก 2 บานเปิด",
    images: ["/products/DM-W045-1.jpg", "/products/DM-W045-2.jpg"],
    tags: ["เหล็ก", "บานกระจก", "มีลิ้นชัก"],
  },
  {
    sku: "KY-CSG1201",
    category_slug: "wood-cabinet",
    name_th: "ตู้ไซด์บอร์ดไม้ บานกระจก 2 บาน KY-CSG1201",
    name_en: "KY-CSG1201 Wood Sideboard Cabinet with Glass Doors",
    name_zh: "KY-CSG1201 木纹玻璃门餐边柜",
    description_th: "ตู้ไซด์บอร์ดผิวไม้ โทนสีธรรมชาติ บานกระจก 2 บานพร้อมลิ้นชักตรงกลาง มีขายกสูง 7 ซม. ช่วยให้ทำความสะอาดใต้ตู้ได้สะดวก เหมาะสำหรับใช้เป็นตู้เก็บของอเนกประสงค์ในออฟฟิศหรือพื้นที่ต้อนรับ",
    description_en: "A wood-finish sideboard cabinet in a natural tone with two glass doors and a center drawer, raised 7cm for easy cleaning underneath — great as multi-purpose storage in an office or reception area.",
    description_zh: "原木色餐边柜，双玻璃门设计带中央抽屉，7厘米高脚方便清洁地面，适合作为办公室或接待区的多功能储物柜。",
    dimensions: "ตู้ไซด์บอร์ดไม้ บานกระจก 2 บาน",
    images: ["/products/KY-CSG1201-1.png", "/products/KY-CSG1201-2.png"],
    tags: ["ไม้", "บานกระจก", "ไซด์บอร์ด"],
  },
  {
    sku: "MC-LC2504",
    category_slug: "wood-cabinet",
    name_th: "ตู้ลิ้นชักไม้ 2 ชั้น MC-LC2504",
    name_en: "MC-LC2504 2-Drawer Wood Storage Cube",
    name_zh: "MC-LC2504 木质双层抽屉柜",
    description_th: "ตู้ลิ้นชักไม้ทรงลูกบาศก์ขนาดกะทัดรัด 2 ชั้น ผิวไม้ลายธรรมชาติตัดกับหน้าลิ้นชักสีขาว เหมาะสำหรับวางข้างโต๊ะทำงาน โซฟา หรือใช้เป็นโต๊ะข้างในพื้นที่พักผ่อน",
    description_en: "A compact cube-shaped 2-drawer wood storage unit with a natural wood finish and white drawer fronts — ideal as a side table next to a desk, sofa, or lounge area.",
    description_zh: "紧凑型双层抽屉木柜，原木纹理搭配白色抽屉面板，适合放在办公桌、沙发旁作为边几使用。",
    dimensions: "ตู้ลิ้นชักไม้ 2 ชั้น (โต๊ะข้าง)",
    images: ["/products/MC-LC2504-1.png", "/products/MC-LC2504-2.png"],
    tags: ["ไม้", "ลิ้นชัก", "โต๊ะข้าง"],
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
