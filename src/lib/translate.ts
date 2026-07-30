import "server-only";

const ENDPOINT = "https://api.mymemory.translated.net/get";
const MAX_CHUNK = 450; // MyMemory's free tier caps ~500 chars per request
const CONCURRENCY = 3; // avoid bursting past MyMemory's free-tier rate limit
const RETRY_DELAYS_MS = [500, 1500]; // retry transient failures (rate limits, timeouts)

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Runs async `fn` over `items` with at most `limit` in flight at once.
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function translateChunkOnce(text: string, target: "en" | "zh"): Promise<string> {
  const langpair = `th|${target === "zh" ? "zh-CN" : "en"}`;
  // MyMemory's anonymous quota is 5,000 words/day; identifying via email
  // raises it to 50,000/day (no signup, still free) — required since a
  // shared platform IP like Vercel's can be near the anonymous cap already.
  const url = `${ENDPOINT}?q=${encodeURIComponent(text)}&langpair=${langpair}&de=futai.furniture@gmail.com`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`MyMemory API failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (typeof translated !== "string" || data?.responseStatus !== 200) {
    throw new Error(`MyMemory translation error: ${JSON.stringify(data?.responseDetails ?? data)}`);
  }
  return translated;
}

async function translateChunk(text: string, target: "en" | "zh"): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text; // preserve whitespace-only segments as-is

  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const translated = await translateChunkOnce(trimmed, target);
      // Preserve leading/trailing whitespace trimmed off, so reassembled
      // HTML doesn't lose spacing between inline elements.
      const lead = text.match(/^\s*/)?.[0] ?? "";
      const trail = text.match(/\s*$/)?.[0] ?? "";
      return lead + translated + trail;
    } catch (err) {
      lastErr = err;
      if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastErr;
}

function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > MAX_CHUNK) {
    let cut = rest.lastIndexOf(" ", MAX_CHUNK);
    if (cut <= 0) cut = MAX_CHUNK;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) chunks.push(rest);
  return chunks;
}

// Plain text (names, tags) — single string, chunked if unusually long.
export async function translateText(text: string, target: "en" | "zh"): Promise<string> {
  if (!text.trim()) return "";
  const chunks = chunkText(text);
  const translated = await mapWithConcurrency(chunks, CONCURRENCY, (c) => translateChunk(c, target));
  return translated.join("");
}

// Rich text (descriptions with formatting/images) — splits HTML into tags vs
// text nodes, translates only the text, and reassembles with tags/images
// (e.g. <img src="...">) untouched. Built for Tiptap's clean HTML output.
// Chunks are translated with limited concurrency + retries so long,
// image-heavy descriptions don't get rate-limited into failure.
export async function translateHtml(html: string, target: "en" | "zh"): Promise<string> {
  if (!html.trim()) return "";
  const parts = html.split(/(<[^>]+>)/g).filter((p) => p.length > 0);

  const translatedParts = await mapWithConcurrency(parts, CONCURRENCY, async (part) => {
    if (part.startsWith("<") || !part.trim()) return part;
    const chunks = chunkText(part);
    const translated = await mapWithConcurrency(chunks, CONCURRENCY, (c) => translateChunk(c, target));
    return translated.join("");
  });

  return translatedParts.join("");
}

export async function translateToEnZh(text: string, isHtml: boolean): Promise<{ en: string; zh: string }> {
  const fn = isHtml ? translateHtml : translateText;
  // Sequential (not parallel) en/zh passes — halves the peak request burst.
  const en = await fn(text, "en");
  const zh = await fn(text, "zh");
  return { en, zh };
}
