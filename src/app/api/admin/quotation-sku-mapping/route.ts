import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";

// Staff resolving an unmatched quotation line by hand in the "pull from
// quotation" dialog saves the match here, so the same quote sku
// auto-suggests correctly on every future quote without asking again.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const quoteSku = String(body.quote_sku || "").trim();
  const stockVariantId = Number(body.stock_variant_id);
  if (!quoteSku || !stockVariantId) {
    return NextResponse.json({ error: "quote_sku and stock_variant_id are required" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { error } = await db
    .from("quotation_sku_mappings")
    .upsert({ quote_sku: quoteSku, stock_variant_id: stockVariantId }, { onConflict: "quote_sku" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
