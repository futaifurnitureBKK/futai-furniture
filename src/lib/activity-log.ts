import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSessionName } from "@/lib/admin-session";

const COOKIE = "futai_admin_auth";

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0].trim() || "unknown";
}

// Fire-and-forget audit trail for every add/edit/delete across the admin
// site. Never throws — a logging failure must not break the actual action
// it's recording, so any error here is swallowed (and reported to the
// server console for Vercel logs) rather than surfaced to the caller.
export async function logActivity(
  req: NextRequest,
  params: {
    action: "create" | "update" | "delete" | "adjust" | "login" | "other";
    entityType: string;
    entityId?: string | number | null;
    summary: string;
    detail?: unknown;
  }
): Promise<void> {
  try {
    const token = req.cookies.get(COOKIE)?.value;
    const actor = await getSessionName(token);
    const db = supabaseAdmin();
    await db.from("activity_log").insert({
      actor,
      ip: getClientIp(req),
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId != null ? String(params.entityId) : null,
      summary: params.summary,
      detail: params.detail ?? null,
    });
  } catch (err) {
    console.error("logActivity failed", err);
  }
}
