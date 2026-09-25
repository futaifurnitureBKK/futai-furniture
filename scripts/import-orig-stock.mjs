// Seeds real stock numbers from the original workbook's 库存表格 sheet into
// src/data/stock-demo.json (run AFTER build-stock-demo.mjs).
// Usage: node scripts/import-orig-stock.mjs <orig-dump.json>
//   orig-dump.json = { "库存表格": [[...], ...] } (sheet_to_json header:1)
//
// Sheet columns: 序号 | 型号 | 图片 | 规格 | 仓库数量 | 锁单数量 | 实际数量 | 备注
//   仓库数量 = physically in warehouse, 锁单数量 = locked for named customers,
//   实际数量 = sellable now (warehouse - locked)  → Available / Reserved here.
import fs from "node:fs";

const dumpPath = process.argv[2];
if (!dumpPath) throw new Error("Pass the dump json path");
const dump = JSON.parse(fs.readFileSync(dumpPath, "utf8"));
const file = "src/data/stock-demo.json";
const data = JSON.parse(fs.readFileSync(file, "utf8"));

const EXTRA_CATEGORIES = [
  { key: "discussion-set", zh: "洽谈桌椅", en: "Discussion Table & Chairs", th: "ชุดโต๊ะเจรจา / รับแขก" },
  { key: "coffee-table", zh: "茶几", en: "Coffee Table", th: "โต๊ะกลาง" },
  { key: "dining", zh: "餐厅家具", en: "Dining Furniture", th: "เฟอร์นิเจอร์ห้องอาหาร" },
  { key: "bedroom", zh: "卧室家具", en: "Bedroom Furniture", th: "เฟอร์นิเจอร์ห้องนอน" },
  { key: "sample", zh: "样板", en: "Showroom Samples", th: "สินค้าตัวอย่าง (โชว์รูม)" },
];
EXTRA_CATEGORIES.forEach((c) => {
  if (!data.categories.some((x) => x.key === c.key)) data.categories.push(c);
});

const CAT_MAP = {
  前台: "reception",
  职员办公桌: "task-desk",
  总裁办公桌: "boss-desk",
  屏风办公桌: "workstation",
  办公椅: "office-chair",
  会议桌: "meeting-table",
  茶桌椅: "tea-table",
  洽谈桌椅: "discussion-set",
  茶几: "coffee-table",
  文件柜: "cabinet",
  沙发: "office-sofa",
  餐厅家具: "dining",
  卧室家具: "bedroom",
  样板: "sample",
};

const clean = (s) => String(s ?? "").replace(/[ \t]+/g, " ").trim();
const canon = (s) => String(s).toUpperCase().replace(/[^A-Z0-9一-鿿]/g, "");
const sizeKey = (s) =>
  String(s)
    .replace(/mm/gi, "")
    .replace(/[WDHwdh]/g, "")
    .replace(/\s+/g, "")
    .replace(/[x×]/gi, "*");

// "茶桌WG-2485   （超晶石）" / "T-836\nXS530-3" / "RG-T10A\n(右)"
function splitCode(raw) {
  const lines = String(raw).split(/\n+/).map(clean).filter(Boolean);
  let main = lines[0] ?? "";
  const extras = lines.slice(1);
  const paren = [...main.matchAll(/[（(]([^）)]*)[）)]/g)].map((m) => m[1]);
  main = main.replace(/[（(][^）)]*[）)]/g, "").trim();
  main = main.replace(/^(茶桌|座椅|日规-?)/, "").trim();
  const notes = [...paren, ...extras.filter((e) => /[（(]/.test(e)).map((e) => e.replace(/[（()）]/g, ""))];
  const option = extras.find((e) => !/[（(]/.test(e)) ?? "";
  return { code: main, option: option ?? "", notes };
}

function parseDims(size) {
  const nums = [...String(size).replace(/mm/gi, "").matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  if (nums.length < 2 || nums.length > 3) return null;
  return { w: nums[0], d: nums[1], h: nums[2] ?? null };
}

// index existing variants by canonical code
const byCode = new Map();
data.products.forEach((p) =>
  p.variants.forEach((v) => {
    const k = canon(v.code ?? p.code);
    if (!byCode.has(k)) byCode.set(k, []);
    byCode.get(k).push({ p, v });
  })
);
const canonKeys = [...byCode.keys()];

function findCandidates(code) {
  const c = canon(code);
  if (byCode.has(c)) return byCode.get(c);
  if (c.length >= 5) {
    const hit = canonKeys.find((k) => k.endsWith(c) && k.length - c.length <= 3);
    if (hit) return byCode.get(hit);
  }
  // "A2501灰" in the stock sheet vs "A2501 灰色" in the price list
  if (/[一-鿿]/.test(c)) {
    const hit = canonKeys.find((k) => k.startsWith(c) && /^[一-鿿]{1,2}$/.test(k.slice(c.length)));
    if (hit) return byCode.get(hit);
  }
  return null;
}

let nextNo = Math.max(...data.products.map((p) => p.no)) + 1000;
const newByKey = new Map();
const seed = {};
const report = { exact: 0, addedSize: 0, newProducts: 0, newVariants: 0, merged: 0, oversold: [] };

const rows = dump["库存表格"];
let section = "";
rows.slice(1).forEach((r) => {
  if (r[1] === "" && typeof r[0] === "string" && r[0]) {
    section = r[0].trim();
    return;
  }
  if (r[1] === "") return;
  const category = CAT_MAP[section] ?? "other";
  const split = splitCode(r[1]);
  const code = split.code && split.code !== "\\" ? split.code : "(ไม่ระบุรหัส)";
  const { option, notes } = split;
  const sizeLines = String(r[3]).split(/\n+/).map(clean).filter(Boolean);
  const size = /^=DISPIMG/i.test(sizeLines[0] ?? "") ? "" : (sizeLines[0] ?? "").replace(/MM$/i, "").trim();
  const sizeNote = sizeLines.slice(1).join(" ");
  const wh = Number(r[4]) || 0;
  const locked = Number(r[5]) || 0;
  const actual = r[6] === "" ? wh - locked : Number(r[6]) || 0;
  const stockNote = [clean(String(r[7]).replace(/\n/g, "; ")), sizeNote, ...notes].filter(Boolean).join(" · ");

  const entry = { available: actual, reserved: locked, warehouse: wh, note: stockNote };
  if (actual < 0) report.oversold.push(`${code} (${size}) ${actual}`);

  let key = null;
  const isSample = section === "样板";
  const cands = !isSample && !option ? findCandidates(code) : null;

  if (cands) {
    const sk = sizeKey(size);
    const hit = cands.find((x) => sizeKey(x.v.size) === sk) ?? (cands.length === 1 && !sk ? cands[0] : null);
    if (hit) {
      key = hit.v.key;
      report.exact++;
    } else {
      // known model, size not in the price list → add a size row
      const p = cands[0].p;
      const variant = {
        size: size || "",
        dims: parseDims(size),
        price: null,
        note: "",
        key: `${p.no}:${p.variants.length}`,
        code: cands[0].v.code ?? p.code,
        fromStock: true,
      };
      p.variants.push(variant);
      key = variant.key;
      report.addedSize++;
    }
  } else {
    // model only exists in the stock sheet → new (photo-less) product
    const gk = `${category}|${canon(code)}`;
    let p = newByKey.get(gk);
    if (!p) {
      p = { no: nextNo++, code, category, variants: [], fromStock: true };
      newByKey.set(gk, p);
      data.products.push(p);
      report.newProducts++;
    }
    const variant = {
      size: size || "",
      dims: parseDims(size),
      price: null,
      note: option,
      key: `${p.no}:${p.variants.length}`,
      code: option ? `${code} ${option}` : code,
      fromStock: true,
    };
    if (option) variant.label = option;
    p.variants.push(variant);
    key = variant.key;
    report.newVariants++;
  }

  if (seed[key]) {
    // same size listed twice → add quantities
    seed[key].available += entry.available;
    seed[key].reserved += entry.reserved;
    seed[key].warehouse += entry.warehouse;
    seed[key].note = [seed[key].note, entry.note].filter(Boolean).join(" | ");
    report.merged++;
  } else {
    seed[key] = entry;
  }
});

// products that gained several codes/variants from the stock sheet need the
// per-row code shown in the table
data.products.forEach((p) => {
  const codes = new Set(p.variants.map((v) => v.code ?? p.code));
  if (codes.size > 1 && !p.mergedCodes) p.mergedCodes = [...codes];
});

data.stockSeed = seed;
fs.writeFileSync(file, JSON.stringify(data));

const t = Object.values(seed);
console.log(
  `stock rows seeded=${t.length} exact=${report.exact} addedSizeRows=${report.addedSize} newProducts=${report.newProducts} newVariants=${report.newVariants} mergedDuplicates=${report.merged}`
);
console.log(
  `totals: warehouse=${t.reduce((a, s) => a + s.warehouse, 0)} locked=${t.reduce((a, s) => a + s.reserved, 0)} sellable=${t.reduce((a, s) => a + s.available, 0)}`
);
console.log("over-locked (sellable < 0):", report.oversold.join("; "));
