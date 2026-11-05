import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSessionName } from "@/lib/admin-session";
import { logActivity } from "@/lib/activity-log";

const SESSION_COOKIE = "futai_admin_auth";
const STATUS_ORDER = ["draft", "approved", "paid"] as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("commission_batches")
    .select("*, commission_items(*), commission_splits(*)")
    .eq("id", id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }
  return NextResponse.json({ batch: data });
}

// Status only ever moves forward (draft -> approved -> paid) or sideways to
// cancelled — never backward — so a paid batch can't accidentally be
// reopened and double-paid. Splits (how the owner's commission divides
// between the people behind that name, e.g. "Kan & J") can be set any time.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const db = supabaseAdmin();

  const { data: before, error: readErr } = await db.from("commission_batches").select("*").eq("id", id).single();
  if (readErr || !before) {
    return NextResponse.json({ error: readErr?.message ?? "Not found" }, { status: 404 });
  }

  const update: Record<string, unknown> = {};

  if (typeof body.status === "string" && body.status !== before.status) {
    if (body.status === "cancelled") {
      update.status = "cancelled";
    } else {
      const fromIdx = STATUS_ORDER.indexOf(before.status as (typeof STATUS_ORDER)[number]);
      const toIdx = STATUS_ORDER.indexOf(body.status as (typeof STATUS_ORDER)[number]);
      if (toIdx === -1 || toIdx !== fromIdx + 1) {
        return NextResponse.json({ error: `เปลี่ยนสถานะจาก ${before.status} ไป ${body.status} ไม่ได้` }, { status: 400 });
      }
      update.status = body.status;
      if (body.status === "approved") {
        update.approved_at = new Date().toISOString();
        update.approved_by = await getSessionName(req.cookies.get(SESSION_COOKIE)?.value);
      }
      if (body.status === "paid") {
        update.paid_at = new Date().toISOString();
      }
    }
  }

  if (Array.isArray(body.splits)) {
    const splits = body.splits as { person: string; percent: number }[];
    const sum = splits.reduce((s, x) => s + Number(x.percent || 0), 0);
    if (splits.length && Math.abs(sum - 100) > 0.01) {
      return NextResponse.json({ error: `สัดส่วนรวมต้องเท่ากับ 100% (ตอนนี้รวม ${sum}%)` }, { status: 400 });
    }
    await db.from("commission_splits").delete().eq("batch_id", id);
    if (splits.length) {
      await db.from("commission_splits").insert(splits.map((s) => ({ batch_id: Number(id), person: s.person, percent: s.percent })));
    }
  }

  if (Object.keys(update).length) {
    const { error } = await db.from("commission_batches").update(update).eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const { data: after } = await db
    .from("commission_batches")
    .select("*, commission_items(*), commission_splits(*)")
    .eq("id", id)
    .single();

  if (typeof update.status === "string") {
    await logActivity(req, {
      action: "update",
      entityType: "commission_batch",
      entityId: Number(id),
      summary: `รอบคิดค่าคอม ${before.owner} #${id}: ${before.status} → ${update.status}`,
    });
  }

  return NextResponse.json({ batch: after });
}
