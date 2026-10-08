import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { logActivity } from "@/lib/activity-log";

const PLATFORMS = ["fb", "ig", "tk", "xiaohongshu", "douyin"];

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const date = req.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db.from("content_tracking_posts").select("*").eq("post_date", date);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ posts: data });
}

// Adds one photo to this employee/platform/day's cell — creates the row
// (starting with just this photo) if today's cell doesn't exist yet,
// otherwise appends to whatever photos are already there.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const employeeId = Number(body.employee_id);
  const platform = String(body.platform || "");
  const postDate = String(body.post_date || "");
  const imageUrl = String(body.image_url || "");
  if (!employeeId || !PLATFORMS.includes(platform) || !postDate || !imageUrl) {
    return NextResponse.json({ error: "employee_id, platform, post_date, image_url are required" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("content_tracking_posts")
    .select("id, image_urls")
    .eq("employee_id", employeeId)
    .eq("platform", platform)
    .eq("post_date", postDate)
    .maybeSingle();

  if (existing) {
    const { data, error } = await db
      .from("content_tracking_posts")
      .update({ image_urls: [...(existing.image_urls || []), imageUrl], updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logActivity(req, {
      action: "update",
      entityType: "content_tracking_post",
      entityId: data.id,
      summary: `เพิ่มรูปโพสต์ ${platform} วันที่ ${postDate} (employee #${employeeId})`,
    });
    return NextResponse.json({ post: data });
  }

  const { data, error } = await db
    .from("content_tracking_posts")
    .insert({ employee_id: employeeId, platform, post_date: postDate, image_urls: [imageUrl] })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await logActivity(req, {
    action: "create",
    entityType: "content_tracking_post",
    entityId: data.id,
    summary: `เพิ่มโพสต์ใหม่ ${platform} วันที่ ${postDate} (employee #${employeeId})`,
  });
  return NextResponse.json({ post: data });
}
