// One-off: stamp the FUTAI logo badge onto every photo in public/testimonials
// and write the branded copies into public/testimonials-branded (originals untouched).
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "public", "testimonials");
const OUT_DIR = path.join(ROOT, "public", "testimonials-branded");
const BADGE_SVG = path.join(ROOT, "scripts", "badge.svg");
const LOGO_PNG = path.join(ROOT, "public", "logo-banner.png");

async function buildBadge() {
  const badgeCanvas = await sharp(BADGE_SVG).png().toBuffer();
  const logoHeight = 180;
  const logoWidth = Math.round(logoHeight * (367 / 103));
  const logo = await sharp(LOGO_PNG).resize({ height: logoHeight, width: logoWidth }).toBuffer();

  // Rect is at x=40,y=40, w=920,h=340 inside the 1080x420 canvas — center the logo in it.
  const rectX = 40, rectY = 40, rectW = 920, rectH = 340;
  const left = Math.round(rectX + (rectW - logoWidth) / 2);
  const top = Math.round(rectY + (rectH - logoHeight) / 2);

  return sharp(badgeCanvas)
    .composite([{ input: logo, left, top }])
    .png()
    .toBuffer();
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const badge = await buildBadge();
  const badgeMeta = await sharp(badge).metadata();

  const files = fs.readdirSync(SRC_DIR).filter((f) => /\.(jpe?g|png)$/i.test(f));
  for (const file of files) {
    const srcPath = path.join(SRC_DIR, file);
    const img = sharp(srcPath);
    const meta = await img.metadata();

    // Badge width ~32% of photo width, clamped so it stays legible on both
    // tall portrait crops and wide landscape ones.
    const targetW = Math.max(180, Math.min(420, Math.round(meta.width * 0.32)));
    const targetH = Math.round(targetW * (badgeMeta.height / badgeMeta.width));
    const resizedBadge = await sharp(badge).resize({ width: targetW, height: targetH }).toBuffer();

    const margin = Math.round(meta.width * 0.02);

    await img
      .composite([{ input: resizedBadge, left: margin, top: margin }])
      .toFile(path.join(OUT_DIR, file));
    console.log("branded:", file);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
