const GRAPH_VERSION = "v21.0";

// Ad accounts the dashboard can show. Add a row here (and grant the System
// User access to that ad account in Meta Business Settings) whenever a new
// account should be selectable — no other code changes needed.
export const META_AD_ACCOUNTS = [
  {
    id: "act_289289761660739",
    labelTh: "Futai Furniture Official (บัญชีหลัก)",
    labelEn: "Futai Furniture Official (main acc)",
  },
] as const;

export interface MetaDailyInsight {
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  cpm: number;
  linkClicks: number;
  ctr: number;
  cpc: number;
}

// Pulls one row per calendar day from the Meta Marketing API for the given
// range. Requires META_ACCESS_TOKEN (a System User token with ads_read) and
// META_AD_ACCOUNT_ID (format act_XXXXXXXXXXX) as server-only env vars.
export async function fetchMetaDailyInsights(from: string, to: string, accountId?: string): Promise<MetaDailyInsight[]> {
  const token = process.env.META_ACCESS_TOKEN;
  const account = accountId || process.env.META_AD_ACCOUNT_ID;
  if (!token || !account) {
    throw new Error("Meta Ads API ยังไม่ได้ตั้งค่า (ขาด META_ACCESS_TOKEN หรือ META_AD_ACCOUNT_ID)");
  }

  const fields = "spend,impressions,reach,frequency,cpm,inline_link_clicks,ctr,cpc";
  const timeRange = encodeURIComponent(JSON.stringify({ since: from, until: to }));
  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${account}/insights` +
    `?fields=${fields}&time_range=${timeRange}&time_increment=1&limit=500&access_token=${token}`;

  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.message || "Meta API error");
  }

  const rows = (json.data ?? []) as Array<Record<string, string>>;
  return rows
    .map((r) => ({
      date: r.date_start,
      spend: Number(r.spend ?? 0),
      impressions: Number(r.impressions ?? 0),
      reach: Number(r.reach ?? 0),
      frequency: Number(r.frequency ?? 0),
      cpm: Number(r.cpm ?? 0),
      linkClicks: Number(r.inline_link_clicks ?? 0),
      ctr: Number(r.ctr ?? 0),
      cpc: Number(r.cpc ?? 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
