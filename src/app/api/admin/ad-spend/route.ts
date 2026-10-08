import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity-log";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const db = supabaseAdmin();
  let query = db.from("ad_spend").select("*").order("date", { ascending: true });
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ rows: data });
}

// Upserts a single day's ad spend amount for one salesperson — ads are run
// per person, not as one shared daily budget.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  if (!body.date || !body.owner || !body.platform) {
    return NextResponse.json({ error: "date, owner and platform are required" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("ad_spend")
    .upsert(
      { date: body.date, owner: body.owner, platform: body.platform, amount: body.amount ?? 0, updated_at: new Date().toISOString() },
      { onConflict: "date,owner,platform" }
    )
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await logActivity(req, {
    action: "update",
    entityType: "ad_spend",
    entityId: `${body.date}-${body.owner}-${body.platform}`,
    summary: `แก้ค่ายิง Ads ของ ${body.owner} (${body.platform}) วันที่ ${body.date} เป็น ฿${Number(body.amount ?? 0).toLocaleString("th-TH")}`,
  });
  return NextResponse.json({ row: data });
}
