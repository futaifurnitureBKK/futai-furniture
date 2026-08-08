"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser-only client (anon key). Real browsers have native WebSocket, so no
// polyfill is needed here — keep this file free of the "ws" import so it
// never ends up in the client bundle.
let client: SupabaseClient | undefined;
function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

// Lazily instantiated so this client component can still be prerendered on
// the server (e.g. during build) without Supabase env vars being set.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const real = getClient() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});
