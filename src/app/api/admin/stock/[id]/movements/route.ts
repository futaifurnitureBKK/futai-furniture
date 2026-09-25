import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: variants, error: vErr } = await db.from("stock_variants").select("id").eq("product_id", id);
  if (vErr) {
    return NextResponse.json({ error: vErr.message }, { status: 400 });
  }
  const ids = (variants ?? []).map((v) => v.id);
  if (!ids.length) return NextResponse.json({ movements: [] });

  const { data, error } = await db
    .from("stock_movements")
    .select("*")
    .in("variant_id", ids)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ movements: data });
}
