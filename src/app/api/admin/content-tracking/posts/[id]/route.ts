import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

// Replaces a cell's whole photo list — used to remove one photo (the
// client sends back the array with that one filtered out).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  if (!Array.isArray(body.image_urls)) {
    return NextResponse.json({ error: "image_urls must be an array" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("content_tracking_posts")
    .update({ image_urls: body.image_urls, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ post: data });
}
