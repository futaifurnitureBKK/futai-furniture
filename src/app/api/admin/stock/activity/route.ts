import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

// Stock edit history for the "Export Excel" button's history sheet —
// pulled from activity_log (which reliably has the actor's name), not
// stock_movements (which only logs the raw before/after numbers).
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("activity_log")
    .select("created_at, actor, action, summary")
    .eq("entity_type", "stock_variant")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ rows: data });
}
