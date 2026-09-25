// Builds src/data/stock-demo.json + public/stock-demo/*.jpg from the supplier
// price-list workbook. Usage: node scripts/build-stock-demo.mjs "<path to xlsx>"
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
const JSZip = require("jszip");
const sharp = require("sharp");

const file = process.argv[2];
if (!file) throw new Error("Pass the xlsx path");

const CATEGORIES = {
  "老板桌 Boss Office Desk": { key: "boss-desk", zh: "老板桌", en: "Boss / Executive Desk", th: "โต๊ะผู้บริหาร" },
  "背景柜": { key: "back-cabinet", zh: "背景柜", en: "Back Cabinet", th: "ตู้หลังโต๊ะ / ตู้ข้างผนัง" },
  "会议桌 Meeting /Conference Table": { key: "meeting-table", zh: "会议桌", en: "Meeting / Conference Table", th: "โต๊ะประชุม" },
  "前台": { key: "reception", zh: "前台", en: "Reception Desk", th: "เคาน์เตอร์ต้อนรับ" },
  "普通员工桌 Task office desk": { key: "task-desk", zh: "普通员工桌", en: "Task Office Desk", th: "โต๊ะทำงานพนักงาน" },
  "员工办公卡位 Task Office Partition": { key: "workstation", zh: "员工办公卡位", en: "Task Office Partition", th: "เวิร์คสเตชั่น / พาร์ทิชั่น" },
  // Source says 办公桌 (desk) next to "Office Chair" — a typo, it's 办公椅.
  "办公桌 Office Chair": { key: "office-chair", zh: "办公椅", en: "Office Chair", th: "เก้าอี้สำนักงาน" },
  "办公沙发 Office Sofa": { key: "office-sofa", zh: "办公沙发", en: "Office Sofa", th: "โซฟาสำนักงาน" },
  "茶桌 Tea Table Set": { key: "tea-table", zh: "茶桌", en: "Tea Table Set", th: "ชุดโต๊ะน้ำชา" },
  "文件柜 Cabinet": { key: "cabinet", zh: "文件柜", en: "Cabinet", th: "ตู้เก็บเอกสาร" },
  "公寓家具 Apartment Furniture": { key: "apartment", zh: "公寓家具", en: "Apartment Furniture", th: "เฟอร์นิเจอร์อพาร์ตเมนต์" },
  "培训椅·专利系列": { key: "training-chair", zh: "培训椅·专利系列", en: "Training Chair (Patent Series)", th: "เก้าอี้ฝึกอบรม (ซีรีส์สิทธิบัตร)" },
  "休闲椅": { key: "lounge-chair", zh: "休闲椅", en: "Lounge Chair", th: "เก้าอี้พักผ่อน" },
};

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

function normSize(raw) {
  const s = clean(raw).replace(/\s*mm$/i, "");
  if (!s) return { size: "", dims: null };
  const m = s.match(/^(?:W)?(\d+(?:\.\d+)?)\s*[W]?\s*[*x×]\s*(?:D)?(\d+(?:\.\d+)?)\s*[D]?\s*(?:[*x×]\s*(?:H)?(\d+(?:\.\d+)?)\s*[H]?)?$/i);
  if (!m) return { size: s, dims: null };
  const [w, d, h] = [m[1], m[2], m[3]].map((x) => (x == null ? null : Number(x)));
  return { size: [w, d, h].filter((x) => x != null).join("*"), dims: { w, d, h } };
}

const wb = XLSX.readFile(file, { cellStyles: false });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }).slice(1);

const products = [];
const byNo = new Map();
const rowToNo = new Map();
let cur = null;
const issues = [];

rows.forEach((r, i) => {
  const excelRow = i + 2;
  if (r[0] !== "") {
    const rawCat = clean(r[1]);
    const cat = CATEGORIES[rawCat];
    if (!cat) issues.push(`row ${excelRow}: unknown category "${rawCat}"`);
    if (rawCat === "办公桌 Office Chair") issues.push(`row ${excelRow}+: category typo 办公桌→办公椅 fixed (Office Chair)`);
    cur = {
      no: Number(r[0]),
      code: clean(r[3]),
      category: cat?.key ?? "other",
      variants: [],
    };
    products.push(cur);
    byNo.set(cur.no, cur);
  }
  if (!cur) return;
  rowToNo.set(excelRow, cur.no);
  const { size, dims } = normSize(r[4]);
  const price = typeof r[5] === "number" ? r[5] : null;
  const note = clean(r[6]);
  const label = clean(r[4]) && !dims ? clean(r[4]) : "";
  const variant = { size, dims, price, note };
  // drop exact duplicate lines (same size/price/note) inside a product
  const dup = cur.variants.some((v) => v.size === variant.size && v.price === variant.price && v.note === variant.note);
  if (dup) {
    issues.push(`row ${excelRow}: duplicate variant of ${cur.code} removed`);
    return;
  }
  if (label) variant.size = label;
  cur.variants.push(variant);
});

// codes must be unique
const seen = new Map();
products.forEach((p) => {
  if (seen.has(p.code)) issues.push(`duplicate code ${p.code} (no ${seen.get(p.code)} & ${p.no})`);
  seen.set(p.code, p.no);
});

// ── images ──────────────────────────────────────────────────────
const outDir = path.resolve("public/stock-demo");
fs.mkdirSync(outDir, { recursive: true });
const zip = await JSZip.loadAsync(fs.readFileSync(file));
const drawing = await zip.file("xl/drawings/drawing1.xml").async("string");
const rels = await zip.file("xl/drawings/_rels/drawing1.xml.rels").async("string");
const relMap = {};
for (const m of rels.matchAll(/Id="(rId\d+)"[^>]*Target="\.\.\/media\/([^"]+)"/g)) relMap[m[1]] = m[2];
if (!Object.keys(relMap).length) {
  for (const m of rels.matchAll(/Target="\.\.\/media\/([^"]+)"[^>]*Id="(rId\d+)"/g)) relMap[m[2]] = m[1];
}

let imgCount = 0;
for (const a of drawing.matchAll(/<xdr:twoCellAnchor[\s\S]*?<\/xdr:twoCellAnchor>/g)) {
  const block = a[0];
  const row = Number(block.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/)[1]) + 1;
  const descr = block.match(/descr="([^"]*)"/)?.[1] ?? "";
  const rid = block.match(/r:embed="(rId\d+)"/)?.[1];
  const no = rowToNo.get(row);
  if (!no || !rid || !relMap[rid]) {
    issues.push(`image at row ${row} (${descr}) could not be matched`);
    continue;
  }
  const p = byNo.get(no);
  if (descr && clean(descr) !== p.code) issues.push(`image at row ${row}: label "${descr}" != code "${p.code}" (kept row match)`);
  const buf = await zip.file(`xl/media/${relMap[rid]}`).async("nodebuffer");
  const name = `p${no}.jpg`;
  await sharp(buf)
    .resize(320, 320, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 72, mozjpeg: true })
    .toFile(path.join(outDir, name));
  p.image = `/stock-demo/${name}`;
  imgCount++;
}

const output = {
  categories: Object.values(CATEGORIES),
  products,
};
fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/stock-demo.json", JSON.stringify(output));

console.log(`products=${products.length} variants=${products.reduce((n, p) => n + p.variants.length, 0)} images=${imgCount}`);
console.log(`without image=${products.filter((p) => !p.image).length}`);
console.log("issues:\n" + issues.slice(0, 40).join("\n"));
