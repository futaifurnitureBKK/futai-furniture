import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();

  const actor = req.nextUrl.searchParams.get("actor");
  const entityType = req.nextUrl.searchParams.get("entityType");
  const action = req.nextUrl.searchParams.get("action");
  const q = req.nextUrl.searchParams.get("q");
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 200, 500);

  let query = db.from("activity_log").select("*").order("created_at", { ascending: false }).limit(limit);
  if (actor) query = query.eq("actor", actor);
  if (entityType) query = query.eq("entity_type", entityType);
  if (action) query = query.eq("action", action);
  if (q) query = query.ilike("summary", `%${q}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ entries: data });
}
