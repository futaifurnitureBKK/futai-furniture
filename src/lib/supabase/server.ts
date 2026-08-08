import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Node.js < 22 has no native WebSocket; @supabase/supabase-js requires one
// even though this app never uses realtime subscriptions.
if (typeof globalThis.WebSocket === "undefined") {
  const { default: WebSocket } = require("ws") as typeof import("ws");
  (globalThis as unknown as { WebSocket: unknown }).WebSocket = WebSocket;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

let client: SupabaseClient | undefined;
function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

// Public read client for server components / route handlers (anon key, RLS applies).
// Lazily instantiated so Next's build-time page-data collection doesn't
// require Supabase env vars to be set.
export const supabaseServer = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const real = getClient() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

// Admin client — bypasses RLS. Only ever use inside admin-authenticated route handlers.
export function supabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
