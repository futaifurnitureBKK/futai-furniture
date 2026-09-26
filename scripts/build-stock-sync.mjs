// Turns the 库存表格 sheet of a newer workbook into src/data/stock-sync.json,
// which /api/admin/stock/sync compares against the live database.
// Usage: node scripts/build-stock-sync.mjs <dump.json> <label>
//   dump.json = { "库存表格": [[...], ...] } (sheet_to_json header:1)
import fs from "node:fs";

const [dumpPath, label] = process.argv.slice(2);
if (!dumpPath || !label) throw new Error("Usage: build-stock-sync.mjs <dump.json> <label>");
const sheet = JSON.parse(fs.readFileSync(dumpPath, "utf8"))["库存表格"];

let section = "";
const rows = [];
sheet.slice(1).forEach((r) => {
  if (r[1] === "" && typeof r[0] === "string" && r[0]) {
    section = r[0].trim();
    return;
  }
  if (r[1] === "") return;
  rows.push({
    section,
    code: String(r[1]),
    size: String(r[3]),
    wh: Number(r[4]) || 0,
    locked: Number(r[5]) || 0,
    actual: r[6] === "" ? null : Number(r[6]) || 0,
    note: String(r[7]),
  });
});

fs.writeFileSync("src/data/stock-sync.json", JSON.stringify({ label, generated: new Date().toISOString().slice(0, 10), rows }));
console.log(`${label}: ${rows.length} stock rows`);
