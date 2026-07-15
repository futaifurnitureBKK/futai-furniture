import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  const body = await req.json();
  const db = supabaseAdmin();

  const update: Record<string, unknown> = {};
  for (const key of ["name_th", "name_en", "name_zh", "banner_url", "description_th", "description_en", "description_zh"]) {
    if (key in body) update[key] = body[key];
  }

  const { data, error } = await db.from("categories").update(update).eq("slug", slug).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ category: data });
}
