import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

// Replaces a cell's photo list and/or status — image_urls lets the client
// remove one photo (sends back the array with that one filtered out);
// status toggles between "pending" (รอโพสต์) and "posted" (โพสต์แล้ว).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.image_urls !== undefined) {
    if (!Array.isArray(body.image_urls)) {
      return NextResponse.json({ error: "image_urls must be an array" }, { status: 400 });
    }
    update.image_urls = body.image_urls;
  }
  if (body.status !== undefined) {
    if (body.status !== "pending" && body.status !== "posted") {
      return NextResponse.json({ error: "status must be 'pending' or 'posted'" }, { status: 400 });
    }
    update.status = body.status;
  }
  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("content_tracking_posts")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ post: data });
}
