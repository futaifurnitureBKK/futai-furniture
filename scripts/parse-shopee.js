const XLSX = require("xlsx");
const fs = require("fs");

function parseFile(filePath) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  return rows.slice(6).filter((r) => r[0] || r[2]);
}

// Use first image URL ONLY if it appears before any text in description
// (URL-first = product photo; text-first = promotional banner)
function extractLeadImage(desc) {
  const d = (desc || "").trim();
  const m = d.match(/^https:\/\/cf\.shopee\.co\.th\/file\/[^\s\r\n]+/);
  return m ? [m[0]] : [];
}

function cleanDesc(desc) {
  return (desc || "")
    .replace(/https:\/\/cf\.shopee\.co\.th\/file\/[^\s\r\n]+/g, "")
    .replace(/Q\d+[：:][^\n]*\n?A[：:][^\n]*/g, "")
    .replace(/📌[^\n]*คำถาม[^\n]*/g, "")
    .replace(/[😊🪑✅🛡️🚚📏📌]/gu, "")
    .replace(/\r\n|\r/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .substring(0, 500);
}

function extractSku(name) {
  const m =
    (name || "").match(/รุ่น\s+([A-Z0-9][A-Z0-9\-\/\.]{2,})/i) ||
    (name || "").match(/([A-Z]{2,}[-][A-Z0-9]{2,}(?:[-][A-Z0-9]+)?)\b/);
  return m ? m[1].trim() : null;
}

function detectCategory(name, desc) {
  const t = (name + " " + (desc || "")).toLowerCase();
  if (/ที่นอน|ฟูก|mattress/.test(t)) return "bed-mattress";
  if (/เตียง|bed/.test(t)) return "bed-mattress";
  if (/โซฟา|sofa/.test(t)) return "sofa";
  if (/โต๊ะน้ำชา|tea table/.test(t)) return "tea-table";
  if (/โต๊ะอาหาร|dining|หินอ่อน|หินสังเคราะห์/.test(t)) return "dining-table";
  if (/โต๊ะประชุม|conference/.test(t)) return "conference-table";
  if (/ปรับระดับไฟฟ้า|standing desk|โต๊ะยืน/.test(t)) return "standing-desk";
  if (/เวิร์คสเตชั่น|workstation/.test(t)) return "workstation";
  if (/โต๊ะผู้บริหาร|executive/.test(t)) return "executive-desk";
  if (/โต๊ะทำงาน|โต๊ะออฟฟิศ/.test(t)) return "office-desk";
  if (/ตู้เหล็ก|metal cabinet/.test(t)) return "metal-cabinet";
  if (/ตู้ไม้|ตู้เก็บ|ตู้สำนักงาน|ตู้เอกสาร/.test(t)) return "wood-cabinet";
  if (/ชั้นวาง|shelf|ชั้น/.test(t)) return "shelf";
  if (/เก้าอี้รับแขก|lounge|reception/.test(t)) return "lounge-chair";
  if (/เก้าอี้/.test(t)) return "office-chair";
  if (/อพาร์|apartment|โรงแรม|hotel/.test(t)) return "apartment";
  return "office-chair";
}

function cleanName(name) {
  return (name || "")
    .replace(/^FUTAI\s+FURNITURE\s+/i, "")
    .replace(/^FUTAI\s*/i, "")
    .trim();
}

const CAT_IDS = {
  "office-desk": "1", "workstation": "2", "executive-desk": "3",
  "wood-cabinet": "4", "conference-table": "5", "office-chair": "6",
  "lounge-chair": "7", "tea-table": "8", "sofa": "9", "bed-mattress": "10",
  "metal-cabinet": "11", "dining-table": "12", "apartment": "13",
  "standing-desk": "14", "shelf": "15",
};

function buildProducts(rows, idOffset = 0, skuCount = {}) {
  return rows.map((r, i) => {
    const shopeeId = String(r[0] || "");
    const rawName = String(r[2] || "");
    const rawDesc = String(r[3] || "");
    const name = cleanName(rawName);
    const slug = detectCategory(rawName, rawDesc);
    const catId = CAT_IDS[slug] || "6";
    let sku = extractSku(rawName) || "SP-" + shopeeId.slice(-5);
    if (skuCount[sku]) { skuCount[sku]++; sku = sku + "-" + skuCount[sku]; } else { skuCount[sku] = 1; }
    const images = extractLeadImage(rawDesc);
    const desc = cleanDesc(rawDesc);
    return {
      id: "sp-" + (idOffset + i + 1),
      sku, name_th: name, name_en: name,
      category_id: catId, category_slug: slug,
      description_th: desc, description_en: desc,
      dimensions: "", price: null, stock_status: "in_stock",
      images, tags: [], is_featured: false, view_count: 0,
      created_at: "2024-01-01", updated_at: "2024-01-01",
    };
  });
}

// Parse both files; newer file overrides older file for same SKU
const skuCount = {};
const file1Rows = parseFile("../../Copy of mass_update_basic_info_1789223733_20260711160628.xlsx");
const file2Rows = parseFile("../../mass_update_basic_info_1789223733_20260713121850.xlsx");

const products1 = buildProducts(file1Rows, 0, skuCount);
const products2 = buildProducts(file2Rows, products1.length, skuCount);

// Merge: file2 overrides file1 for matching SKUs
const skuMap = new Map();
for (const p of products1) skuMap.set(p.sku, p);
for (const p of products2) skuMap.set(p.sku, p); // override
const products = [...skuMap.values()];

// Re-assign sequential IDs
products.forEach((p, i) => { p.id = "sp-" + (i + 1); });

function serialize(p) {
  const safe = (s) => JSON.stringify(s);
  const imgs = JSON.stringify(p.images);
  return `  { id:${safe(p.id)}, sku:${safe(p.sku)}, name_th:${safe(p.name_th)}, name_en:${safe(p.name_en)}, category_id:${safe(p.category_id)}, category_slug:${safe(p.category_slug)}, description_th:${safe(p.description_th)}, description_en:${safe(p.description_en)}, dimensions:"", price:null, stock_status:"in_stock", images:${imgs}, tags:[], is_featured:false, view_count:0, created_at:"2024-01-01", updated_at:"2024-01-01" },`;
}

const withImages = products.filter((p) => p.images.length > 0);

const tsContent = `import type { Product } from "@/types";

// Auto-generated from Shopee export — ${products.length} products
// ${withImages.length} products have lead images from Shopee CDN
// Run scripts/parse-shopee.js to regenerate
export const SHOPEE_PRODUCTS: Product[] = [
${products.map(serialize).join("\n")}
];
`;

fs.mkdirSync("../src/data", { recursive: true });
fs.writeFileSync("../src/data/shopee-products.ts", tsContent, "utf8");

// Stats
const cats = {};
products.forEach((p) => { cats[p.category_slug] = (cats[p.category_slug] || 0) + 1; });
console.log("Category counts:");
Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
console.log(`\nTotal: ${products.length} products`);
console.log(`With Shopee images: ${withImages.length} (${withImages.map((p) => p.sku).join(", ")})`);
console.log(`Without images (category fallback): ${products.length - withImages.length}`);
console.log("Written to src/data/shopee-products.ts");
