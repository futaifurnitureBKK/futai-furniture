import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { TRACKED_MOVEMENT_FIELDS, VARIANT_FIELDS, pick } from "@/lib/stock-fields";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ vid: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { vid } = await params;
  const body = await req.json();
  const update: Record<string, unknown> = { ...pick(body, VARIANT_FIELDS), updated_at: new Date().toISOString() };

  const db = supabaseAdmin();
  const { data: before, error: readErr } = await db.from("stock_variants").select("*").eq("id", vid).single();
  if (readErr || !before) {
    return NextResponse.json({ error: readErr?.message ?? "Not found" }, { status: 404 });
  }

  // touching any stock number means it's now being tracked
  if (TRACKED_MOVEMENT_FIELDS.some((f) => f in body)) update.tracked = true;

  const { data, error } = await db.from("stock_variants").update(update).eq("id", vid).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const moves = TRACKED_MOVEMENT_FIELDS.filter(
    (f) => f in body && Number(body[f]) !== Number(before[f])
  ).map((f) => ({ variant_id: Number(vid), field: f, old_value: Number(before[f]), new_value: Number(body[f]) }));
  if (moves.length) await db.from("stock_movements").insert(moves);

  return NextResponse.json({ variant: data });
}
