import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { fetchMetaPageOverview } from "@/lib/meta-ads";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const pageId = req.nextUrl.searchParams.get("pageId") || undefined;
    const overview = await fetchMetaPageOverview(pageId);
    return NextResponse.json(overview);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Meta API error" }, { status: 502 });
  }
}
