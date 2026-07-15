"use client";
import { createClient } from "@supabase/supabase-js";

// Browser-only client (anon key). Real browsers have native WebSocket, so no
// polyfill is needed here — keep this file free of the "ws" import so it
// never ends up in the client bundle.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
