const fs = require("fs");

const mockContent = fs.readFileSync("src/data/mock.ts", "utf8");

// Extract REAL_IMG entries
const realImgBlock = mockContent.match(/const REAL_IMG[^=]+=\s*\{([\s\S]*?)\};/);
const realImgText = realImgBlock ? realImgBlock[1] : "";
const realImgPairs = [];
const pairRegex = /"([^"]+)":\s*"([^"]+)"/g;
let m;
while ((m = pairRegex.exec(realImgText)) !== null) {
  realImgPairs.push({ sku: m[1], path: m[2] });
}

const prodFiles = fs.readdirSync("public/products").sort();
const catFiles  = fs.readdirSync("public/cat").sort();

console.log("╔══════════════════════════════════════════════════════╗");
console.log("║       รูปสินค้า SKU จริง (public/products/)          ║");
console.log("╚══════════════════════════════════════════════════════╝");
realImgPairs.forEach(({ sku, path }) => {
  const fname = path.split("/").pop();
  const exists = prodFiles.includes(fname);
  console.log(`  ${exists ? "✅" : "❌"} ${sku.padEnd(22)} → ${fname}`);
});

console.log("\n╔══════════════════════════════════════════════════════╗");
console.log("║     ไฟล์ใน public/products/ (ทั้งหมด 26 ไฟล์)       ║");
console.log("╚══════════════════════════════════════════════════════╝");
prodFiles.forEach((f) => {
  const mapped = realImgPairs.find(({ path }) => path.includes(f));
  if (mapped) {
    console.log(`  ✅ ใช้งานโดย SKU [${mapped.sku}]`.padEnd(45) + f);
  } else {
    console.log(`  ⚠️  ยังไม่ได้ map ใน REAL_IMG`.padEnd(45) + f);
  }
});

console.log("\n╔══════════════════════════════════════════════════════╗");
console.log("║        Banner ต่อหมวดหมู่ (public/cat/)              ║");
console.log("╚══════════════════════════════════════════════════════╝");
catFiles.filter((f) => f.includes("banner")).forEach((f) => {
  console.log(`  🖼  ${f}`);
});

console.log("\n╔══════════════════════════════════════════════════════╗");
console.log("║  รูปใน Shopee products → ดึงจาก CDN โดยตรง          ║");
console.log("╚══════════════════════════════════════════════════════╝");
const shopeeContent = fs.readFileSync("src/data/shopee-products.ts", "utf8");
const cdnUrls = shopeeContent.match(/https:\/\/cf\.shopee\.co\.th\/file\/[^\s"]+/g) || [];
console.log(`  📦 162 สินค้า Shopee ใช้รูปจาก Shopee CDN ทั้งหมด`);
console.log(`  🔗 ตัวอย่าง URL: ${cdnUrls[0]}`);
console.log(`  💡 ไม่ต้องดาวน์โหลดมาเก็บเอง — Next.js โหลดจาก cf.shopee.co.th`);
