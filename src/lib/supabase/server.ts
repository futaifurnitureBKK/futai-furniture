import "server-only";
import { createClient } from "@supabase/supabase-js";

// Node.js < 22 has no native WebSocket; @supabase/supabase-js requires one
// even though this app never uses realtime subscriptions.
if (typeof globalThis.WebSocket === "undefined") {
  const { default: WebSocket } = require("ws") as typeof import("ws");
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = WebSocket;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Public read client for server components / route handlers (anon key, RLS applies).
export const supabaseServer = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});

// Admin client — bypasses RLS. Only ever use inside admin-authenticated route handlers.
export function supabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
