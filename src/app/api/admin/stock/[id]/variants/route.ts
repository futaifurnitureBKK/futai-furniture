import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { VARIANT_FIELDS, pick } from "@/lib/stock-fields";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const db = supabaseAdmin();

  const { data: last } = await db
    .from("stock_variants")
    .select("sort_order")
    .eq("product_id", id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const { data, error } = await db
    .from("stock_variants")
    .insert({ ...pick(body, VARIANT_FIELDS), product_id: Number(id), sort_order: (last?.[0]?.sort_order ?? -1) + 1 })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ variant: data });
}
