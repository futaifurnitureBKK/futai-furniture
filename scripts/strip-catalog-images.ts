// One-off utility: copies "ใบราคา/price catalog.xlsx" to a new file with
// every embedded product photo removed (both the WPS cell-images referenced
// via =DISPIMG(...) formulas, and the handful of plain floating images) —
// leaving all rows, columns, styles, and merged cells intact so the photo
// cells are blank and ready for new pictures to be pasted in.
//
// Re-run whenever a fresh "blank photos" copy of the price list is needed.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { execFileSync } from "child_process";
import path from "path";

const SRC = "C:\\Users\\lenovo\\Desktop\\งาน น้อง เจ\\ใบราคา\\price catalog.xlsx";
const OUT = "C:\\Users\\lenovo\\Desktop\\งาน น้อง เจ\\ใบราคา\\price catalog (สำหรับใส่รูป).xlsx";
const TMP = path.join(process.env.TEMP || "C:\\Windows\\Temp", "futai-strip-catalog-images");

if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
execFileSync("unzip", ["-o", SRC, "-d", TMP]);

// ── Drop every image-carrying part ──
rmSync(path.join(TMP, "xl/media"), { recursive: true, force: true });
rmSync(path.join(TMP, "xl/cellimages.xml"), { force: true });
rmSync(path.join(TMP, "xl/_rels/cellimages.xml.rels"), { force: true });
rmSync(path.join(TMP, "xl/drawings"), { recursive: true, force: true });
rmSync(path.join(TMP, "xl/worksheets/_rels"), { recursive: true, force: true });

// ── workbook.xml.rels: drop the cellImage relationship ──
const workbookRelsPath = path.join(TMP, "xl/_rels/workbook.xml.rels");
let workbookRels = readFileSync(workbookRelsPath, "utf8");
workbookRels = workbookRels.replace(/<Relationship[^>]*Type="[^"]*cellImage"[^>]*\/>/, "");
writeFileSync(workbookRelsPath, workbookRels, "utf8");

// ── [Content_Types].xml: drop the cellimages.xml and drawing1.xml overrides ──
const contentTypesPath = path.join(TMP, "[Content_Types].xml");
let contentTypes = readFileSync(contentTypesPath, "utf8");
contentTypes = contentTypes
  .replace(/<Override PartName="\/xl\/cellimages\.xml"[^>]*\/>/, "")
  .replace(/<Override PartName="\/xl\/drawings\/drawing1\.xml"[^>]*\/>/, "");
writeFileSync(contentTypesPath, contentTypes, "utf8");

// ── sheet1.xml: drop the <drawing/> reference and blank out every
//    DISPIMG cell (keeping its style so the cell looks/sizes the same) ──
const sheetPath = path.join(TMP, "xl/worksheets/sheet1.xml");
let sheet = readFileSync(sheetPath, "utf8");
sheet = sheet.replace(/<drawing r:id="rId1"\/>/, "");
const { count } = (() => {
  let n = 0;
  const replaced = sheet.replace(
    /<c r="([A-Z]+\d+)" s="(\d+)" t="str"><f>_xlfn\.DISPIMG\([^<]*<\/f><v>[^<]*<\/v><\/c>/g,
    (_m, r, s) => {
      n++;
      return `<c r="${r}" s="${s}"/>`;
    }
  );
  sheet = replaced;
  return { count: n };
})();
writeFileSync(sheetPath, sheet, "utf8");
console.log(`Blanked ${count} DISPIMG cell(s)`);

// ── Re-zip into the new file (PowerShell's Compress-Archive — no `zip`
//    binary available in this shell; it also refuses to write a .xlsx
//    extension directly, so zip to .zip first and rename) ──
if (existsSync(OUT)) rmSync(OUT, { force: true });
const tmpZip = TMP + ".zip";
if (existsSync(tmpZip)) rmSync(tmpZip, { force: true });
execFileSync("powershell.exe", [
  "-NoProfile",
  "-NonInteractive",
  "-Command",
  `Compress-Archive -Path '${TMP}\\*' -DestinationPath '${tmpZip}' -Force`,
]);
execFileSync("powershell.exe", [
  "-NoProfile",
  "-NonInteractive",
  "-Command",
  `Move-Item -Path '${tmpZip}' -Destination '${OUT}' -Force`,
]);

rmSync(TMP, { recursive: true, force: true });
console.log(`Wrote ${OUT}`);
