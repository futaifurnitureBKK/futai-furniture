import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

interface SiteVisitStats {
  total_views: number;
  total_visitors: number;
  today_views: number;
  today_visitors: number;
}

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db
    .rpc("site_visit_stats")
    .single<SiteVisitStats>();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({
    totalViews: data.total_views,
    totalVisitors: data.total_visitors,
    todayViews: data.today_views,
    todayVisitors: data.today_visitors,
  });
}
