// Curated TikTok videos shown in the "ดูให้ชัดก่อน ตัดสินใจ" gallery on every
// product page. Replace `url` with the real TikTok video link — `title` is
// only a fallback shown if TikTok's oEmbed lookup fails; when it succeeds the
// video's own caption is used instead. `thumbnail` is optional: TikTok's
// oEmbed no longer returns a cover image, so without one the card shows a
// plain placeholder instead of a real video frame — add a static file under
// public/videos/ and point to it here (e.g. "/videos/sme-01.jpg") for a
// real-looking preview.
export const TIKTOK_VIDEOS: { url: string; title: string; thumbnail?: string }[] = [
  { url: "https://vt.tiktok.com/ZSsMtH7Qx/", title: "ทั้งตึกนี้มีแต่ใจสู้ เฟอร์นิเจอร์" },
  { url: "https://vt.tiktok.com/ZSsMt3wcv/", title: "ผลงานติดตั้งโต๊ะทำงานกลุ่ม" },
  { url: "https://vt.tiktok.com/ZSsMtwFtw/", title: "SME ใช้พื้นที่คุ้มหรือยัง" },
  { url: "https://vt.tiktok.com/ZSsMtKk7v/", title: "SME เลือกให้จบ งบไม่บานปลาย" },
];
