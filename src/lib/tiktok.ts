import "server-only";
import { unstable_cache } from "next/cache";

export interface TikTokVideoData {
  url: string;
  videoId: string;
  title: string;
  thumbnail: string;
}

function extractVideoId(url: string): string | null {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

// TikTok's oEmbed endpoint needs no auth and returns the video's thumbnail +
// caption — fetched server-side (not from the browser) and cached for an
// hour since this is marketing content that rarely changes. A video that
// fails to resolve (removed, private, bad link) is dropped rather than
// shown broken.
const fetchOEmbed = unstable_cache(
  async (url: string): Promise<TikTokVideoData | null> => {
    const videoId = extractVideoId(url);
    if (!videoId) return null;
    try {
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return {
        url,
        videoId,
        title: data.title || "",
        thumbnail: data.thumbnail_url || "",
      };
    } catch {
      return null;
    }
  },
  ["tiktok-oembed"],
  { revalidate: 3600, tags: ["tiktok-videos"] }
);

export async function getTikTokVideos(
  videos: { url: string; title: string }[]
): Promise<TikTokVideoData[]> {
  const results = await Promise.all(
    videos.map(async ({ url, title: fallbackTitle }) => {
      const data = await fetchOEmbed(url);
      if (!data) return null;
      return { ...data, title: data.title || fallbackTitle };
    })
  );
  return results.filter((v): v is TikTokVideoData => v !== null);
}
