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
  let s = clean(raw).replace(/\s*mm$/i, "");
  if (!s) return { size: "", dims: null };

  // "Table: 1800*800*750" / "Chair-1: 680*585*960" → component label + size
  let label = "";
  const lm = s.match(/^([A-Za-z][A-Za-z\- ]*\d*)\s*:\s*(.+)$/);
  if (lm) {
    label = lm[1].trim();
    s = lm[2].trim();
  }

  // diameter × height, e.g. Φ700*740, Ø1200*750
  const rm = s.match(/^[ΦφØø⌀]\s*(\d+(?:\.\d+)?)\s*[*x×]\s*(\d+(?:\.\d+)?)$/);
  if (rm) {
    const dia = Number(rm[1]);
    return { size: `Ø${dia}*${rm[2]}`, dims: { w: dia, d: dia, h: Number(rm[2]) }, label, round: true };
  }

  // letter-tagged in any order, e.g. "D545*W540* H790"
  const tags = [...s.matchAll(/([WDHwdh])\s*(\d+(?:\.\d+)?)/g)];
  if (tags.length >= 2 && new Set(tags.map((t) => t[1].toUpperCase())).size === tags.length && /^[\sWDHwdh\d.*x×]+$/.test(s)) {
    const pick = (k) => {
      const t = tags.find((t) => t[1].toUpperCase() === k);
      return t ? Number(t[2]) : null;
    };
    const [w, d, h] = [pick("W"), pick("D"), pick("H")];
    return { size: [w, d, h].filter((x) => x != null).join("*"), dims: { w: w ?? 0, d, h }, label };
  }

  const m = s.match(/^(?:W)?(\d+(?:\.\d+)?)\s*[W]?\s*[*x×]\s*(?:D)?(\d+(?:\.\d+)?)\s*[D]?\s*(?:[*x×]\s*(?:H)?(\d+(?:\.\d+)?)\s*[H]?)?$/i);
  if (!m) return { size: s, dims: null, label };
  const [w, d, h] = [m[1], m[2], m[3]].map((x) => (x == null ? null : Number(x)));
  return { size: [w, d, h].filter((x) => x != null).join("*"), dims: { w, d, h }, label };
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
  const { size, dims, label, round } = normSize(r[4]);
  const price = typeof r[5] === "number" ? r[5] : null;
  const note = clean(r[6]);
  const variant = { size, dims, price, note };
  if (label) variant.label = label;
  if (round) variant.round = true;

  // Source cells worth a human double-check (kept, but flagged in the UI).
  const flags = [];
  if (!dims && /\d+\s*[*x×]\s*\d+\s*[*x×]\s*\d+\s*[*x×]\s*\d+/.test(size)) flags.push("ขนาดมี 4 ตัวเลข — ตรวจสอบกับไฟล์ต้นทาง");
  if (dims?.h != null && dims.h < 200 && /chair|sofa/.test(cur.category) && !/^MM-/i.test(cur.code)) flags.push(`ความสูง ${dims.h} มม. ดูผิดปกติสำหรับเก้าอี้/โซฟา — อาจพิมพ์ตกเลข`);
  if (flags.length) {
    variant.flag = flags.join("; ");
    issues.push(`row ${excelRow}: ${cur.code} → ${variant.flag}`);
  }

  // drop exact duplicate lines (same label/size/price/note) inside a product
  const dup = cur.variants.some(
    (v) => v.size === variant.size && (v.label ?? "") === (variant.label ?? "") && v.price === variant.price && v.note === variant.note
  );
  if (dup) {
    issues.push(`row ${excelRow}: duplicate variant of ${cur.code} removed`);
    return;
  }
  // two size-less lines with different prices can't be told apart
  const clash = cur.variants.find((v) => !v.size && !variant.size && !v.label && v.note === variant.note && v.price !== variant.price);
  if (clash) {
    variant.flag = "มี 2 แถวที่ไม่ระบุขนาด/ตัวเลือก แต่ราคาต่างกัน — ตรวจสอบกับไฟล์ต้นทาง";
    clash.flag = variant.flag;
    issues.push(`row ${excelRow}: ${cur.code} ${variant.flag}`);
  }
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
    .resize(640, 640, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 76, mozjpeg: true })
    .toFile(path.join(outDir, name));
  p.image = `/stock-demo/${name}`;
  imgCount++;
}

// Size-variant rows of the same model (e.g. NXLH66A-36/-42/-48) only carry a
// photo on the first row. Reuse the nearest previous photo when the code
// clearly belongs to the same series (long shared prefix, or the JQ-G / LX-
// series whose suffix is the width in mm). Different models stay photo-less.
const commonPrefix = (a, b) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i].toLowerCase() === b[i].toLowerCase()) i++;
  return i;
};
let shared = 0;
products.forEach((p, i) => {
  if (p.image) return;
  for (let j = i - 1; j >= 0 && j >= i - 6; j--) {
    const q = products[j];
    if (!q.image || q.category !== p.category) continue;
    const pre = commonPrefix(p.code, q.code);
    if (pre >= 5 || (pre >= 4 && /^(JQ-G|LX-)/i.test(p.code))) {
      p.image = q.image;
      p.imageShared = true;
      shared++;
    }
    break;
  }
});
console.log(`images shared from same-series sibling=${shared}`);

const output = {
  categories: Object.values(CATEGORIES),
  products,
};
fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/stock-demo.json", JSON.stringify(output));

console.log(`products=${products.length} variants=${products.reduce((n, p) => n + p.variants.length, 0)} images=${imgCount}`);
console.log(`without image=${products.filter((p) => !p.image).length}`);
console.log("issues:\n" + issues.slice(0, 40).join("\n"));
