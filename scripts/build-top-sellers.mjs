// Builds src/data/top-sellers.json from the sales sheets of the original
// workbook (2025年销售表格 / 2026年销售表格): units sold per model code.
// Usage: node scripts/build-top-sellers.mjs <path to media-free xlsx copy>
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const file = process.argv[2];
if (!file) throw new Error("Pass the xlsx path");
const wb = XLSX.readFile(file);

const canon = (s) => String(s).toUpperCase().replace(/[^A-Z0-9\u4e00-\u9fff]/g, "");
const totals = new Map();
let rowsSeen = 0;

for (const [sheet, year] of [["2025年销售表格", 2025], ["2026年销售表格", 2026]]) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: "" }).slice(2);
  for (const r of rows) {
    // "XZ-B898 （灰色）" and "XZ-B898 (黑色）" are colours of the same model
    const code = String(r[2]).split("\n")[0].replace(/[（(][^）)]*[）)]/g, "").replace(/\s+/g, " ").trim();
    const qty = Number(r[5]);
    const amount = Number(r[7]) || 0; // 总金额
    if (!code || !Number.isFinite(qty) || qty <= 0) continue;
    if (amount <= 0) continue; // gifts / samples
    rowsSeen++;
    const key = canon(code);
    const cur = totals.get(key) ?? { code, qty: 0, revenue: 0, orders: 0, y2025: 0, y2026: 0 };
    cur.qty += qty;
    cur.revenue += amount;
    cur.orders += 1;
    cur[`y${year}`] += qty;
    totals.set(key, cur);
  }
}

const top = [...totals.values()].sort((a, b) => b.qty - a.qty).slice(0, 20);
fs.writeFileSync("src/data/top-sellers.json", JSON.stringify({ generated: new Date().toISOString().slice(0, 10), top }));
console.log(`sales rows=${rowsSeen} distinct models=${totals.size}`);
top.forEach((t, i) => console.log(`${i + 1}. ${t.code}  qty=${t.qty} (2025:${t.y2025} 2026:${t.y2026})  revenue=${Math.round(t.revenue)} orders=${t.orders}`));
