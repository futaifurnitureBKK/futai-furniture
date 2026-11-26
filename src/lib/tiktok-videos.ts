// Curated TikTok videos shown in the "ดูให้ชัดก่อน ตัดสินใจ" gallery on every
// product page. Replace `url` with the real TikTok video link. `title` is
// the caption shown on the card — TikTok's oEmbed doesn't return the real
// caption, so this must be filled in by hand with each clip's actual
// caption (left blank for now, pending the real text). `thumbnail` is
// optional: TikTok's oEmbed also doesn't return a cover image, so without
// one the card shows a plain placeholder instead of a real video frame —
// add a static file under public/videos/ and point to it here (e.g.
// "/videos/sme-01.jpg") for a real-looking preview.
export const TIKTOK_VIDEOS: { url: string; title: string; thumbnail?: string }[] = [
  { url: "https://vt.tiktok.com/ZSsMtH7Qx/", title: "" },
  { url: "https://vt.tiktok.com/ZSsMt3wcv/", title: "" },
  { url: "https://vt.tiktok.com/ZSsMtwFtw/", title: "" },
  { url: "https://vt.tiktok.com/ZSsMtKk7v/", title: "" },
];
