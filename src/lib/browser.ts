"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Public client for ping and uploads.
let client: SupabaseClient | null = null;

export function browserDb() {
  client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  return client;
}

// Listen for shared-data changes.
export function subscribeChanges(onChange: () => void) {
  const channel = browserDb()
    .channel("ink")
    .on("broadcast", { event: "changed" }, onChange)
    .subscribe();
  return () => {
    browserDb().removeChannel(channel);
  };
}
