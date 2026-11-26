import "server-only";
import { unstable_cache } from "next/cache";

export interface TikTokVideoData {
  url: string;
  embedSrc: string;
  title: string;
  thumbnail?: string;
}

// TikTok's oEmbed endpoint (no auth needed) accepts both canonical and
// short (vt.tiktok.com) links and resolves the real embed player URL for
// us — fetched server-side and cached for an hour since this is marketing
// content that rarely changes. Note: TikTok's oEmbed response no longer
// includes thumbnail_url/title for most accounts, so the gallery falls
// back to the title given in tiktok-videos.ts and a plain placeholder
// card instead of a real video-frame thumbnail. A video that fails to
// resolve (removed, private, bad link) is dropped rather than shown broken.
const fetchOEmbed = unstable_cache(
  async (url: string): Promise<{ embedSrc: string; title: string } | null> => {
    try {
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
      if (!res.ok) return null;
      const data = await res.json();
      const srcMatch = typeof data.html === "string" ? data.html.match(/src="([^"]+)"/) : null;
      const embedSrc = srcMatch
        ? srcMatch[1].replace(/&amp;/g, "&")
        : data.embed_product_id
          ? `https://www.tiktok.com/player/v1/${data.embed_product_id}?autoplay=1&muted=1`
          : null;
      if (!embedSrc) return null;
      return { embedSrc, title: data.title || "" };
    } catch {
      return null;
    }
  },
  ["tiktok-oembed"],
  { revalidate: 3600, tags: ["tiktok-videos"] }
);

export async function getTikTokVideos(
  videos: { url: string; title: string; thumbnail?: string }[]
): Promise<TikTokVideoData[]> {
  const results = await Promise.all(
    videos.map(async ({ url, title: fallbackTitle, thumbnail }): Promise<TikTokVideoData | null> => {
      const data = await fetchOEmbed(url);
      if (!data) return null;
      return { url, embedSrc: data.embedSrc, title: data.title || fallbackTitle, thumbnail };
    })
  );
  return results.filter((v): v is TikTokVideoData => v !== null);
}
