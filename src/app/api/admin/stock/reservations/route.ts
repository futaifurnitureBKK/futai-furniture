import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSessionName } from "@/lib/admin-session";
import { logActivity } from "@/lib/activity-log";

const SESSION_COOKIE = "futai_admin_auth";

// Itemized reservation ledger (see scripts note). This route only ever
// writes this ledger table — it never touches stock_variants.reserved /
// stock_products.shared_reserved_modules. Callers adjust that scalar first
// (through the existing shared-adjust / variant-PATCH routes, which already
// handle the pool math and insufficient-stock checks) and only log the
// itemized row here once that succeeds.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const productId = req.nextUrl.searchParams.get("product_id");
  if (!productId) {
    return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("stock_reservations")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ reservations: data });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const productId = Number(body.product_id);
  const variantId = body.variant_id ? Number(body.variant_id) : null;
  const qty = Number(body.qty);
  if (!productId || !Number.isFinite(qty) || qty <= 0) {
    return NextResponse.json({ error: "product_id and a positive qty are required" }, { status: 400 });
  }
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  const actor = await getSessionName(req.cookies.get(SESSION_COOKIE)?.value);

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("stock_reservations")
    .insert({ product_id: productId, variant_id: variantId, qty, note, actor })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  await logActivity(req, {
    action: "create",
    entityType: "stock_reservation",
    entityId: data.id,
    summary: `จองสต็อก #${productId} x${qty}${note ? ` — ${note}` : ""}`,
  });
  return NextResponse.json({ reservation: data });
}
