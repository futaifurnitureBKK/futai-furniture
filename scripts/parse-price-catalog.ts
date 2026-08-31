// One-off: parses "ใบราคา/price catalog.xlsx" into src/data/price-catalog.ts,
// and extracts+compresses the sheet's embedded product photos into
// public/catalog-images/.
//
// The sheet is laid out as 3 side-by-side blocks per row (cols 0-3, 5-8,
// 10-13: Model, Image-formula, Size, Price), under category header rows.
// Product photos are WPS "cell images" (=DISPIMG("ID_xxx",1) formulas,
// resolved via xl/cellimages.xml + xl/_rels/cellimages.xml.rels — not the
// normal floating-image mechanism xlsx readers usually support), so the
// xlsx file's zip is unpacked by hand to pull them out.
//
// Re-run this and commit the output whenever the source spreadsheet changes.
import * as XLSX from "xlsx";
import { writeFileSync, mkdirSync, readFileSync, existsSync, rmSync } from "fs";
import { execFileSync } from "child_process";
import path from "path";
import sharp from "sharp";

const SRC = "C:\\Users\\lenovo\\Desktop\\งาน น้อง เจ\\ใบราคา\\price catalog.xlsx";
const OUT_DATA = "src/data/price-catalog.ts";
const OUT_IMAGES_DIR = "public/catalog-images";
const TMP_EXTRACT = path.join(process.env.TEMP || "C:\\Windows\\Temp", "futai-price-catalog-extract");

interface Entry {
  sku: string;
  category: string;
  size: string;
  priceLabel: string;
  price: number | null;
  image: string | null;
}

// ── 1. Unpack the xlsx (it's a zip) and build DISPIMG ID -> media file ──
if (existsSync(TMP_EXTRACT)) rmSync(TMP_EXTRACT, { recursive: true, force: true });
mkdirSync(TMP_EXTRACT, { recursive: true });
execFileSync("unzip", ["-o", SRC, "-d", TMP_EXTRACT]);

const cellImagesXml = readFileSync(path.join(TMP_EXTRACT, "xl/cellimages.xml"), "utf8");
const relsXml = readFileSync(path.join(TMP_EXTRACT, "xl/_rels/cellimages.xml.rels"), "utf8");

const ridToFile = new Map<string, string>();
for (const m of relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) {
  ridToFile.set(m[1], m[2]);
}

const idToFile = new Map<string, string>();
for (const m of cellImagesXml.matchAll(
  /name="(ID_[0-9A-F]+)"[^]*?r:embed="(rId\d+)"/g
)) {
  const file = ridToFile.get(m[2]);
  if (file) idToFile.set(m[1], file);
}
console.log(`Found ${idToFile.size} cell-image ID -> media mappings`);

// ── 2. Parse the sheet, resolving each block's DISPIMG id to a media file ──
const wb = XLSX.readFile(SRC);
const rows = XLSX.utils.sheet_to_json(wb.Sheets["Sheet1"], { header: 1, raw: false }) as (string | null)[][];

const entries: Entry[] = [];
let category = "";
const lastSku = ["", "", ""];
const lastImage: (string | null)[] = [null, null, null];

function parsePrice(label: string): number | null {
  const m = label.match(/[\d,]+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function slugify(sku: string): string {
  return sku.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

mkdirSync(OUT_IMAGES_DIR, { recursive: true });
const usedSlugs = new Set<string>();
const copyJobs: { srcMedia: string; outPath: string; publicPath: string }[] = [];

for (const row of rows) {
  if (!row || row.length === 0) continue;

  const nonEmpty = row.filter((c) => c != null && String(c).trim() !== "");
  if (nonEmpty.length === 1 && row[0] && String(row[0]).trim() !== "") {
    const text = String(row[0]).trim();
    if (!text.includes("型号") && !text.startsWith("=")) {
      category = text;
      continue;
    }
  }
  if (String(row[0] ?? "").includes("型号")) continue;

  for (const offset of [0, 5, 10]) {
    const blockIdx = offset === 0 ? 0 : offset === 5 ? 1 : 2;
    const rawSku = row[offset];
    const imageCell = row[offset + 1];
    const size = row[offset + 2];
    const priceLabel = row[offset + 3];
    const sku = rawSku != null && String(rawSku).trim() !== "" ? String(rawSku).trim().replace(/\n/g, " ") : "";

    if (sku) lastSku[blockIdx] = sku;
    const effectiveSku = sku || lastSku[blockIdx];

    // Resolve this block's product photo, if any; carry forward the last
    // one seen in this column for continuation rows (blank model cell).
    const idMatch = imageCell != null ? String(imageCell).match(/ID_[0-9A-F]+/) : null;
    let image: string | null = lastImage[blockIdx];
    if (idMatch) {
      const mediaFile = idToFile.get(idMatch[0]);
      if (mediaFile) {
        image = mediaFile;
        lastImage[blockIdx] = mediaFile;
      }
    }

    if (!effectiveSku || !size) continue;
    const sizeText = String(size).trim().replace(/\n/g, " ");
    const priceText = priceLabel != null ? String(priceLabel).trim().replace(/\n/g, " ") : "";
    if (!priceText) continue;

    let publicImagePath: string | null = null;
    if (image) {
      let slug = slugify(effectiveSku);
      if (usedSlugs.has(slug)) slug = `${slug}-${entries.length}`;
      usedSlugs.add(slug);
      const outPath = path.join(OUT_IMAGES_DIR, `${slug}.webp`);
      publicImagePath = `/catalog-images/${slug}.webp`;
      copyJobs.push({ srcMedia: path.join(TMP_EXTRACT, "xl", image), outPath, publicPath: publicImagePath });
    }

    entries.push({
      sku: effectiveSku,
      category,
      size: sizeText,
      priceLabel: priceText,
      price: parsePrice(priceText),
      image: publicImagePath,
    });
  }
}

// ── 3. Compress & write the images (resize to a thumbnail-sized webp) ──
async function run() {
  for (const job of copyJobs) {
    try {
      await sharp(job.srcMedia)
        .resize(320, 320, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(job.outPath);
    } catch (err) {
      console.warn(`  ! failed to process ${job.srcMedia}: ${(err as Error).message}`);
    }
  }
  console.log(`Wrote ${copyJobs.length} images to ${OUT_IMAGES_DIR}`);

  const header = `// Generated by scripts/parse-price-catalog.ts from "ใบราคา/price catalog.xlsx".
// Do not hand-edit — re-run the script and commit the result instead.

export interface PriceCatalogEntry {
  sku: string;
  category: string;
  size: string;
  /** Raw price text from the sheet — some entries are multi-variant and don't reduce to one number. */
  priceLabel: string;
  /** Best-effort numeric price (first amount found in priceLabel), or null if it couldn't be parsed cleanly. */
  price: number | null;
  /** Public path to a compressed product photo, or null if the sheet had none for this row. */
  image: string | null;
}

export const PRICE_CATALOG: PriceCatalogEntry[] = ${JSON.stringify(entries, null, 2)};
`;

  writeFileSync(OUT_DATA, header, "utf8");
  console.log(`Wrote ${entries.length} entries to ${OUT_DATA}`);

  rmSync(TMP_EXTRACT, { recursive: true, force: true });
}

run();
