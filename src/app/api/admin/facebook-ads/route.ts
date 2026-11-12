import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { fetchMetaDailyInsights, fetchMetaCampaignInsights } from "@/lib/meta-ads";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const account = req.nextUrl.searchParams.get("account") || undefined;
  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }
  try {
    const [rows, campaigns] = await Promise.all([
      fetchMetaDailyInsights(from, to, account),
      fetchMetaCampaignInsights(from, to, account),
    ]);
    return NextResponse.json({ rows, campaigns });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Meta API error" }, { status: 502 });
  }
}
